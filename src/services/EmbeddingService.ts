import {Configuration, OpenAIApi} from "openai";
import {
    AIServiceError,
    EmbeddingService,
    EmbeddingsResponse,
    RecordIndexData,
    RecordToIndex,
    RequestWithTokensToBeRateLimited
} from "../types/CoreTypes";
import {OpenAIEmbeddingModel} from "../types/ConfigurationTypes";
import {RequestAndTokenRateLimiter} from "../utils/RequestAndTokenRateLimiter";

export class OpenAIEmbeddingService implements EmbeddingService {
    private openai
    private readonly embeddingModel: OpenAIEmbeddingModel;
    private readonly _maxRequests: number;
    private readonly _maxTokens: number;
    private readonly requestAndTokenRateLimiter: RequestAndTokenRateLimiter<RecordIndexData>;

    constructor(apiKey: string,
                embeddingModel: OpenAIEmbeddingModel,
                _maxRequests: number,
                _maxTokens: number) {
        this.openai = new OpenAIApi(new Configuration({apiKey}));
        this.embeddingModel = embeddingModel;
        this._maxRequests = _maxRequests;
        this._maxTokens = _maxTokens;
        this.requestAndTokenRateLimiter = new RequestAndTokenRateLimiter<RecordIndexData>(_maxRequests, 60000, _maxTokens);
    }

    getEmbeddingsForRecords = async (recordsToEmbed: Array<RecordToIndex>): Promise<Array<RecordIndexData>> => {

        type RecordToIndexWithTokensCounted = RecordToIndex & { numTokensInRequest: number };

        const recordsToEmbedWithTokensCounted: RecordToIndexWithTokensCounted[] = recordsToEmbed.map((recordToEmbed) => {
            const numTokens = recordToEmbed.serializedDataToEmbed.length/4;
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
            }));

        const embeddingsRequestsToBeRateLimitedResponses: Array<EmbeddingsResponse> = await Promise.all(
            embeddingsRequestsToBeRateLimited.map(
                embeddingRequestToBeRateLimited => this.requestAndTokenRateLimiter.returnRateAndTokenLimitedPromise(embeddingRequestToBeRateLimited)));

        const nonErrorResponses = embeddingsRequestsToBeRateLimitedResponses.filter((embeddingRequestToBeRateLimitedResponse, index) => {
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