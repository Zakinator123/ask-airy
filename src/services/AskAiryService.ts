import {Record} from "@airtable/blocks/models";
import Heap from "heap-js";
import {
    AiryDataIndexUpdateResult,
    AiryIndexData,
    AiryResponse,
    AiryTableQueryResponse,
    AIService,
    AskAiryServiceInterface,
    AskAiryTable,
    RecordToIndex
} from "../types/CoreTypes";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {serializeRecordForEmbeddings} from "../utils/RandomUtils";
import XXH from 'xxhashjs';

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
                                         dataIndexingPending: {
                                             current: boolean
                                         }): Promise<AiryDataIndexUpdateResult> => {
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
                console.log('Data indexing canceled!!')
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
        for (const record of recordsToAskAiryAbout) {
            const serializedDataToEmbed = serializeRecordForEmbeddings(record, {
                airyFields: airyFields,
                airyDataIndexField: airyDataIndexField
            });

            var newHash = XXH.h32(serializedDataToEmbed, 0xABCD).toString(16)

            // const newHash = await xxhash64(serializedDataToEmbed, 420, 6969);

            const currentRecordAiryIndexData = record.getCellValueAsString(airyDataIndexField.id);
            if (currentRecordAiryIndexData === '') {
                recordsToUpdate.push({recordId: record.id, newHash, serializedDataToEmbed});
            } else {
                const airyIndexDataForRecords = JSON.parse(currentRecordAiryIndexData);
                if (!this.isAiryIndexData(airyIndexDataForRecords, undefined)) {
                    // The data is corrupted, so we'll just overwrite it
                    recordsToUpdate.push({recordId: record.id, newHash, serializedDataToEmbed});
                } else if (newHash !== airyIndexDataForRecords.hash) {
                    recordsToUpdate.push({recordId: record.id, newHash, serializedDataToEmbed});
                }
            }
        }
        return recordsToUpdate;
    }


    private isAiryIndexData(data: any, expectedEmbeddingSize: number | undefined): data is AiryIndexData {
        if (typeof data !== 'object') return false;

        if (!Object.prototype.hasOwnProperty.call(data, 'hash') || typeof data.hash !== 'string') {
            return false;
        }

        if (!Object.prototype.hasOwnProperty.call(data, 'embedding') || !Array.isArray(data.embedding)) {
            return false;
        }

        if (expectedEmbeddingSize !== undefined && data.embedding.length !== expectedEmbeddingSize) {
            return false;
        }

        return true;
    }

    private computeDotProduct = (a: number[], b: number[]) =>
        a.map((x, i) => a[i]! * b[i]!).reduce((m, n) => m + n);

    executeSemanticSearchForTable = async ({
                                               airyDataIndexField,
                                               airyFields,
                                               recordsToAskAiryAbout,
                                               table,
                                           }: AskAiryTable,
                                           query: string,
                                           numResults: number,
                                           showCorruptedDataIndexToastMessage: (numCorruptedRecords: number) => void)
        : Promise<Record[]> => {

        const hypotheticalSemanticSearchResult = await this.aiService.getHypotheticalSearchResultGivenUserQuery({
            airyDataIndexField: airyDataIndexField,
            airyFields: airyFields,
            table
        }, query);

        const embeddedQuery = await this.aiService.getEmbeddingForString(hypotheticalSemanticSearchResult);

        const heap = new Heap<[number, Record]>((a, b) => a[0] - b[0]);
        let recordsWithCorruptedDataIndexField = [];
        for (const record of recordsToAskAiryAbout) {
            const airyIndexDataString = record.getCellValueAsString(airyDataIndexField.id);
            if (airyIndexDataString === '') continue;

            const airyIndexData = JSON.parse(airyIndexDataString);

            if (!this.isAiryIndexData(airyIndexData, embeddedQuery.length)) {
                recordsWithCorruptedDataIndexField.push(record);
                continue;
            }

            const dotProduct = this.computeDotProduct(embeddedQuery, airyIndexData.embedding);

            if (heap.size() < 100) {
                heap.push([dotProduct, record]);
            } else if (dotProduct > heap.peek()![0]) {
                heap.pop();
                heap.push([dotProduct, record]);
            }
        }

        if (recordsWithCorruptedDataIndexField.length > 0) {
            showCorruptedDataIndexToastMessage(recordsWithCorruptedDataIndexField.length);
            this.AirtableMutationService.updateRecordsInTableAsync(table, recordsWithCorruptedDataIndexField.map(record => (
                {
                    id: record.id,
                    fields: {[airyDataIndexField.id]: ''}
                })))
        }

        return Array.from(heap.toArray())
            .sort((a, b) => b[0] - a[0])
            .map(recordWithDotProduct => recordWithDotProduct[1]);
    }


    askAiryAboutRelevantRecords = async ({
                                             airyDataIndexField,
                                             airyFields,
                                             table
                                         }: AskAiryTable,
                                         query: string,
                                         relevantRecords: Record[]): Promise<AiryTableQueryResponse> => {

        const serializedRecords = relevantRecords.map(record => {
            const fields = airyFields.reduce((acc, field) => {
                const fieldValue = record.getCellValueAsString(field.id)
                if (fieldValue === '' || field.isPrimaryField) return acc;
                acc.push(`${field.name}:${fieldValue}`)
                return acc;
            }, [] as string[])

            return `"""${table.primaryField.name}:${record.name},${fields.join(', ')}"""`
        });

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
