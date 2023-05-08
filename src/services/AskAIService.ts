import {xxhash64} from "hash-wasm";
import {Record} from "@airtable/blocks/models";
import Heap from "heap-js";
import {
    AIPowerPreference,
    AIService,
    AITableQueryResponse,
    AskAIServiceInterface,
    RecordIndexData,
    RecordToIndex,
    SearchIndexData,
    SearchTable
} from "../types/CoreTypes";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {serializeRecord} from "../utils/RandomUtils";

export class AskAIService implements AskAIServiceInterface {
    private aiService;
    private AirtableMutationService;

    constructor(embeddingsService: AIService, AirtableMutationService: AirtableMutationService) {
        this.aiService = embeddingsService;
        this.AirtableMutationService = AirtableMutationService;
    }

    updateSearchIndexForTable = async (searchTable: SearchTable, recordsToIndex?: Array<RecordToIndex>): Promise<void> => {
        if (recordsToIndex === undefined) {
            recordsToIndex = await this.getStaleRecordsInSearchIndex(searchTable);
        }

        console.log(`Updating ${recordsToIndex.length} records in search index`);

        if (recordsToIndex.length !== 0) {
            console.log(`Updating ${recordsToIndex.length} records in search index`);
            const recordEmbeddings: RecordIndexData[] = await this.aiService.getEmbeddingsForRecords(recordsToIndex);

            await this.AirtableMutationService.updateRecordsInTableAsync(searchTable.table, recordEmbeddings.map(recordIndexData => (
                {
                    id: recordIndexData.recordId,
                    fields: {
                        [searchTable.intelliSearchIndexField.id]: JSON.stringify({
                            hash: recordIndexData.hash,
                            embedding: recordIndexData.embedding
                        })
                    }
                })));
        }
    }

    getStaleRecordsInSearchIndex = async ({
                                              intelliSearchIndexField,
                                              searchFields,
                                              recordsToSearch
                                          }: SearchTable): Promise<Array<RecordToIndex>> => {
        const recordsToUpdate: RecordToIndex[] = [];

        const performance = window.performance;
        const startTime = performance.now();

        for (const record of recordsToSearch) {
            const serializedDataToEmbed = serializeRecord(record, {searchFields, intelliSearchIndexField});
            const newHash = await xxhash64(serializedDataToEmbed, 420, 6969);

            const currentRecordSearchIndexData = record.getCellValueAsString(intelliSearchIndexField.id);
            if (currentRecordSearchIndexData === '') {
                recordsToUpdate.push({recordId: record.id, newHash, serializedDataToEmbed});
            } else {
                // TODO: Handle error here if parsing fails
                const searchIndexDataForRecord: SearchIndexData = JSON.parse(currentRecordSearchIndexData);
                if (newHash !== searchIndexDataForRecord.hash) {
                    recordsToUpdate.push({recordId: record.id, newHash, serializedDataToEmbed});
                }
            }
        }

        const endTime = performance.now();
        const elapsedTime = endTime - startTime;
        console.log(`Elapsed time for getting stale search index records: ${elapsedTime} milliseconds`);

        return recordsToUpdate;
    }

    computeDotProduct = (a: number[], b: number[]) =>
        a.map((x, i) => a[i]! * b[i]!).reduce((m, n) => m + n);

    executeSemanticSearchForTable = async ({
                                               intelliSearchIndexField,
                                               searchFields,
                                               recordsToSearch,
                                               table
                                           }: SearchTable,
                                           query: string, numResults: number, aiPowerPreference: AIPowerPreference): Promise<Record[]> => {

        let semanticSearchQuery = query;
        if (aiPowerPreference === 'powerful') {
            semanticSearchQuery = await this.aiService.getHypotheticalSearchResultGivenUserQuery({
                intelliSearchIndexField,
                searchFields,
                table
            }, query);
        }

        const embeddedQuery = await this.aiService.getEmbeddingForString(semanticSearchQuery);

        const performance = window.performance;
        const startTime = performance.now();

        const heap = new Heap<[number, Record]>((a, b) => a[0] - b[0]);
        for (const record of recordsToSearch) {
            const searchIndexData = JSON.parse(record.getCellValue(intelliSearchIndexField.id) as string) as SearchIndexData;
            const dotProduct = this.computeDotProduct(embeddedQuery, searchIndexData.embedding);

            if (heap.size() < 1000) {
                heap.push([dotProduct, record]);
            } else if (dotProduct > heap.peek()![0]) {
                heap.pop();
                heap.push([dotProduct, record]);
            }
        }

        const endTime = performance.now();
        const elapsedTime = endTime - startTime;
        console.log(`Elapsed time for semantic search: ${elapsedTime} milliseconds`);

        const topKSearchResults = Array.from(heap.toArray())
            .sort((a, b) => b[0] - a[0])
            .map(recordWithDotProduct => recordWithDotProduct[1]);

        return topKSearchResults;
    }


    askAIAboutRelevantRecords = async ({
                                           intelliSearchIndexField,
                                           recordsToSearch,
                                           searchFields,
                                           table
                                       }: SearchTable, query: string, relevantRecords: Record[], aiPowerPreference: AIPowerPreference): Promise<AITableQueryResponse> => {

        const serializedRecords = relevantRecords.map(record =>
            JSON.stringify({
                recordName: record.name,
                fields: searchFields.reduce((acc, field) => {
                    const fieldValue = record.getCellValueAsString(field.id)
                    if (fieldValue === '' || field.isPrimaryField) return acc;
                    acc.push({
                        fieldName: field.name,
                        fieldValue: fieldValue
                    })
                    return acc;
                }, [] as { fieldName: string, fieldValue: string }[])
            }))

        // TODO: Handle array bounds with heap and slicing

        return await this.aiService.answerQueryGivenRelevantAirtableContext(query, {
            intelliSearchIndexField,
            searchFields,
            table
        }, serializedRecords, aiPowerPreference)
    };


    askAIAboutAnything(query: string): Promise<string> {
        return Promise.resolve("");
    }
}
