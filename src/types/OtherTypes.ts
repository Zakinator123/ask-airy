import {RecordId} from "@airtable/blocks/dist/types/src/types/record";
import {ObjectMap} from "@airtable/blocks/dist/types/src/private_utils";
import {FieldId} from "@airtable/blocks/types";

export type LicenseStatus = 'license-active' | 'invalid' | 'expired' | 'unable-to-verify' | 'no-license';

export type RecordToUpdate = {
    readonly id: RecordId;
    readonly fields: ObjectMap<FieldId | string, unknown>;
}