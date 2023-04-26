import React, {useEffect, useState} from "react";
import {Box, Button, loadCSSFromString, Loader, Text} from "@airtable/blocks/ui";
import {Base} from "@airtable/blocks/models";
import {blankConfigurationState, blankErrorState, defaultOtherConfigurationState} from "../utils/Constants";
import {
    ExtensionConfiguration,
    OtherExtensionConfiguration,
    TableAndFieldsConfigurationKey,
    TablesAndFieldsConfigurationErrors,
    TablesAndFieldsConfigurationIds,
    ValidationResult
} from "../types/ConfigurationTypes";
import {SelectOptionValue} from "@airtable/blocks/dist/types/src/ui/select_and_select_buttons_helpers";
import {Id, toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {
    getNewFormErrorStateForSelectorChange,
    getNewFormStateForSelectorChange,
    getUpdatedFormErrorStateIfStaleErrorsExist,
    validateFormAndGetFormValidationErrors
} from "../utils/SettingsFormUtils";
import {asyncAirtableOperationWrapper, changeLoadingToastToErrorToast} from "../utils/RandomUtils";
import {OfflineToastMessage} from "./OfflineToastMessage";
import {Toast} from "./Toast";
import {ExtensionConfigurationUpdateResult} from "../types/OtherTypes";

loadCSSFromString(`
.settings-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: white;
    padding: 1rem;
    overflow: auto;
    height: 100%;
    max-width: 800px;
}

.intro-settings-text {
    margin: 0 0 1rem 0;
}

.table-fields: {
    display: flex;
    flex-direction: column;
}

@media only screen and (min-width: 600px) {
    .table-fields {
        display: flex;
        flex-direction: row;
    }
}

.config-container {
    padding: 1.5rem 0 1.5rem 0;
}

@media only screen and (min-width: 515px) {
    .config-container {
        padding: 1.5rem;
    }
    
    .intro-settings-text {
        margin: 1rem;
    }
}
`)

const attemptConfigUpdateAndShowToast = (
    extensionConfiguration: ExtensionConfiguration,
    toastContainerId: { containerId: Id },
    setConfigurationUpdatePending: (pending: boolean) => void,
    setFormErrorState: (formErrorState: TablesAndFieldsConfigurationErrors) => void,
    validateConfigUpdateAndSaveToGlobalConfig: (extensionConfiguration: ExtensionConfiguration) => Promise<ExtensionConfigurationUpdateResult>
) => {
    setConfigurationUpdatePending(true);

    const configurationUpdateToastId = toast.loading('Attempting to save configuration..', toastContainerId);
    asyncAirtableOperationWrapper(() => validateConfigUpdateAndSaveToGlobalConfig(extensionConfiguration),
        () => toast.loading(<OfflineToastMessage/>, {autoClose: false, containerId: toastContainerId.containerId}))
        .then((configurationUpdateResult) => {
            if (configurationUpdateResult.errorsOccurred) {
                changeLoadingToastToErrorToast(configurationUpdateResult.errorMessage, configurationUpdateToastId, toastContainerId);
                setFormErrorState(configurationUpdateResult.tablesAndFieldsConfigurationErrors);
            } else {
                toast.update(configurationUpdateToastId, {
                    render: 'Configuration saved successfully!',
                    type: 'success',
                    isLoading: false,
                    containerId: toastContainerId.containerId,
                    closeButton: true,
                    autoClose: 4000,
                });
                setFormErrorState(blankErrorState);
            }
        })
        .catch(() => changeLoadingToastToErrorToast('An unexpected error occurred', configurationUpdateToastId, toastContainerId))
        .finally(() => setConfigurationUpdatePending(false));
};

export const Settings = ({
                             currentTableAndFieldIds,
                             currentOtherConfiguration,
                             base,
                             validateTablesAndFields,
                             validateConfigUpdateAndSaveToGlobalConfig,
                             configurationUpdatePending,
                             setConfigurationUpdatePending
                         }:
                             {
                                 currentTableAndFieldIds: TablesAndFieldsConfigurationIds | undefined,
                                 currentOtherConfiguration: OtherExtensionConfiguration | undefined,
                                 base: Base,
                                 validateTablesAndFields: (configurationData: TablesAndFieldsConfigurationIds) => ValidationResult,
                                 validateConfigUpdateAndSaveToGlobalConfig: (extensionConfiguration: ExtensionConfiguration) => Promise<ExtensionConfigurationUpdateResult>,
                                 configurationUpdatePending: boolean,
                                 setConfigurationUpdatePending: (pending: boolean) => void
                             }) => {
    useEffect(() => () => toast.dismiss(), []);

    const [tablesAndFieldsFormState, setTablesAndFieldsFormState] = useState(currentTableAndFieldIds === undefined ? blankConfigurationState : currentTableAndFieldIds);
    const [tablesAndFieldsFormErrorState, setFormErrorState] = useState(currentTableAndFieldIds === undefined ? blankErrorState : () => validateFormAndGetFormValidationErrors(currentTableAndFieldIds, validateTablesAndFields));
    const [otherConfigurationFormState, setOtherConfigurationFormState] = useState(currentOtherConfiguration === undefined ? defaultOtherConfigurationState : currentOtherConfiguration);

    const [manualConfigurationToastId] = [{containerId: 'manual-configuration-toast'}];

    const result = getUpdatedFormErrorStateIfStaleErrorsExist(tablesAndFieldsFormErrorState, validateTablesAndFields, tablesAndFieldsFormState)
    if (result.staleErrorsExist) setFormErrorState(result.newFormErrorState);

    const selectorChangeHandler = (fieldOrTableName: TableAndFieldsConfigurationKey, selectedOption: SelectOptionValue) => {
        let newFormState = getNewFormStateForSelectorChange(tablesAndFieldsFormState, fieldOrTableName, selectedOption);
        setTablesAndFieldsFormState(newFormState)
        const newFormValidationErrors = validateFormAndGetFormValidationErrors(newFormState, validateTablesAndFields);
        const newFormErrorState = getNewFormErrorStateForSelectorChange(tablesAndFieldsFormErrorState, newFormValidationErrors, fieldOrTableName);
        setFormErrorState(newFormErrorState)
    }
    return <>
        <Box className='settings-container'>
            <Box display='flex' justifyContent='center'>
                <Button disabled={configurationUpdatePending} variant='primary'
                        onClick={() => attemptConfigUpdateAndShowToast({
                                tableAndFieldIds: tablesAndFieldsFormState,
                                otherConfiguration: otherConfigurationFormState
                            }, manualConfigurationToastId,
                            setConfigurationUpdatePending,
                            setFormErrorState,
                            validateConfigUpdateAndSaveToGlobalConfig
                        )}>
                    {configurationUpdatePending
                        ? <Loader scale={0.2} fillColor='white'/>
                        : <Text textColor='white'>Save Configuration</Text>
                    }
                </Button>
            </Box>
            <Toast {...manualConfigurationToastId} styles={{marginTop: '0'}}/>
        </Box>
    </>
}