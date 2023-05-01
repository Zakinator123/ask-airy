import {RecordId} from "@airtable/blocks/dist/types/src/types/record";
import {ObjectMap} from "@airtable/blocks/dist/types/src/private_utils";
import {FieldId} from "@airtable/blocks/types";

export type PremiumStatus = 'premium' | 'invalid' | 'expired' | 'unable-to-verify' | 'free';

export type RecordToUpdate = {
    readonly id: RecordId;
    readonly fields: ObjectMap<FieldId | string, unknown>;
}