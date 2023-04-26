import {FieldType} from "@airtable/blocks/models";
import {
    TablesAndFieldsConfigurationIds,
    CheckoutTableOptionalFieldName,
    CheckoutTableRequiredFieldName,
    ExtensionConfigurationFormSchema,
    TableName, TablesAndFieldsConfigurationErrors, OtherExtensionConfiguration, OtherConfigurationKey
} from "../types/ConfigurationTypes";

export const maxNumberOfCartRecordsForFreeUsers: number = 3;

export const blankConfigurationState: Readonly<TablesAndFieldsConfigurationIds> = {
    [TableName.inventoryTable]: '',
    [TableName.recipientTable]: '',
    [TableName.checkoutsTable]: '',
    [CheckoutTableRequiredFieldName.linkedInventoryTableField]: '',
    [CheckoutTableRequiredFieldName.linkedRecipientTableField]: '',
    [CheckoutTableRequiredFieldName.checkedInField]: '',
    [CheckoutTableOptionalFieldName.dateCheckedOutField]: '',
    [CheckoutTableOptionalFieldName.dateDueField]: '',
    [CheckoutTableOptionalFieldName.dateCheckedInField]: '',
    [CheckoutTableOptionalFieldName.cartGroupField]: '',
};

export const defaultOtherConfigurationState: Readonly<OtherExtensionConfiguration> = {
    [OtherConfigurationKey.deleteOpenCheckoutsUponCheckIn]: false,
    [OtherConfigurationKey.defaultNumberOfDaysFromTodayForDueDate]: 7,
}

export const combinedCheckoutsTableFields = {...CheckoutTableRequiredFieldName, ...CheckoutTableOptionalFieldName};
export const combinedRequiredConfigKeys = {...TableName, ...CheckoutTableRequiredFieldName};
export const combinedConfigKeys = {...combinedRequiredConfigKeys, ...CheckoutTableOptionalFieldName}
export const blankErrorState: Readonly<TablesAndFieldsConfigurationErrors> = blankConfigurationState;

export const ExpectedAppConfigFieldTypeMapping: Readonly<Record<CheckoutTableRequiredFieldName | CheckoutTableOptionalFieldName, FieldType>> = {
    [CheckoutTableRequiredFieldName.linkedInventoryTableField]: FieldType.MULTIPLE_RECORD_LINKS,
    [CheckoutTableRequiredFieldName.linkedRecipientTableField]: FieldType.MULTIPLE_RECORD_LINKS,
    [CheckoutTableRequiredFieldName.checkedInField]: FieldType.CHECKBOX,
    [CheckoutTableOptionalFieldName.dateCheckedOutField]: FieldType.DATE,
    [CheckoutTableOptionalFieldName.dateDueField]: FieldType.DATE,
    [CheckoutTableOptionalFieldName.dateCheckedInField]: FieldType.DATE,
    [CheckoutTableOptionalFieldName.cartGroupField]: FieldType.NUMBER,
}

export const fieldTypeLinks: Readonly<Record<CheckoutTableRequiredFieldName | CheckoutTableOptionalFieldName, TableName | undefined>> = {
    [CheckoutTableRequiredFieldName.linkedInventoryTableField]: TableName.inventoryTable,
    [CheckoutTableRequiredFieldName.linkedRecipientTableField]: TableName.recipientTable,
    [CheckoutTableRequiredFieldName.checkedInField]: undefined,
    [CheckoutTableOptionalFieldName.dateCheckedOutField]: undefined,
    [CheckoutTableOptionalFieldName.dateDueField]: undefined,
    [CheckoutTableOptionalFieldName.dateCheckedInField]: undefined,
    [CheckoutTableOptionalFieldName.cartGroupField]: undefined
}

export const settingsFormSchema: ExtensionConfigurationFormSchema = {
    deleteCheckoutsUponCheckin: false,
    schemaConfiguration:
        [
            {
                tableName: TableName.inventoryTable,
                tablePickerLabel: 'Inventory Table:',
                tablePickerTooltip: 'This table contains the items to be checked out.',
            },
            {
                tableName: TableName.recipientTable,
                tablePickerLabel: 'Recipient Table:',
                tablePickerTooltip: 'This table contains the recipients that items will be checked out to.',
            },
            {
                tableName: TableName.checkoutsTable,
                tablePickerLabel: 'Checkouts Table (Junction Table):',
                tablePickerTooltip: 'This table contains the checkout records.',
                requiredFields: [
                    {
                        fieldName: CheckoutTableRequiredFieldName.linkedInventoryTableField,
                        fieldPickerLabel: 'Linked Record Field to Inventory Table:',
                        fieldPickerTooltip: 'This field must link to the inventory table configured above.'
                    },
                    {
                        fieldName: CheckoutTableRequiredFieldName.linkedRecipientTableField,
                        fieldPickerLabel: 'Linked Record Field to Recipients Table:',
                        fieldPickerTooltip: 'This field must link to the recipients table configured above.'
                    },
                    {
                        fieldName: CheckoutTableRequiredFieldName.checkedInField,
                        fieldPickerLabel:
                            'Checked In Field:',
                        fieldPickerTooltip: `This is a checkbox field where
                         a checked checkbox means that the checkout is "Checked In".`
                    },
                ],
                optionalFields: [
                    {
                        fieldName: CheckoutTableOptionalFieldName.dateCheckedOutField,
                        fieldPickerLabel: `Date Checked Out Field:`,
                        fieldPickerTooltip: `(Optional) Date Field. Enable this to record the date a checkout is created.`
                    },
                    {
                        fieldName: CheckoutTableOptionalFieldName.dateDueField,
                        fieldPickerLabel: `Date Due Field:`,
                        fieldPickerTooltip: `(Optional) Date Field. Enable to record the date a checkout is due.`
                    },
                    {
                        fieldName: CheckoutTableOptionalFieldName.dateCheckedInField,
                        fieldPickerLabel: `Date Checked In Field:`,
                        fieldPickerTooltip: `(Optional) Date Field. Enable to record the date checkouts are checked in.`
                    },
                    {
                        fieldName: CheckoutTableOptionalFieldName.cartGroupField,
                        fieldPickerLabel: `Cart Id Field:`,
                        fieldPickerTooltip: `(Optional) Number Field. Enable to record the cart id of a checkout.`
                    }
                ],
            }
        ]
}