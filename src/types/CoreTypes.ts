import {Field, Record, Table} from "@airtable/blocks/models";
import {RecordId} from "@airtable/blocks/dist/types/src/types/record";

export type AITableQueryResponse = {
    errorOccurred: false,
    aiResponse: ReadableStream<Uint8Array>,
    numRelevantRecordsUsedByAI: number
} | {
    errorOccurred: true,
    message: string
}

export type AIPowerPreference = 'fast' | 'powerful';

export interface AIService {
    answerQueryGivenRelevantAirtableContext: (query: string, searchTableSchema: SearchTableSchema, relevantContextData: string[],
                                              aiPowerPreference: AIPowerPreference) => Promise<AITableQueryResponse>,
    getEmbeddingsForRecords: (recordsToEmbed: Array<RecordToIndex>) => Promise<Array<RecordIndexData>>,
    getEmbeddingForString: (string: string) => Promise<Embedding>,
    getHypotheticalSearchResultGivenUserQuery: (searchTableSchema: Omit<SearchTable, "recordsToSearch">, query: string) => Promise<string>
}

export interface AskAIServiceInterface {
    updateSearchIndexForTable: (searchTable: SearchTable, recordsToIndex?: Array<RecordToIndex>) => Promise<void>,
    getStaleRecordsInSearchIndex: (searchTable: SearchTable) => Promise<Array<RecordToIndex>>,
    executeSemanticSearchForTable: (searchTable: SearchTable, query: string, numResults: number, aiPowerPreference: AIPowerPreference) => Promise<Record[]>,
    askAIAboutRelevantRecords: (searchTable: SearchTable, query: string, relevantRecords: Record[], aiPowerPreference: AIPowerPreference) => Promise<AITableQueryResponse>,
    askAIAboutAnything: (query: string) => Promise<string>,
}

export type Embedding = number[];

export type RecordIndexData = {
    recordId: RecordId,
    hash: string,
    embedding: Embedding
}

export type SearchTable = {
    table: Table,
    recordsToSearch: Record[],
    searchFields: Field[],
    intelliSearchIndexField: Field,
}

export type SearchIndexData = {
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

export type SearchTableSchema = Omit<SearchTable, 'recordsToSearch'>;
