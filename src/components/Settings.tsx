import React, {useEffect, useState} from "react";
import {
    Box,
    FieldIcon,
    FormField,
    Heading,
    Input,
    loadCSSFromString,
    Select,
    SelectButtons,
    Text
} from "@airtable/blocks/ui";
import {Base, Field, Table} from "@airtable/blocks/models";
import {blankErrorState} from "../utils/Constants";
import {
    ExtensionConfiguration,
    OtherExtensionConfiguration,
    TablesAndFieldsConfigurationErrors,
    TablesAndFieldsConfigurationIds,
    ValidationResult
} from "../types/ConfigurationTypes";
import {Id, toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {asyncAirtableOperationWrapper, changeLoadingToastToErrorToast} from "../utils/RandomUtils";
import {OfflineToastMessage} from "./OfflineToastMessage";
import {ExtensionConfigurationUpdateResult} from "../types/OtherTypes";
import {useImmer} from "use-immer";
import {SearchTablePicker} from "./SearchTablePicker";
import {Toast} from "./Toast";

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
    max-width: 400px;
    width: 100%;
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

type AiProvidersConfiguration = Record<AIProviderName, {
    apiKey: string,
    embeddingModel: string,
    otherSettings: {},
}>

type AIProviderName = string;


type NewExtensionConfiguration = {
    currentAiProvider: AIProviderName,
    aiProvidersConfiguration: AiProvidersConfiguration
    searchTables: SearchTableConfig[],
}

export type SearchTableConfig = {
    table: Table,
    searchFields: Field[],
}

const defaultConfig: NewExtensionConfiguration = {
    currentAiProvider: 'openai',
    aiProvidersConfiguration: {
        openai: {
            apiKey: '',
            embeddingModel: 'text-embedding-ada-002',
            otherSettings: {},
        },
        cohere: {
            apiKey: '',
            embeddingModel: 'large',
            otherSettings: {},
        }
    },
    searchTables: [],
}
type AIProviderOptions = {
    prettyName: string,
    embeddingModelSelectOptions: { value: string, label: string }[],
}

const aiProviderData: Record<AIProviderName, AIProviderOptions> = {
    openai: {
        prettyName: 'OpenAI',
        embeddingModelSelectOptions: [{value: 'text-embedding-ada-002', label: 'text-embedding-ada-002'}]
    },
    cohere: {
        prettyName: 'Cohere',
        embeddingModelSelectOptions: [{value: 'large', label: 'large'}, {
            value: 'small',
            label: 'small'
        }, {value: 'multilingual-22-12', label: 'multilingual-22-12'}]
    },
}

export const Settings = ({
                             currentTableAndFieldIds,
                             currentOtherConfiguration,
                             base,
                             validateTablesAndFields,
                             newExtensionConfiguration,
                             validateConfigUpdateAndSaveToGlobalConfig,
                             configurationUpdatePending,
                             setConfigurationUpdatePending
                         }:
                             {
                                 currentTableAndFieldIds: TablesAndFieldsConfigurationIds | undefined,
                                 currentOtherConfiguration: OtherExtensionConfiguration | undefined,
                                 base: Base,
                                 validateTablesAndFields: (configurationData: TablesAndFieldsConfigurationIds) => ValidationResult,
                                 newExtensionConfiguration?: NewExtensionConfiguration,
                                 validateConfigUpdateAndSaveToGlobalConfig: (extensionConfiguration: ExtensionConfiguration) => Promise<ExtensionConfigurationUpdateResult>,
                                 configurationUpdatePending: boolean,
                                 setConfigurationUpdatePending: (pending: boolean) => void
                             }) => {
    useEffect(() => () => toast.dismiss(), []);

    const [aiProvidersConfiguration, setAiProvidersConfiguration] = useImmer(newExtensionConfiguration ? newExtensionConfiguration.aiProvidersConfiguration : defaultConfig.aiProvidersConfiguration);
    const [searchTables, setSearchTables] = useImmer(newExtensionConfiguration ? newExtensionConfiguration.searchTables : defaultConfig.searchTables);
    const [aiProviderName, setAiProviderName] = useState(newExtensionConfiguration ? newExtensionConfiguration.currentAiProvider : defaultConfig.currentAiProvider);
    const [manualConfigurationToastId] = [{containerId: 'manual-configuration-toast'}];

    console.log(searchTables);


    const getFieldNamesForSearchTableConfig = (searchTableConfig: SearchTableConfig) => {
        console.log(searchTableConfig.searchFields);
        return searchTableConfig.searchFields.map((field) => field.name);
    }

    return <>
        <Box className='settings-container'>
            <FormField label="Select Your AI Provider">
                <SelectButtons
                    value={aiProviderName}
                    onChange={newValue => setAiProviderName(newValue as string)}
                    options={[{value: "openai", label: `${aiProviderData["openai"]!.prettyName}`}, {
                        value: "cohere",
                        label: `${aiProviderData["cohere"]!.prettyName}`
                    }]}
                />
            </FormField>
            <FormField label={`${aiProviderData[aiProviderName]!.prettyName} API Key`}>
                <Input
                    placeholder={`Enter your ${aiProviderData[aiProviderName]!.prettyName} API key.`}
                    type='text'
                    value={aiProvidersConfiguration[aiProviderName]!.apiKey}
                    onChange={e => {
                        const newValue = e.target.value;
                        setAiProvidersConfiguration(aiProvidersConfiguration => {
                            aiProvidersConfiguration[aiProviderName]!.apiKey = newValue;
                        });
                    }}
                />
            </FormField>
            <FormField label="Embedding Model">
                <Select
                    options={aiProviderData[aiProviderName]!.embeddingModelSelectOptions}
                    value={aiProvidersConfiguration[aiProviderName]!.embeddingModel}
                    onChange={newValue => {
                        setAiProvidersConfiguration(aiProvidersConfiguration => {
                            aiProvidersConfiguration[aiProviderName]!.embeddingModel = newValue as string
                        });
                    }}
                />
            </FormField>

            <Box>
                <Heading size='small'>Search Tables</Heading>
                {searchTables.map((searchTableConfig, index) =>
                    <Box key={index}>
                        <Text>{searchTableConfig.table.name}</Text>
                        {(searchTableConfig.searchFields).length !== 0 &&
                            <ol>
                                {searchTableConfig.searchFields.map((searchField, index) =>
                                    <li key={index}><FieldIcon position='relative' top='3px' field={searchField} size={16}/> <Text display='inline-block'>{searchField.name}</Text></li>)}
                            </ol>}
                    </Box>)}
            </Box>

            <SearchTablePicker setSearchTables={setSearchTables} base={base}/>

            {/*<Button disabled={configurationUpdatePending} variant='primary'*/}
            {/*        onClick={() => attemptConfigUpdateAndShowToast({*/}
            {/*                tableAndFieldIds: tablesAndFieldsFormState,*/}
            {/*                otherConfiguration: otherConfigurationFormState*/}
            {/*            }, manualConfigurationToastId,*/}
            {/*            setConfigurationUpdatePending,*/}
            {/*            setFormErrorState,*/}
            {/*            validateConfigUpdateAndSaveToGlobalConfig*/}
            {/*        )}>*/}
            {/*    {configurationUpdatePending*/}
            {/*        ? <Loader scale={0.2} fillColor='white'/>*/}
            {/*        : <Text textColor='white'>Save Configuration</Text>*/}
            {/*    }*/}
            {/*</Button>*/}
            <Toast {...manualConfigurationToastId} styles={{marginTop: '0'}}/>
        </Box>
    </>
}