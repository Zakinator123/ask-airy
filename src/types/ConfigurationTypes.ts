import {Field, Table} from "@airtable/blocks/models";
import {FieldId, TableId} from "@airtable/blocks/types";

export enum TableName {
    inventoryTable = 'inventoryTable',
    recipientTable = 'recipientTable',
    checkoutsTable = 'checkoutsTable'
}

export enum CheckoutTableRequiredFieldName {
    linkedInventoryTableField = 'linkedInventoryTableField',
    linkedRecipientTableField = 'linkedRecipientTableField',
    checkedInField = 'checkedInField',
}

export enum CheckoutTableOptionalFieldName {
    dateCheckedOutField = 'dateCheckedOutField',
    dateDueField = 'dateDueField',
    dateCheckedInField = 'dateCheckedInField',
    cartGroupField = 'cartGroupField'
}

export enum OtherConfigurationKey {
    deleteOpenCheckoutsUponCheckIn = 'deleteOpenCheckoutsUponCheckIn',
    defaultNumberOfDaysFromTodayForDueDate = 'defaultNumberOfDaysFromTodayForDueDate',
}

export type TableAndFieldsConfigurationKey = TableName | CheckoutTableRequiredFieldName | CheckoutTableOptionalFieldName;

type TablesAndFieldsConfiguration<TableOrTableIdOrErrorMessage, FieldOrFieldIdOrErrorMessage, OptionalFieldOrFieldIdOrErrorMessage> = {
    [TableName.inventoryTable]: TableOrTableIdOrErrorMessage,
    [TableName.recipientTable]: TableOrTableIdOrErrorMessage,
    [TableName.checkoutsTable]: TableOrTableIdOrErrorMessage,
    [CheckoutTableRequiredFieldName.linkedInventoryTableField]: FieldOrFieldIdOrErrorMessage,
    [CheckoutTableRequiredFieldName.linkedRecipientTableField]: FieldOrFieldIdOrErrorMessage,
    [CheckoutTableRequiredFieldName.checkedInField]: FieldOrFieldIdOrErrorMessage,
    [CheckoutTableOptionalFieldName.dateCheckedOutField]: OptionalFieldOrFieldIdOrErrorMessage,
    [CheckoutTableOptionalFieldName.dateDueField]: OptionalFieldOrFieldIdOrErrorMessage,
    [CheckoutTableOptionalFieldName.dateCheckedInField]: OptionalFieldOrFieldIdOrErrorMessage,
    [CheckoutTableOptionalFieldName.cartGroupField]: OptionalFieldOrFieldIdOrErrorMessage
}

/*
type TablesAndFieldsConfiguration<TableOrTableIdOrErrorMessage, FieldOrFieldIdOrErrorMessage, OptionalFieldOrFieldIdOrErrorMessage> = {
    [tableName in keyof TableName]: TableOrTableIdOrErrorMessage} & {
    [requiredField in keyof CheckoutTableRequiredFieldName]: FieldOrFieldIdOrErrorMessage; } & {
    [optionalField in keyof CheckoutTableOptionalFieldName]: OptionalFieldOrFieldIdOrErrorMessage };

 */

export type OtherExtensionConfiguration = {
    [OtherConfigurationKey.deleteOpenCheckoutsUponCheckIn]: boolean,
    [OtherConfigurationKey.defaultNumberOfDaysFromTodayForDueDate]: number,
}
export type ExtensionConfiguration = {
    tableAndFieldIds: TablesAndFieldsConfigurationIds,
    otherConfiguration: OtherExtensionConfiguration,
}

export type TablesAndFieldsConfigurationIds = TablesAndFieldsConfiguration<TableId, FieldId, string>;
export type TablesAndFieldsConfigurationErrors = TablesAndFieldsConfiguration<string, string, string>;
export type ValidatedTablesAndFieldsConfiguration = Readonly<TablesAndFieldsConfiguration<Table, Field, Field | undefined>>;

export type ValidationResult = {errorsPresent: true, errors: TablesAndFieldsConfigurationErrors}
    | {errorsPresent: false, configuration: ValidatedTablesAndFieldsConfiguration}

export type FieldConfiguration = {
    readonly fieldName: CheckoutTableRequiredFieldName | CheckoutTableOptionalFieldName,
    readonly fieldPickerLabel: string,
    readonly fieldPickerTooltip: string,
}

export type TableConfiguration = {
    readonly tableName: TableName,
    readonly tablePickerLabel: string,
    readonly tablePickerTooltip: string,
    readonly requiredFields?: ReadonlyArray<FieldConfiguration>,
    readonly optionalFields?: ReadonlyArray<FieldConfiguration>,
}

export type SchemaConfiguration = ReadonlyArray<TableConfiguration>;

export type ExtensionConfigurationFormSchema = {
    readonly schemaConfiguration: SchemaConfiguration,
    readonly deleteCheckoutsUponCheckin: boolean,
}