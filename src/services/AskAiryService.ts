import {xxhash64} from "hash-wasm";
import {Record} from "@airtable/blocks/models";
import Heap from "heap-js";
import {
    AIService,
    AITableQueryResponse,
    AskAiryServiceInterface,
    RecordIndexData,
    RecordToIndex,
    AiryIndexData,
    AskAiryTable
} from "../types/CoreTypes";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {serializeRecord} from "../utils/RandomUtils";

export class AskAiryService implements AskAiryServiceInterface {
    private aiService;
    private AirtableMutationService;

    constructor(embeddingsService: AIService, AirtableMutationService: AirtableMutationService) {
        this.aiService = embeddingsService;
        this.AirtableMutationService = AirtableMutationService;
    }

    updateAiryIndexDataForTable = async (airyTable: AskAiryTable, recordsToIndex?: Array<RecordToIndex>): Promise<void> => {
        if (recordsToIndex === undefined) {
            recordsToIndex = await this.getRecordsWithStaleAiryIndexData(airyTable);
        }

        console.log(`Updating ${recordsToIndex.length} records in index`);

        if (recordsToIndex.length !== 0) {
            console.log(`Updating ${recordsToIndex.length} records in index`);
            const recordEmbeddings: RecordIndexData[] = await this.aiService.getEmbeddingsForRecords(recordsToIndex);

            await this.AirtableMutationService.updateRecordsInTableAsync(airyTable.table, recordEmbeddings.map(recordIndexData => (
                {
                    id: recordIndexData.recordId,
                    fields: {
                        [airyTable.airyDataIndexField.id]: JSON.stringify({
                            hash: recordIndexData.hash,
                            embedding: recordIndexData.embedding
                        })
                    }
                })));
        }
    }

    getRecordsWithStaleAiryIndexData = async ({
                                              airyDataIndexField,
                                              airyFields,
                                              recordsToAskAiryAbout
                                          }: AskAiryTable): Promise<Array<RecordToIndex>> => {
        const recordsToUpdate: RecordToIndex[] = [];

        const performance = window.performance;
        const startTime = performance.now();

        for (const record of recordsToAskAiryAbout) {
            const serializedDataToEmbed = serializeRecord(record, {airyFields: airyFields, airyDataIndexField: airyDataIndexField});
            const newHash = await xxhash64(serializedDataToEmbed, 420, 6969);

            const currentRecordAiryIndexData = record.getCellValueAsString(airyDataIndexField.id);
            if (currentRecordAiryIndexData === '') {
                recordsToUpdate.push({recordId: record.id, newHash, serializedDataToEmbed});
            } else {
                // TODO: Handle error here if parsing fails
                const airyIndexDataForRecords: AiryIndexData = JSON.parse(currentRecordAiryIndexData);
                if (newHash !== airyIndexDataForRecords.hash) {
                    recordsToUpdate.push({recordId: record.id, newHash, serializedDataToEmbed});
                }
            }
        }

        const endTime = performance.now();
        const elapsedTime = endTime - startTime;
        console.log(`Elapsed time for getting stale airy data index records: ${elapsedTime} milliseconds`);

        return recordsToUpdate;
    }

    computeDotProduct = (a: number[], b: number[]) =>
        a.map((x, i) => a[i]! * b[i]!).reduce((m, n) => m + n);

    executeSemanticSearchForTable = async ({
                                               airyDataIndexField,
                                               airyFields,
                                               recordsToAskAiryAbout,
                                               table
                                           }: AskAiryTable,
                                           query: string, numResults: number): Promise<Record[]> => {

        const hypotheticalSemanticSearchResult = await this.aiService.getHypotheticalSearchResultGivenUserQuery({
                airyDataIndexField: airyDataIndexField,
                airyFields: airyFields,
                table
            }, query);

        const embeddedQuery = await this.aiService.getEmbeddingForString(hypotheticalSemanticSearchResult);

        const performance = window.performance;
        const startTime = performance.now();

        const heap = new Heap<[number, Record]>((a, b) => a[0] - b[0]);
        for (const record of recordsToAskAiryAbout) {
            const airyIndexData = JSON.parse(record.getCellValue(airyDataIndexField.id) as string) as AiryIndexData;
            const dotProduct = this.computeDotProduct(embeddedQuery, airyIndexData.embedding);

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


    askAiryAboutRelevantRecords = async ({
                                           airyDataIndexField,
                                           recordsToAskAiryAbout,
                                           airyFields,
                                           table
                                       }: AskAiryTable, query: string, relevantRecords: Record[]): Promise<AITableQueryResponse> => {

        const serializedRecords = relevantRecords.map(record =>
            JSON.stringify({
                recordName: record.name,
                fields: airyFields.reduce((acc, field) => {
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
            airyDataIndexField: airyDataIndexField,
            airyFields: airyFields,
            table
        }, serializedRecords)
    };


    askAiryAboutAnything(query: string): Promise<string> {
        return Promise.resolve("");
    }
}
