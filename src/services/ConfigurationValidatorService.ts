import {
    OptionalFieldName,
    RequiredFieldName, TableAndFieldsConfigurationKey,
    TablesAndFieldsConfigurationErrors,
    TablesAndFieldsConfigurationIds,
    TableName,
    ValidatedTablesAndFieldsConfiguration,
    ValidationResult
} from "../types/ConfigurationTypes";
import {Base, Field, FieldType, Table} from "@airtable/blocks/models";
import {
    blankErrorState,
    combinedRequiredConfigKeys,
    ExpectedAppConfigFieldTypeMapping,
    fieldTypeLinks
} from "../utils/Constants";
import {mapValues} from "../utils/RandomUtils";
import {FieldId, TableId} from "@airtable/blocks/types";

type TablesOrFieldsOrErrors<TablesNamesOrFieldNames extends TableAndFieldsConfigurationKey, TableOrField> =
    { errorsPresent: true, errors: Record<TablesNamesOrFieldNames, string> }
    | { errorsPresent: false, tablesOrFields: Record<TablesNamesOrFieldNames, TableOrField> }
type TablesOrErrors = TablesOrFieldsOrErrors<TableName, Table>;
type RequiredFieldsOrErrors = TablesOrFieldsOrErrors<RequiredFieldName, Field>
type OptionalFieldsOrErrors = TablesOrFieldsOrErrors<OptionalFieldName, Field | undefined>
const tablesDefined = (possiblyUndefinedTables: Record<TableName, Table | undefined>): possiblyUndefinedTables is Record<TableName, Table> => !Object.values(possiblyUndefinedTables).includes(undefined);
const fieldsDefined = (possiblyUndefinedFields: Record<RequiredFieldName, Field | undefined>): possiblyUndefinedFields is Record<RequiredFieldName, Field> => !Object.values(possiblyUndefinedFields).includes(undefined);

const getTables = (base: Base, tableConfigurationIds: Record<TableName, TableId>): TablesOrErrors => {
    const tables = mapValues(TableName, (tableName,) =>
        base.getTableByIdIfExists(tableConfigurationIds[tableName]) ?? undefined);

    return tablesDefined(tables) ? {errorsPresent: false, tablesOrFields: tables} : {
        errorsPresent: true,
        errors: mapValues(tables, (tableName, table) => table === undefined ? 'Table no longer exists' : '')
    };
}

const getRequiredFields = (base: Base, table: Table, fieldConfigurationIds: Record<RequiredFieldName, FieldId>): RequiredFieldsOrErrors => {
    const requiredFields = mapValues(RequiredFieldName, (requiredFieldName,) =>
        table.getFieldByIdIfExists(fieldConfigurationIds[requiredFieldName]) ?? undefined);

    return fieldsDefined(requiredFields) ? {errorsPresent: false, tablesOrFields: requiredFields} : {
        errorsPresent: true,
        errors: mapValues(requiredFields, (fieldName, field) => field === undefined ? 'Field no longer exists' : '')
    };
}

const getOptionalFields = (base: Base, table: Table, fieldConfigurationIds: Record<OptionalFieldName, FieldId>): OptionalFieldsOrErrors => {

    let nonEmptyFieldIdResolvedAsUndefined = false;
    const optionalFields = mapValues(OptionalFieldName, (optionalFieldName,) => {
        const configuredFieldId = fieldConfigurationIds[optionalFieldName];
        if (configuredFieldId === '') return undefined;
        const fieldOrUndefined = table.getFieldByIdIfExists(configuredFieldId) ?? undefined;
        if (!fieldOrUndefined) nonEmptyFieldIdResolvedAsUndefined = true;
        return fieldOrUndefined
    });


    return nonEmptyFieldIdResolvedAsUndefined ? {
        errorsPresent: true,
        errors: mapValues(optionalFields, (optionalFieldName, field) => field === undefined && fieldConfigurationIds[optionalFieldName] !== '' ? 'Previously enabled optional field no longer exists.' : '')
    } : {errorsPresent: false, tablesOrFields: optionalFields};
}

const validateFieldTypesAndLinks = (fieldsAndTables: ValidatedTablesAndFieldsConfiguration): { errorsPresent: true, errors: TablesAndFieldsConfigurationErrors } | { errorsPresent: false } => {
    function isField(key: string): key is RequiredFieldName | OptionalFieldName {
        return key in RequiredFieldName || key in OptionalFieldName;
    }

    let errorOccurred = false;

    const errors: TablesAndFieldsConfigurationErrors = mapValues(fieldsAndTables, (key, value) => {
        if (isField(key) && value instanceof Field) {
            if (value.type !== ExpectedAppConfigFieldTypeMapping[key]) {
                errorOccurred = true;
                return `Field must be of type ${ExpectedAppConfigFieldTypeMapping[key]}`
            }

            if (value.config.type === FieldType.MULTIPLE_RECORD_LINKS) {
                const expectedLinkedTable: TableName | undefined = fieldTypeLinks[key];
                if (expectedLinkedTable !== undefined && value.config.options.linkedTableId !== fieldsAndTables[expectedLinkedTable].id) {
                    errorOccurred = true;
                    return `Field must link to the '${fieldsAndTables[expectedLinkedTable].name}' table`
                }
            }
        }
        return '';
    });

    return errorOccurred ? {errorsPresent: true, errors} : {errorsPresent: false};
}

const checkIfRequiredIdsPresentAndAllIdsAreUnique: (configurationIds: TablesAndFieldsConfigurationIds) => { errorsPresent: true; errors: TablesAndFieldsConfigurationErrors } | { errorsPresent: false } = (configurationIds: TablesAndFieldsConfigurationIds) => {
    let errorsPresent = false;
    const potentialErrorSet: TablesAndFieldsConfigurationErrors = mapValues(configurationIds,
        (configKey, tableOrFieldId) => {
            if (configKey in combinedRequiredConfigKeys && tableOrFieldId === '' || tableOrFieldId === undefined) {
                errorsPresent = true;
                return 'This value is required.';
            }

            for (const currentKey of Object.keys(configurationIds)) {
                if (configKey === currentKey) continue;
                const currentTableOrFieldId = configurationIds[currentKey as keyof TablesAndFieldsConfigurationIds];
                if (currentTableOrFieldId !== '' && tableOrFieldId === currentTableOrFieldId) {
                    errorsPresent = true;
                    return 'Configuration values must be unique.';
                }
            }

            return '';
        });

    return errorsPresent ? {errorsPresent, errors: potentialErrorSet} : {errorsPresent: false};
}

// @ts-ignore
const validateExtensionConfiguration: (configurationIds: TablesAndFieldsConfigurationIds, base: Base) => ValidationResult = (configurationIds, base) => {
    // // Check if required fields/tables are present and unique
    // const uniqueAndRequiredIdsValidation = checkIfRequiredIdsPresentAndAllIdsAreUnique(configurationIds);
    // if (uniqueAndRequiredIdsValidation.errorsPresent) return uniqueAndRequiredIdsValidation;
    //
    // // Check if tables exist
    // const tablesOrErrors: TablesOrErrors = getTables(base, configurationIds);
    // if (tablesOrErrors.errorsPresent) {
    //     const errors = {...blankErrorState, ...tablesOrErrors.errors};
    //     return {errorsPresent: true, errors};
    // }
    //
    // // Check if required fields and optional fields (if specified) exist
    // const requiredFieldsOrErrors: RequiredFieldsOrErrors = getRequiredFields(base, tablesOrErrors.tablesOrFields.table, configurationIds);
    // const checkoutsTableOptionalFieldsOrErrors: OptionalFieldsOrErrors = getOptionalFields(base, tablesOrErrors.tablesOrFields.table, configurationIds);
    // if (requiredFieldsOrErrors.errorsPresent || checkoutsTableOptionalFieldsOrErrors.errorsPresent) {
    //     let errors = blankErrorState;
    //     errors = requiredFieldsOrErrors.errorsPresent ? {...errors, ...requiredFieldsOrErrors.errors} : errors;
    //     errors = checkoutsTableOptionalFieldsOrErrors.errorsPresent ? {...errors, ...checkoutsTableOptionalFieldsOrErrors.errors} : errors;
    //     return {errorsPresent: true, errors}
    // }
    //
    // const resolvedFieldsAndTables: ValidatedTablesAndFieldsConfiguration = {
    //     ...tablesOrErrors.tablesOrFields,
    //     ...requiredFieldsOrErrors.tablesOrFields,
    //     ...checkoutsTableOptionalFieldsOrErrors.tablesOrFields
    // };
    //
    // // Check if field types are correct and if fields are linked record fields, then check if fields link to correct tables
    // const fieldTypesAndLinksValidation = validateFieldTypesAndLinks(resolvedFieldsAndTables);
    // if (fieldTypesAndLinksValidation.errorsPresent) return fieldTypesAndLinksValidation;
    //
    // return {errorsPresent: false, configuration: resolvedFieldsAndTables};
}

export const getConfigurationValidatorForBase: (base: Base) => (configIds: TablesAndFieldsConfigurationIds) => ValidationResult = (base) => (extensionConfigurationIds: TablesAndFieldsConfigurationIds) => validateExtensionConfiguration(extensionConfigurationIds, base)