import {ChatCompletionRequestMessage, Configuration, OpenAIApi} from "openai";
import {
    AiryResponse,
    AiryTableQueryResponse,
    AiryTableSchema,
    AIService,
    AIServiceError,
    EmbeddingsRequest,
    RecordIndexData,
    RecordToIndex,
    RecordToIndexWithTokensCounted
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
                                            The table has the following columns: ${table.primaryField.name}, 
                                            ${airyFields.filter(field => !field.isPrimaryField).map(field => field.name).join(', ')}.`)

const calculateTokensInChatCompletionMessages = (messages: ChatCompletionRequestMessage[]): number =>
    messages.reduce((totalTokens, message) => totalTokens + Math.floor(message.content.length / 4), 0)

type AIModelConfiguration = {
    model: string,
    maxContextWindowTokens: number,
}

export class OpenAIService implements AIService {
    private openai
    private readonly embeddingModel: OpenAIEmbeddingModel;
    private readonly chatModelConfiguration: AIModelConfiguration;
    private readonly _maxRequests: number;
    private readonly _maxTokens: number;
    private readonly requestAndTokenRateLimiter: RequestAndTokenRateLimiter;
    private readonly apiKey;

    constructor(apiKey: string,
                embeddingModel: OpenAIEmbeddingModel,
                _maxRequests: number,
                _maxTokens: number,) {
        this.apiKey = apiKey;

        const openAIConfiguration = new Configuration({apiKey});
        delete openAIConfiguration.baseOptions.headers['User-Agent'];

        this.openai = new OpenAIApi(openAIConfiguration);
        this.embeddingModel = embeddingModel;
        this.chatModelConfiguration = {
            model: "gpt-3.5-turbo",
            maxContextWindowTokens: 3700
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
                 Generate hypothetical rows of data that are very relevant to the following user query delimited by triple quotes: 
                 """${query}"""
                 The hypothetical rows should be formatted as a list of comma separated values, one for each column in the table.
                 Do not include the header row in your response.
                 Your response should strictly only include the hypothetical rows of data and nothing else.`)
            }
        ];

        console.log("HyDE Prompt:");
        console.log(messages);

        try {
            const performance2 = window.performance;
            const startTime2 = performance2.now();

            const response2 = await this.openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 400 - calculateTokensInChatCompletionMessages(messages),
                temperature: 0.3,
                top_p: 1,
                n: 1,
            })
            const endTime2 = performance2.now();
            console.log(`Latency of gpt-3.5-turbo Hypothetical result generation is is: ${endTime2 - startTime2} ms`);
            console.log(`GPT 3.5 Turbo HyDE Response:`);
            const gpt35Response = response2.data.choices[0]!.message!.content!;
            return gpt35Response;
        } catch (error: any) {
            console.error("Error in getHypotheticalSearchResultGivenUserQuery");
            if (error.response) {
                console.error(error.response.status);
                console.error(error.response.data);
            } else console.error(error);
            return query;
        }
    }

    answerQueryGivenRelevantAirtableContext = async (query: string,
                                                     airyTableSchema: AiryTableSchema,
                                                     relevantContextData: string[]):
        Promise<AiryTableQueryResponse> => {

        const aiModelConfiguration = this.chatModelConfiguration;
        const maxContextWindowTokens = aiModelConfiguration.maxContextWindowTokens;

        const systemMessage = cleanTemplateLiteral(`You are a helpful AI assistant named Airy embedded within an Airtable extension.
                You have access to tabular data that is potentially relevant to the user's query.
                If the query is a question, you should respond concisely with an answer that is based on the relevant context data if applicable.
                If the relevant context data is not sufficient to answer the question, you should try to think step by step to infer an answer from the context data.
                If you still cannot answer the query, you may use your general knowledge to answer the question.`);

        const schemaContextMessage = cleanTemplateLiteral(`${getTextualDescriptionOfTableSchema(airyTableSchema)}`);
        const relevantContextDataMessageTokenLength = 250 / 4;
        const queryMessageTokenLength = 350 / 4;

        const numTokensInPromptsWithoutContextRecords = Math.floor(systemMessage.length / 4 + schemaContextMessage.length / 4 + query.length / 4 + relevantContextDataMessageTokenLength + queryMessageTokenLength) + 10;
        const tokensAllocatedForAIResponse = 500;
        const numTokensAllowedForContext = maxContextWindowTokens - numTokensInPromptsWithoutContextRecords - tokensAllocatedForAIResponse;

        const relevantSerializedRecordsThatCanFitInContextWindow = [];
        let totalNumTokens = 0;
        for (const record of relevantContextData) {
            const numTokens = record.length / 4;
            if (totalNumTokens + numTokens <= numTokensAllowedForContext) {
                relevantSerializedRecordsThatCanFitInContextWindow.push(record);
                totalNumTokens += numTokens;
            }
        }

        const numRelevantRecords = relevantSerializedRecordsThatCanFitInContextWindow.length;

        const relevantContextDataMessage = cleanTemplateLiteral(`Here are the top ${numRelevantRecords} potentially most relevant data records from the table.
         There may be more relevant records, but only ${numRelevantRecords} could fit in your model's context window.
         Each record is delimited by triple quotes: ${relevantSerializedRecordsThatCanFitInContextWindow.join(' ')}`);

        const messages: ChatCompletionRequestMessage[] = [
            {
                role: "system",
                content: systemMessage
            },
            {
                role: "user",
                content: `${schemaContextMessage} ${relevantContextDataMessage}`
            },
            {
                role: "user",
                content: cleanTemplateLiteral(`Here is my query delimited by triple double quotes: """${query}""".
                  If my query is a question, answer based on the provided context data and mention that your answer
                  is only based on the top ${numRelevantRecords} most relevant records. 
                  Structure your response with newlines for readability. Be modest about what you know.
                  If you are using general knowledge to answer the question, be sure to mention that you are using general knowledge.
                  `)
            }
        ];

        /*
          Old Prompt Snippets
            - If you use context data to answer the question, backup your statements by citing the relevant records in a readable way.
            - If my query is a search query and the context data seems relevant, respond with the following message delimited by single quotes: 'Below are some search results that may be relevant to your query:'
            - If none of the context data is relevant to the search query, respond with the following message delimited by triple single quotes: '''I'm sorry, I could not find any relevant search results for your query.'''
         */

        const response = await this.getStreamingChatCompletionResponse(messages, aiModelConfiguration, tokensAllocatedForAIResponse);

        return !response.errorOccurred ? {
            ...response,
            numRelevantRecordsUsedByAI: relevantSerializedRecordsThatCanFitInContextWindow.length
        } : response;
    }

    getEmbeddingsRequestsForRecords = (recordsToIndex: Array<RecordToIndex>): Array<EmbeddingsRequest> => {
        const recordsToEmbedWithTokensCounted: RecordToIndexWithTokensCounted[] = recordsToIndex.map((recordToEmbed) => {
            const numTokens = recordToEmbed.serializedDataToEmbed.length / 4;
            return {
                ...recordToEmbed,
                numTokensInRequest: numTokens
            }
        });

        const optimalNumTokensPerRequest = this._maxTokens / this._maxRequests;

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

        return embeddingsRequests;
    }

    getEmbeddings = async (embeddingsRequest: EmbeddingsRequest): Promise<Array<RecordIndexData> | undefined> => {
        const openAIEmbeddingsRequest = {
            request: async (): Promise<RecordIndexData[] | AIServiceError> => {
                try {
                    const embeddingResponse = await this.openai.createEmbedding(
                        {
                            model: this.embeddingModel,
                            input: embeddingsRequest.recordsToEmbed.map((recordToEmbed) => recordToEmbed.serializedDataToEmbed),
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
        }

        try {
            const result = await this.requestAndTokenRateLimiter.returnRateAndTokenLimitedPromise(openAIEmbeddingsRequest);

            if (result instanceof Array) {
                return result;
            }
            const errorMessage = `Error in embedding request:
             Status: ${result.errorStatus}
             Response: ${result.errorResponse}
             Message: ${result.errorMessage}`;
            console.error(errorMessage);
            return undefined;
        } catch (error) {
            console.error(error);
            return undefined;
        }
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

    answerQueryAboutAnything = (query: string): Promise<AiryResponse> => {
        const messages: ChatCompletionRequestMessage[] = [
            {
                role: "system",
                content: cleanTemplateLiteral(`You are a helpful AI assistant named Airy embedded within an Airtable extension.
                You concisely answer user queries using your general knowledge and are capable of answering complex questions.
                You should be able to write example Airtable scripts and formulas.
                If the user's query seems to be about data within their Airtable base,
                you must mention that you are answering from your general knowledge in addition to saying the following message delimited by triple quotes:
                """If you would like me to answer a question related to your Airtable data, please select a table in the dropdown menu above."""`)
            },
            {
                role: "user",
                content: cleanTemplateLiteral(`Here is my query delimited by triple quotes: """${query}""".
                   Be modest about what you know and answer concisely, but be as helpful as possible.
                   If you are using general knowledge to answer the question, be sure to mention that you are using general
                   knowledge and that I must select a table from the dropdown menu above if I would like to ask a question about my Airtable data.`)
            }
        ];

        return this.getStreamingChatCompletionResponse(messages, this.chatModelConfiguration, this.chatModelConfiguration.maxContextWindowTokens);
    }

    private getStreamingChatCompletionResponse = async (messages: ChatCompletionRequestMessage[], aiModelConfiguration: AIModelConfiguration, maxTokens: number): Promise<AiryResponse> => {
        try {
            const streamedResponse: ReadableStream<Uint8Array> = await OpenAI(
                "chat",
                {
                    messages: messages,
                    model: aiModelConfiguration.model,
                    max_tokens: maxTokens,
                    temperature: 0.4,
                    top_p: 1,
                    n: 1
                },
                {
                    apiKey: this.apiKey,
                }
            )

            return {
                errorOccurred: false,
                streamingResponse: streamedResponse,
            };
        } catch (error: any) {
            if (error.response) {
                console.error(error.response);
                return {errorOccurred: true, message: `${error.response.status} ${error.response.data}`};
            } else {
                console.error(error);
                return {errorOccurred: true, message: `${error}`};
            }
        }
    }
}