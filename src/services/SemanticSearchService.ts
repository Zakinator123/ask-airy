import {xxhash64} from "hash-wasm";
import {Record} from "@airtable/blocks/models";
import Heap from "heap-js";
import {
    EmbeddingService,
    RecordIndexData,
    RecordToIndex,
    SearchIndexData,
    SearchService,
    SearchTable
} from "../types/CoreTypes";
import {AirtableMutationService} from "../services/AirtableMutationService";

export class SemanticSearchService implements SearchService {
    private embeddingsService;
    private AirtableMutationService;

    constructor(embeddingsService: EmbeddingService, AirtableMutationService: AirtableMutationService) {
        this.embeddingsService = embeddingsService;
        this.AirtableMutationService = AirtableMutationService;
    }

    updateSearchIndexForTable = async (searchTable: SearchTable, recordsToIndex?: Array<RecordToIndex>): Promise<void> => {
        if (recordsToIndex === undefined) {
            recordsToIndex = await this.getStaleRecordsInSearchIndex(searchTable);
        }

        console.log(`Updating ${recordsToIndex.length} records in search index`);

        if (recordsToIndex.length !== 0) {
            console.log(`Updating ${recordsToIndex.length} records in search index`);
            const recordEmbeddings: RecordIndexData[] = await this.embeddingsService.getEmbeddingsForRecords(recordsToIndex);

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
            const serializedDataToEmbed = searchFields.reduce((recordData, currentField) => {
                const fieldValue = record.getCellValueAsString(currentField.id);
                if (fieldValue !== '' && currentField.id !== intelliSearchIndexField.id) {
                    return recordData + `${currentField.name} is ${fieldValue}. `;
                }
                return recordData;
            }, '');
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
                                           }: SearchTable,
                                           query: string, numResults: number): Promise<Record[]> => {
        const embeddedQuery = await this.embeddingsService.getEmbeddingForString(query);

        const performance = window.performance;
        const startTime = performance.now();

        const heap = new Heap<[number, Record]>((a, b) => a[0] - b[0]);
        ///
        for (const record of recordsToSearch) {
            const searchIndexData = JSON.parse(record.getCellValue(intelliSearchIndexField.id) as string) as SearchIndexData;
            const dotProduct = this.computeDotProduct(embeddedQuery, searchIndexData.embedding);

            if (heap.size() < numResults) {
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
}
