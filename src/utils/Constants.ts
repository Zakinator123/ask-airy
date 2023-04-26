import {FieldType} from "@airtable/blocks/models";
import {
    OptionalFieldName,
    OtherExtensionConfiguration,
    RequiredFieldName,
    TableName,
    TablesAndFieldsConfigurationErrors,
    TablesAndFieldsConfigurationIds
} from "../types/ConfigurationTypes";

export const blankConfigurationState: Readonly<TablesAndFieldsConfigurationIds> = {};
export const defaultOtherConfigurationState: Readonly<OtherExtensionConfiguration> = {}
export const combinedRequiredConfigKeys = {...TableName, ...RequiredFieldName};
export const combinedConfigKeys = {...combinedRequiredConfigKeys, ...OptionalFieldName}
export const blankErrorState: Readonly<TablesAndFieldsConfigurationErrors> = blankConfigurationState;
export const ExpectedAppConfigFieldTypeMapping: Readonly<Record<RequiredFieldName | OptionalFieldName, FieldType>> = {}
export const fieldTypeLinks: Readonly<Record<RequiredFieldName | OptionalFieldName, TableName | undefined>> = {}