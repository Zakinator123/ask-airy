import {Field, Record, Table} from "@airtable/blocks/models";
import {RecordId} from "@airtable/blocks/dist/types/src/types/record";

export interface AIService {
    answerQueryGivenRelevantAirtableContext: (query: string, searchTableSchema: SearchTableSchema, relevantContextData: string[]) => Promise<string>,
    getEmbeddingsForRecords: (recordsToEmbed: Array<RecordToIndex>) => Promise<Array<RecordIndexData>>,
    getEmbeddingForString: (string: string) => Promise<Embedding>,
    getHypotheticalSearchResultGivenUserQuery: (searchTableSchema: Omit<SearchTable, "recordsToSearch">, query: string) => Promise<string>
}

export interface SearchService {
    updateSearchIndexForTable: (searchTable: SearchTable, recordsToIndex?: Array<RecordToIndex>) => Promise<void>,
    getStaleRecordsInSearchIndex: (searchTable: SearchTable) => Promise<Array<RecordToIndex>>,
    executeSemanticSearchForTable: (searchTable: SearchTable, query: string, numResults: number) => Promise<{aiAnswer: string ,relevantRecords: Record[]}>
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
