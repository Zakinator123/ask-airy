import {ChatCompletionRequestMessage, Configuration, OpenAIApi} from "openai";
import {
    AIService,
    AIServiceError,
    AITableQueryResponse,
    EmbeddingsResponse,
    RecordIndexData,
    RecordToIndex,
    RequestWithTokensToBeRateLimited,
    AiryTableSchema
} from "../types/CoreTypes";
import {OpenAIEmbeddingModel} from "../types/ConfigurationTypes";
import {RequestAndTokenRateLimiter} from "../utils/RequestAndTokenRateLimiter";
import {cleanTemplateLiteral} from "../utils/RandomUtils";
import {OpenAI} from "openai-streams";


const getTextualDescriptionOfTableSchema = ({
                                                airyFields,
                                                table
                                            }: Omit<AiryTableSchema, 'airyDataIndexField'>): string => cleanTemplateLiteral(`
                                            I have a query regarding data that is in a spreadsheet table. 
                                            The table's name is ${table.name}${table.description && ` The description of the table is ${table.description}.`}.
                                            The table has the following columns: ${airyFields.map(field => field.name).join(', ')}.`)

const calculateTokensInChatCompletionMessages = (messages: ChatCompletionRequestMessage[]): number =>
    messages.reduce((totalTokens, message) => totalTokens + Math.floor(message.content.length / 4), 0)

type AIModelConfiguration = {
    model: string,
    maxContextWindowTokens: number,
}

export class OpenAIService implements AIService {
    private openai
    private readonly embeddingModel: OpenAIEmbeddingModel;
    private readonly fastChatModelConfiguration: AIModelConfiguration;
    private readonly powerfulChatModelConfiguration: AIModelConfiguration;
    private readonly _maxRequests: number;
    private readonly _maxTokens: number;
    private readonly requestAndTokenRateLimiter: RequestAndTokenRateLimiter;
    private readonly apiKey;

    constructor(apiKey: string,
                embeddingModel: OpenAIEmbeddingModel,
                _maxRequests: number,
                _maxTokens: number,) {
        this.apiKey = apiKey;
        this.openai = new OpenAIApi(new Configuration({apiKey}));
        this.embeddingModel = embeddingModel;
        this.fastChatModelConfiguration = {
            model: "gpt-3.5-turbo",
            maxContextWindowTokens: 2049
        };
        this.powerfulChatModelConfiguration = {
            model: "gpt-3.5-turbo",
            maxContextWindowTokens: 3900
        }
        this._maxRequests = _maxRequests;
        this._maxTokens = _maxTokens;
        this.requestAndTokenRateLimiter = new RequestAndTokenRateLimiter(_maxRequests, 60000, _maxTokens);
    }

    getHypotheticalSearchResultGivenUserQuery = async ({
                                                           airyFields,
                                                           table
                                                       }: AiryTableSchema, query: string): Promise<string> => {
        const messages: ChatCompletionRequestMessage[] = [
            {
                role: "system",
                content: "You are a search engine that generates hypothetical relevant search results based on a user's query."
            },
            {
                role: "user",
                content: cleanTemplateLiteral(`${getTextualDescriptionOfTableSchema({airyFields: airyFields, table})}
                 Please generate a few hypothetical rows of data that are relevant to the following query: 
                 ${query}. 
                 The hypothetical row you return should be formatted as a comma separated list of values, one for each column in the table.
                 Each value in the row should be a string prefixed with the column name, followed by a colon, followed by the value.`)
            }
        ];

        try {
            const response = await this.openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 3500 - calculateTokensInChatCompletionMessages(messages),
                temperature: 0.3,
                top_p: 1,
                n: 1,
            });

            return response.data.choices[0]!.message!.content!;
        } catch (error: any) {
            if (error && error.response) console.error(error.response.data);
            return 'error';
        }
    }

    answerQueryGivenRelevantAirtableContext = async (query: string,
                                                     airyTableSchema: AiryTableSchema,
                                                     relevantContextData: string[]):
        Promise<AITableQueryResponse> => {

        const aiModelConfiguration = this.powerfulChatModelConfiguration;
        const maxContextWindowTokens = aiModelConfiguration.maxContextWindowTokens;

        const systemMessage = cleanTemplateLiteral(`You are a helpful AI assistant that responds to user queries.
                You have access to a spreadsheet table that contains data that is potentially relevant to the user's query.
                If the query is a question, you should respond concisely with an answer to the question that is based on the relevant context data.
                If the relevant context data does not seem sufficient to answer the question, you should think step by step to see if you can infer an answer from the context data.
                If you still cannot answer the query based on the context data, you may use your general knowledge to answer the question.`);

        const schemaContextMessage = cleanTemplateLiteral(`${getTextualDescriptionOfTableSchema(airyTableSchema)}
                Here is some potentially relevant data from the table sorted from most relevant to least relevant formatted as JSON:`);

        const numTokensInPromptsWithoutContextRecords = Math.floor(systemMessage.length / 4 + schemaContextMessage.length / 4 + query.length / 4) + 10;

        // Parameterize this?
        const tokensAllocatedForAIResponse = 1000;

        const numTokensAllowedForContext = maxContextWindowTokens - numTokensInPromptsWithoutContextRecords - tokensAllocatedForAIResponse;

        console.log(`numTokensAllowedForContext: ${numTokensAllowedForContext}`)

        const relevantSerializedRecordsThatCanFitInContextWindow = [];
        let totalNumTokens = 0;
        for (const record of relevantContextData) {
            const numTokens = record.length / 4;
            if (totalNumTokens + numTokens <= numTokensAllowedForContext) {
                relevantSerializedRecordsThatCanFitInContextWindow.push(record);
                totalNumTokens += numTokens;
            }
        }

        const messages: ChatCompletionRequestMessage[] = [
            {
                role: "system",
                content: systemMessage
            },
            {
                role: "user",
                content: `${schemaContextMessage} ${relevantSerializedRecordsThatCanFitInContextWindow.join('\n')}}`
            },
            {
                role: "user",
                content: `My query is: ${query}.`
            }
        ];


        try {
            const streamedResponse: ReadableStream<Uint8Array> = await OpenAI(
                "chat",
                {
                    messages: messages,
                    model: aiModelConfiguration.model,
                    max_tokens: tokensAllocatedForAIResponse,
                    temperature: 0.3,
                    top_p: 1,
                    n: 1
                },
                {
                    apiKey: this.apiKey,
                }
            )

            return {
                errorOccurred: false,
                aiResponse: streamedResponse,
                numRelevantRecordsUsedByAI: relevantSerializedRecordsThatCanFitInContextWindow.length
            };
        } catch (error: any) {
            if (error.response) {
                console.error(error.response.data);
                return {errorOccurred: true, message: `Error Message: ${error.response.data}`};
            } else {
                return {errorOccurred: true, message: `Error: ${error}`};
            }
        }
    }

    // TODO: Truncate records to fit in max context window for embeddings
    getEmbeddingsForRecords = async (recordsToEmbed: Array<RecordToIndex>): Promise<Array<RecordIndexData>> => {

        type RecordToIndexWithTokensCounted = RecordToIndex & { numTokensInRequest: number };

        const recordsToEmbedWithTokensCounted: RecordToIndexWithTokensCounted[] = recordsToEmbed.map((recordToEmbed) => {
            const numTokens = recordToEmbed.serializedDataToEmbed.length / 4;
            console.log(`Tokens in request ${numTokens}`);
            return {
                ...recordToEmbed,
                numTokensInRequest: numTokens
            }
        });

        const optimalNumTokensPerRequest = Math.floor(this._maxTokens / this._maxRequests);

        type EmbeddingsRequest = {
            recordsToEmbed: Array<RecordToIndexWithTokensCounted>,
            numTokensInRecordsToEmbed: number
        }

        const embeddingsRequests: Array<EmbeddingsRequest> = [];

        for (const recordToEmbedWithTokensCounted of recordsToEmbedWithTokensCounted) {
            const lastEmbeddingsRequest = embeddingsRequests[embeddingsRequests.length - 1];
            if (lastEmbeddingsRequest && lastEmbeddingsRequest.numTokensInRecordsToEmbed + recordToEmbedWithTokensCounted.numTokensInRequest <= optimalNumTokensPerRequest) {
                lastEmbeddingsRequest.recordsToEmbed.push(recordToEmbedWithTokensCounted);
                lastEmbeddingsRequest.numTokensInRecordsToEmbed += recordToEmbedWithTokensCounted.numTokensInRequest;
            } else {
                embeddingsRequests.push({
                    recordsToEmbed: [recordToEmbedWithTokensCounted],
                    numTokensInRecordsToEmbed: recordToEmbedWithTokensCounted.numTokensInRequest
                });
            }
        }

        const embeddingsRequestsToBeRateLimited: Array<RequestWithTokensToBeRateLimited<EmbeddingsResponse>> =
            embeddingsRequests.map((embeddingsRequest) => ({
                request: async (): Promise<RecordIndexData[] | AIServiceError> => {
                    try {
                        const embeddingResponse = await this.openai.createEmbedding(
                            {
                                model: this.embeddingModel,
                                input: embeddingsRequest.recordsToEmbed.map((recordToEmbed) => {
                                    console.log(recordToEmbed.serializedDataToEmbed);
                                    return recordToEmbed.serializedDataToEmbed;
                                }),
                            });

                        return embeddingResponse.data.data.map(({embedding, index}) => ({
                            recordId: embeddingsRequest.recordsToEmbed[index]!.recordId,
                            hash: embeddingsRequest.recordsToEmbed[index]!.newHash,
                            embedding: embedding
                        }));
                    } catch (error: any) {
                        return {
                            errorStatus: error?.response?.status,
                            errorResponse: error?.response?.data,
                            errorMessage: error?.message
                        }
                    }
                },
                numTokensInRequest: embeddingsRequest.numTokensInRecordsToEmbed
            }));

        console.log(`Number of embeddings requests: ${embeddingsRequestsToBeRateLimited.length}`);

        const embeddingsRequestsToBeRateLimitedResponses: Array<EmbeddingsResponse> = await Promise.all(
            embeddingsRequestsToBeRateLimited.map(
                embeddingRequestToBeRateLimited => this.requestAndTokenRateLimiter.returnRateAndTokenLimitedPromise(embeddingRequestToBeRateLimited)));

        const nonErrorResponses = embeddingsRequestsToBeRateLimitedResponses.filter((embeddingRequestToBeRateLimitedResponse) => {
            if (!(embeddingRequestToBeRateLimitedResponse instanceof Array)) {
                const errorMessage = `Error in embedding request:
                 Status: ${embeddingRequestToBeRateLimitedResponse.errorStatus}
                 Response: ${embeddingRequestToBeRateLimitedResponse.errorResponse}
                 Message: ${embeddingRequestToBeRateLimitedResponse.errorMessage}`;

                console.error(errorMessage);
                return false;
            } else return true;
        }) as Array<RecordIndexData[]>;

        return nonErrorResponses.flat();
    }

    getEmbeddingForString = (query: string) => {
        return this.openai.createEmbedding(
            {
                model: this.embeddingModel,
                input: query,
            })
            .then((response) =>
                response.data.data[0]!.embedding)
    }
}