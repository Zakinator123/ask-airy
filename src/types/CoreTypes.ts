import {Field, Record, Table} from "@airtable/blocks/models";
import {RecordId} from "@airtable/blocks/dist/types/src/types/record";
import {AiryDataIndexUpdateResult, AiryIndexUpdateResult} from "../services/AskAiryService";

export type AITableQueryResponse = {
    errorOccurred: false,
    aiResponse: ReadableStream<Uint8Array>,
    numRelevantRecordsUsedByAI: number
} | {
    errorOccurred: true,
    message: string
}

export interface AIService {
    answerQueryGivenRelevantAirtableContext: (query: string, airyTableSchema: AiryTableSchema, relevantContextData: string[]) => Promise<AITableQueryResponse>,
    getEmbeddingsForRecords: (recordsToEmbed: Array<RecordToIndex>) => Promise<Array<RecordIndexData>>,
    getEmbeddingForString: (string: string) => Promise<Embedding>,
    getHypotheticalSearchResultGivenUserQuery: (airyTableSchema: AiryTableSchema, query: string) => Promise<string>
}

export interface AskAiryServiceInterface {
    updateAiryDataIndexForTable: (askAiryTable: AskAiryTable, recordsToIndex: Array<RecordToIndex>, dataIndexUpdateProgressUpdater: (numSuccesses: number) => void) => Promise<AiryDataIndexUpdateResult>,
    getRecordsWithStaleAiryIndexData: (askAiryTable: AskAiryTable) => Promise<Array<RecordToIndex>>,
    executeSemanticSearchForTable: (askAiryTable: AskAiryTable, query: string, numResults: number) => Promise<Record[]>,
    askAiryAboutRelevantRecords: (askAiryTable: AskAiryTable, query: string, relevantRecords: Record[]) => Promise<AITableQueryResponse>,
    askAiryAboutAnything: (query: string) => Promise<string>,
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
