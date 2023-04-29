import {
    TableAndFieldsConfigurationKey, TableName,
    TablesAndFieldsConfigurationErrors,
    TablesAndFieldsConfigurationIds,
    ValidationResult
} from "../types/ConfigurationTypes";
import {mapValues} from "./RandomUtils";
import {blankErrorState} from "./Constants";
import {SelectOptionValue} from "@airtable/blocks/dist/types/src/ui/select_and_select_buttons_helpers";
import {Field, FieldType, Table} from "@airtable/blocks/models";
import {TableId} from "@airtable/blocks/types";

export const validateFormAndGetFormValidationErrors = (formState: TablesAndFieldsConfigurationIds,
                                                       configurationValidator: (configurationData: TablesAndFieldsConfigurationIds) => ValidationResult) => {
    const validationResult = configurationValidator(formState);
    return validationResult.errorsOccurred ? validationResult.errors : blankErrorState;
}

export const getNewFormErrorStateForSelectorChange = (currentFormErrorState: Readonly<TablesAndFieldsConfigurationErrors>,
                                                      formValidationErrors: TablesAndFieldsConfigurationErrors,
                                                      fieldOrTableName: TableAndFieldsConfigurationKey) =>
    mapValues(currentFormErrorState, (key, value) => {
        // Replace values in the currentFormErrorState with values from the formValidationErrors
        // iff the formValidationErrors has no value for the key or if field/table name is the same as the key.
        if (key === fieldOrTableName) return formValidationErrors[key as TableAndFieldsConfigurationKey];
        if (formValidationErrors[key as TableAndFieldsConfigurationKey] === '') return '';
        return value;
    });

export const formErrorStateHasErrors = (formErrorState: Readonly<TablesAndFieldsConfigurationErrors>): boolean => Object.values(formErrorState).some(value => value !== '')

export const getUpdatedFormErrorStateIfStaleErrorsExist = (currentFormErrorState: Readonly<TablesAndFieldsConfigurationErrors>,
                                                           validateTablesAndFields: (configurationData: TablesAndFieldsConfigurationIds) => ValidationResult,
                                                           tablesAndFieldsFormState: Readonly<TablesAndFieldsConfigurationIds>)
    : { staleErrorsExist: boolean, newFormErrorState: TablesAndFieldsConfigurationErrors } => {
    // If currentFormErrorState has any entries with values that are not empty, call validateFormAndGetFormValidationErrors with the currentConfiguration and if there are
    // errors in the currentFormErrorState that no longer exist in the validationResult, call setFormErrorState to remove the error from the currentFormErrorState.
    // This is to handle the case where the user has corrected the error in the form and the error is no longer present in the validationResult.
    if (formErrorStateHasErrors(currentFormErrorState)) {
        const validationResult = validateTablesAndFields(tablesAndFieldsFormState);
        if (validationResult.errorsOccurred) {
            let staleErrorsExist: boolean = false;
            const newFormErrorState = mapValues(currentFormErrorState, (key, currentFormErrorValue) => {
                if (validationResult.errors[key] === '' && currentFormErrorValue !== '') {
                    staleErrorsExist = true;
                    return '';
                } else return currentFormErrorValue;
            });
            return {staleErrorsExist, newFormErrorState};
        } else {
            return {staleErrorsExist: true, newFormErrorState: blankErrorState};
        }
    }
    return {staleErrorsExist: false, newFormErrorState: currentFormErrorState};
}

export const getNewFormStateForSelectorChange = (tablesAndFieldsFormState: Readonly<TablesAndFieldsConfigurationIds>,
                                                 fieldOrTableName: TableAndFieldsConfigurationKey,
                                                 selectedOption: SelectOptionValue) => {
    let newFormState = {...tablesAndFieldsFormState, [fieldOrTableName]: selectedOption}

    // If selector is a table, then all dependent fields must be reset.
    if (fieldOrTableName in TableName) {
        const tableSchema = settingsFormSchema.schemaConfiguration
            .find(({tableName}) => tableName === fieldOrTableName);
        if (tableSchema) {
            const tableFields = [...(tableSchema?.requiredFields ?? []), ...(tableSchema?.optionalFields ?? [])];
            newFormState = {
                ...newFormState,
                ...tableFields.reduce((currentObject, field) => ({...currentObject, [field.fieldName]: ''}), {})
            }
        }
    }
    return newFormState;
};

export const getValidFieldOptionsForFieldSelector = (table: Table,
                                                     expectedFieldType: FieldType,
                                                     mustLinkTo: TableName | undefined,
                                                     formState: TablesAndFieldsConfigurationIds,
                                                     fieldIsRequired: boolean) => {
    let atLeastOneFieldSelectorOptionIsEnabled = false;

    const options = table.fields.map((field: Field) => {
        let fieldOptionDisabled: boolean;
        if (field.type !== expectedFieldType) fieldOptionDisabled = true;
        else if (mustLinkTo !== undefined && field.config.type === FieldType.MULTIPLE_RECORD_LINKS) {
            const mustLinkToTableId: TableId = formState[mustLinkTo] as TableId;
            fieldOptionDisabled = field.config.options.linkedTableId !== mustLinkToTableId;
        } else fieldOptionDisabled = false;

        if (fieldOptionDisabled === false) atLeastOneFieldSelectorOptionIsEnabled = true;
        return {
            disabled: fieldOptionDisabled,
            label: field.name,
            value: field.id
        };
    });

    const disabledOption = {
        disabled: false,
        label: 'DISABLED - Extension Will Not Use This Field',
        value: ''
    };

    const defaultEmptyFieldStateOption = {
        disabled: true,
        label: '',
        value: ''
    }

    if (atLeastOneFieldSelectorOptionIsEnabled) {
        return fieldIsRequired ? [defaultEmptyFieldStateOption, ...options] : [disabledOption, ...options];
    }

    const isLinkedField: boolean = mustLinkTo !== undefined;
    const message = (isLinkedField)
        ? `ERROR: No fields exist that link to the configured ${mustLinkTo} table`
        : `ERROR: No fields exist of type ${expectedFieldType}`;

    const errorOption = {
        disabled: true,
        label: message,
        value: undefined
    };

    return fieldIsRequired ? [defaultEmptyFieldStateOption, errorOption] : [disabledOption, errorOption];
}
