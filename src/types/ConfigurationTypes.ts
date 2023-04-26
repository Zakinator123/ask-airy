import {Field, Table} from "@airtable/blocks/models";
import {FieldId, TableId} from "@airtable/blocks/types";

export enum TableName {table = "table"}
export enum RequiredFieldName {requiredField = "requiredField"}
export enum OptionalFieldName {optionalField = "optionalField"}
export enum OtherConfigurationKey {}

export type TableAndFieldsConfigurationKey = TableName | RequiredFieldName | OptionalFieldName;

type TablesAndFieldsConfiguration<TableOrTableIdOrErrorMessage, FieldOrFieldIdOrErrorMessage, OptionalFieldOrFieldIdOrErrorMessage> = {
    [TableName.table]: TableOrTableIdOrErrorMessage,
    [RequiredFieldName.requiredField]: FieldOrFieldIdOrErrorMessage,
    [OptionalFieldName.optionalField]: FieldOrFieldIdOrErrorMessage,
}

export type OtherExtensionConfiguration = {}
export type ExtensionConfiguration = {
    tableAndFieldIds: TablesAndFieldsConfigurationIds,
    otherConfiguration: OtherExtensionConfiguration,
}

export type TablesAndFieldsConfigurationIds = TablesAndFieldsConfiguration<TableId, FieldId, string>;
export type TablesAndFieldsConfigurationErrors = TablesAndFieldsConfiguration<string, string, string>;
export type ValidatedTablesAndFieldsConfiguration = Readonly<TablesAndFieldsConfiguration<Table, Field, Field | undefined>>;

export type ValidationResult = { errorsPresent: true, errors: TablesAndFieldsConfigurationErrors }
    | { errorsPresent: false, configuration: ValidatedTablesAndFieldsConfiguration }