import {RequestRateLimiter} from "../utils/RequestRateLimiter";
import {Table} from "@airtable/blocks/models";
import {RecordId} from "@airtable/blocks/dist/types/src/types/record";
import {ObjectMap} from "@airtable/blocks/dist/types/src/private_utils";
import {FieldId} from "@airtable/blocks/dist/types/src/types/field";
import {RecordToUpdate} from "../types/OtherTypes";

export class AirtableMutationService {
    private readonly _rateLimiter: RequestRateLimiter;
    private readonly BATCH_SIZE = 40;

    constructor(rateLimiter: RequestRateLimiter) {
        this._rateLimiter = rateLimiter;
    }

    private batchWriteRecords = async <T, R>(recordsOrRecordIds: T[], batchWriteOperation: (recordsOrRecordIds: T[]) => Promise<R>): Promise<R[]> => {
        let i = 0;
        const fulfilledPromiseValues = [];
        while (i < recordsOrRecordIds.length) {
            console.log(`Processing batch ${i} to ${Math.min(recordsOrRecordIds.length, i + this.BATCH_SIZE)}`);
            const recordBatch = recordsOrRecordIds.slice(i, Math.min(recordsOrRecordIds.length, i + this.BATCH_SIZE));
            fulfilledPromiseValues.push(await batchWriteOperation(recordBatch));
            i += this.BATCH_SIZE;
        }

        return <R[]>fulfilledPromiseValues;
    }

    updateRecordsInTableAsync = (table: Table, recordsToUpdate: RecordToUpdate[]): Promise<void> =>
        this._rateLimiter.returnRateLimitedPromise(() => this.batchWriteRecords(recordsToUpdate, table.updateRecordsAsync.bind(table))).then()

    deleteRecordsInTableAsync = (table: Table, recordIdsToDelete: RecordId[]): Promise<void> =>
        this._rateLimiter.returnRateLimitedPromise(() => this.batchWriteRecords(recordIdsToDelete, table.deleteRecordsAsync.bind(table))).then()

    createRecordsInTableAsync = (table: Table, recordsToCreate: Array<{fields: ObjectMap<FieldId, unknown>}>): Promise<Array<RecordId>> =>
        this._rateLimiter.returnRateLimitedPromise(() => this.batchWriteRecords(recordsToCreate, table.createRecordsAsync.bind(table))).then(test => test.flat());

    updateRecordInTableAsync = async (table: Table, recordId: RecordId, fields: ObjectMap<FieldId, unknown>): Promise<void> =>
        this._rateLimiter.returnRateLimitedPromise(() => table.updateRecordAsync(recordId, fields))

    deleteRecordInTableAsync = async (table: Table, recordId: RecordId): Promise<void> =>
        this._rateLimiter.returnRateLimitedPromise(() => table.deleteRecordAsync(recordId))

    createRecordInTableAsync = async (table: Table, fields: ObjectMap<FieldId, unknown>): Promise<string> =>
        this._rateLimiter.returnRateLimitedPromise(() => table.createRecordAsync(fields))
}