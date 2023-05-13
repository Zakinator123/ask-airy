import {Field, Record, Table} from "@airtable/blocks/models";
import {RecordId} from "@airtable/blocks/dist/types/src/types/record";

export type AiryTableQueryResponse = {
    errorOccurred: false,
    streamingResponse: ReadableStream<Uint8Array>,
    numRelevantRecordsUsedByAI: number
} | {
    errorOccurred: true,
    message: string
}

export type AiryResponse = {
    errorOccurred: false,
    streamingResponse: ReadableStream<Uint8Array>,
} | {
    errorOccurred: true,
    message: string
}

export interface AIService {
    answerQueryGivenRelevantAirtableContext: (query: string, airyTableSchema: AiryTableSchema, relevantContextData: string[]) => Promise<AiryTableQueryResponse>,
    answerQueryAboutAnything: (query: string) => Promise<AiryResponse>,
    getEmbeddings: (embeddingsRequest: EmbeddingsRequest) => Promise<Array<RecordIndexData> | undefined>,
    getEmbeddingForString: (string: string) => Promise<Embedding>,
    getHypotheticalSearchResultGivenUserQuery: (airyTableSchema: AiryTableSchema, query: string) => Promise<string>,
    getEmbeddingsRequestsForRecords: (recordsToIndex: Array<RecordToIndex>) => Array<EmbeddingsRequest>
}

export interface AskAiryServiceInterface {
    updateAiryDataIndexForTable: (askAiryTable: AskAiryTable, recordsToIndex: Array<RecordToIndex>, dataIndexUpdateProgressUpdater: (numSuccesses: number) => void) => Promise<AiryDataIndexUpdateResult>,
    getRecordsWithStaleAiryIndexData: (askAiryTable: AskAiryTable) => Promise<Array<RecordToIndex>>,
    executeSemanticSearchForTable: (askAiryTable: AskAiryTable, query: string, numResults: number) => Promise<Record[]>,
    askAiryAboutRelevantRecords: (askAiryTable: AskAiryTable, query: string, relevantRecords: Record[]) => Promise<AiryTableQueryResponse>,
    askAiryAboutAnything: (query: string) => Promise<AiryResponse>,
}

export type Embedding = number[];

export type RecordIndexData = {
    recordId: RecordId,
    hash: string,
    embedding: Embedding
}

export type AskAiryTable = {
    table: Table,
    recordsToAskAiryAbout: Record[],
    airyFields: Field[],
    airyDataIndexField: Field,
}

export type AiryIndexData = {
    embedding: Embedding
    hash: string,
}

export type RecordToIndex = {
    recordId: RecordId,
    newHash: string
    serializedDataToEmbed: string,
}

export type RequestWithTokensToBeRateLimited<T> = {
    request: () => Promise<T>,
    numTokensInRequest: number
}

export type AIServiceError = {
    errorStatus?: any
    errorResponse?: any
    errorMessage?: any
}

export type EmbeddingsResponse = Array<RecordIndexData> | AIServiceError;

export type AiryTableSchema = Omit<AskAiryTable, 'recordsToAskAiryAbout'>;

export type RecordToIndexWithTokensCounted = RecordToIndex & { numTokensInRequest: number };

export type EmbeddingsRequest = {
    recordsToEmbed: Array<RecordToIndexWithTokensCounted>,
    numTokensInRecordsToEmbed: number
}

export type AiryDataIndexUpdateResult = {
    numEmbeddingFailures: number,
    numAirtableUpdateFailures: number,
    airtableWriteSuccesses: number
}

export interface UseReadableStreamResult {
    data: string;
}

