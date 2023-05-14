import {xxhash64} from "hash-wasm";
import {Record} from "@airtable/blocks/models";
import Heap from "heap-js";
import {
    AiryDataIndexUpdateResult,
    AiryIndexData,
    AIService,
    AiryTableQueryResponse,
    AskAiryServiceInterface,
    AskAiryTable,
    RecordToIndex, AiryResponse
} from "../types/CoreTypes";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {serializeRecordForEmbeddings} from "../utils/RandomUtils";

export class AskAiryService implements AskAiryServiceInterface {
    private aiService: AIService;
    private AirtableMutationService: AirtableMutationService;

    constructor(aiService: AIService, AirtableMutationService: AirtableMutationService) {
        this.aiService = aiService;
        this.AirtableMutationService = AirtableMutationService;
    }

    updateAiryDataIndexForTable = async (airyTable: AskAiryTable,
                                         recordsToIndex: Array<RecordToIndex>,
                                         dataIndexUpdateProgressUpdater: (numSuccesses: number, numFailures: number) => void,
                                         dataIndexingPending: { current: boolean }): Promise<AiryDataIndexUpdateResult> => {
        let numEmbeddingFailures = 0;
        let numAirtableUpdateFailures = 0;
        let airtableWriteSuccesses = 0;

        const embeddingsRequests = this.aiService.getEmbeddingsRequestsForRecords(recordsToIndex);

        let currentAirtableWritePromise: Promise<any> | undefined = undefined;
        for (const embeddingsRequest of embeddingsRequests) {
            const embeddings = await this.aiService.getEmbeddings(embeddingsRequest);
            if (embeddings === undefined) {
                numEmbeddingFailures += embeddingsRequest.recordsToEmbed.length;
                dataIndexUpdateProgressUpdater(airtableWriteSuccesses, numEmbeddingFailures + numAirtableUpdateFailures);
                continue;
            }

            if (currentAirtableWritePromise !== undefined) await currentAirtableWritePromise;

            currentAirtableWritePromise = this.AirtableMutationService.updateRecordsInTableAsync(airyTable.table, embeddings.map(recordIndexData => (
                {
                    id: recordIndexData.recordId,
                    fields: {
                        [airyTable.airyDataIndexField.id]: JSON.stringify({
                            hash: recordIndexData.hash,
                            embedding: recordIndexData.embedding
                        })
                    }
                })))
                .then(() => {
                    airtableWriteSuccesses += embeddingsRequest.recordsToEmbed.length;
                    dataIndexUpdateProgressUpdater(airtableWriteSuccesses, numEmbeddingFailures + numAirtableUpdateFailures);
                })
                .catch((e) => {
                    console.error(e);
                    numAirtableUpdateFailures += embeddingsRequest.recordsToEmbed.length;
                    dataIndexUpdateProgressUpdater(airtableWriteSuccesses, numEmbeddingFailures + numAirtableUpdateFailures);
                });

            if (!dataIndexingPending.current) {
                console.error('Data indexing canceled!!')
                // Data indexing canceled
                break;
            }
        }

        if (currentAirtableWritePromise !== undefined && dataIndexingPending) await currentAirtableWritePromise;
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

            // TODO: Check for integrity of airyIndexData here and delete if corrupted

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
                                         }: AskAiryTable, query: string, relevantRecords: Record[]): Promise<AiryTableQueryResponse> => {

        const serializedRecords = relevantRecords.map(record => {
            const fields = airyFields.reduce((acc, field) => {
                const fieldValue = record.getCellValueAsString(field.id)
                if (fieldValue === '' || field.isPrimaryField) return acc;
                acc.push(`${field.name}:${fieldValue}`)
                return acc;
            }, [] as string[])

            return `"""${table.primaryField.name}:${record.name},${fields.join(', ')}"""`
        });

        // TODO: Handle array bounds with heap and slicing
        return await this.aiService.answerQueryGivenRelevantAirtableContext(query, {
            airyDataIndexField: airyDataIndexField,
            airyFields: airyFields,
            table
        }, serializedRecords)
    };


    askAiryAboutAnything = (query: string): Promise<AiryResponse> => {
        return this.aiService.answerQueryAboutAnything(query);
    }
}
