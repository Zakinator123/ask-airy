import {xxhash64} from "hash-wasm";
import {Record} from "@airtable/blocks/models";
import Heap from "heap-js";
import {
    AiryIndexData,
    AIService,
    AITableQueryResponse,
    AskAiryServiceInterface,
    AskAiryTable,
    RecordIndexData,
    RecordToIndex
} from "../types/CoreTypes";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {serializeRecordForEmbeddings} from "../utils/RandomUtils";


export type AiryIndexUpdateResult =
    'full-embedding-failure'
    | 'partial-embedding-failure'
    | 'airtable-update-failure'
    | 'success';

export type AiryDataIndexUpdateResult = {
    numEmbeddingFailures: number,
    numAirtableUpdateFailures: number,
    airtableWriteSuccesses: number
}

export class AskAiryService implements AskAiryServiceInterface {
    private aiService;
    private AirtableMutationService;

    constructor(embeddingsService: AIService, AirtableMutationService: AirtableMutationService) {
        this.aiService = embeddingsService;
        this.AirtableMutationService = AirtableMutationService;
    }

    updateAiryDataIndexForTable = async (airyTable: AskAiryTable, recordsToIndex: Array<RecordToIndex>, dataIndexUpdateProgressUpdater: (numSuccesses: number) => void): Promise<AiryDataIndexUpdateResult> => {
        let numEmbeddingFailures = 0;
        let numAirtableUpdateFailures = 0;
        let airtableWriteSuccesses = 0;

        const airtableWritePromises: Promise<void>[] = [];

        for (let i = 0; i < recordsToIndex.length; i += 195) {
            console.log('Indexing records from ' + i + ' to ' + Math.min(recordsToIndex.length, i + 195));
            const recordsToIndexSlice = recordsToIndex.slice(i, Math.min(recordsToIndex.length, i + 195));

            console.log("Before embeddings");
            const recordEmbeddings: RecordIndexData[] = await this.aiService.getEmbeddingsForRecords(recordsToIndexSlice);
            console.log("After embeddings");

            if (recordEmbeddings.length === 0) {
                numEmbeddingFailures += recordsToIndexSlice.length;
                console.log('Full embedding failure occurred');
                continue;
            }

            if (recordEmbeddings.length !== recordsToIndexSlice.length) {
                numEmbeddingFailures = recordsToIndexSlice.length - recordEmbeddings.length;
                console.log('Partial embedding failure occurred');
            }

            console.log("before airtable update");
            const airtableUpdatePromise = this.AirtableMutationService.updateRecordsInTableAsync(airyTable.table, recordEmbeddings.map(recordIndexData => (
                {
                    id: recordIndexData.recordId,
                    fields: {
                        [airyTable.airyDataIndexField.id]: JSON.stringify({
                            hash: recordIndexData.hash,
                            embedding: recordIndexData.embedding
                        })
                    }
                })));
            console.log("after airtable promise creation");

            airtableUpdatePromise.then(() => {
                airtableWriteSuccesses += recordsToIndexSlice.length;
                dataIndexUpdateProgressUpdater(airtableWriteSuccesses);
            }).catch(() => {
                numAirtableUpdateFailures += recordsToIndexSlice.length;
            });

            console.log("after airtable update promise updating ui progress")

            airtableWritePromises.push(airtableUpdatePromise);
            console.log('Airtable write promises:');
            console.log(airtableWritePromises);
        }

        await Promise.all(airtableWritePromises);

        return {
            numEmbeddingFailures,
            numAirtableUpdateFailures,
            airtableWriteSuccesses
        }
    }

    getRecordsWithStaleAiryIndexData = async ({
                                                  airyDataIndexField,
                                                  airyFields,
                                                  recordsToAskAiryAbout
                                              }: AskAiryTable): Promise<Array<RecordToIndex>> => {
        const recordsToUpdate: RecordToIndex[] = [];


        const checkingForStaleRecordsAndGeneratingNewHashesPerformance = window.performance;
        const startTime = checkingForStaleRecordsAndGeneratingNewHashesPerformance.now();
        for (const record of recordsToAskAiryAbout) {
            const serializedDataToEmbed = serializeRecordForEmbeddings(record, {
                airyFields: airyFields,
                airyDataIndexField: airyDataIndexField
            });
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
        const endTime = checkingForStaleRecordsAndGeneratingNewHashesPerformance.now();
        console.log(`Checking for stale records and generating new hashes took ${endTime - startTime} milliseconds.`)

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

        console.log(`Query to be embedded for semantic search: ${hypotheticalSemanticSearchResult}`)

        const embeddedQuery = await this.aiService.getEmbeddingForString(hypotheticalSemanticSearchResult);

        const dotProductPerformance = window.performance;
        const startTime = dotProductPerformance.now();
        const heap = new Heap<[number, Record]>((a, b) => a[0] - b[0]);
        for (const record of recordsToAskAiryAbout) {
            const airyIndexDataString = record.getCellValueAsString(airyDataIndexField.id);
            if (airyIndexDataString === '') continue;
            const airyIndexData = JSON.parse(record.getCellValue(airyDataIndexField.id) as string) as AiryIndexData;
            const dotProduct = this.computeDotProduct(embeddedQuery, airyIndexData.embedding);

            if (heap.size() < 1000) {
                heap.push([dotProduct, record]);
            } else if (dotProduct > heap.peek()![0]) {
                heap.pop();
                heap.push([dotProduct, record]);
            }
        }

        const topKSearchResults = Array.from(heap.toArray())
            .sort((a, b) => b[0] - a[0])
            .map(recordWithDotProduct => recordWithDotProduct[1]);

        const endTime = dotProductPerformance.now();
        console.log(`Dot product calculations took ${endTime - startTime} milliseconds.`)
        return topKSearchResults;
    }


    askAiryAboutRelevantRecords = async ({
                                             airyDataIndexField,
                                             recordsToAskAiryAbout,
                                             airyFields,
                                             table
                                         }: AskAiryTable, query: string, relevantRecords: Record[]): Promise<AITableQueryResponse> => {

        const serializedRecords = relevantRecords.map(record => {
            const fields = airyFields.reduce((acc, field) => {
                const fieldValue = record.getCellValueAsString(field.id)
                if (fieldValue === '' || field.isPrimaryField) return acc;
                acc.push(`${field.name}: ${fieldValue}`)
                return acc;
            }, [] as string[])

            return `"""Record name: ${record.name}, ${fields.join(', ')}"""`
        });

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
