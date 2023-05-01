import React, {useEffect, useState} from "react";
import {
    Box,
    Button,
    FieldIcon,
    FormField,
    Heading,
    Input,
    loadCSSFromString,
    Loader,
    Select,
    SelectButtons,
    Text
} from "@airtable/blocks/ui";
import {Base} from "@airtable/blocks/models";
import {
    AIProviderName,
    AIProviderOptions,
    ExtensionConfiguration,
    SearchTableConfig,
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
    justify-content: center;
    background-color: white;
    padding: 1rem;
    overflow: auto;
    height: 100%;
    width: 100%;
    max-width: fit-content;
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

const defaultConfig: ExtensionConfiguration = {
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

const attemptConfigUpdateAndShowToast = (
    extensionConfiguration: ExtensionConfiguration,
    toastContainerId: { containerId: Id },
    setConfigurationUpdatePending: (pending: boolean) => void,
    validateConfigUpdateAndSaveToGlobalConfig: (extensionConfiguration: ExtensionConfiguration) => Promise<ExtensionConfigurationUpdateResult>
) => {
    setConfigurationUpdatePending(true);

    const configurationUpdateToastId = toast.loading('Attempting to save configuration..', toastContainerId);
    asyncAirtableOperationWrapper(() => validateConfigUpdateAndSaveToGlobalConfig(extensionConfiguration),
        () => toast.loading(<OfflineToastMessage/>, {autoClose: false, containerId: toastContainerId.containerId}))
        .then((configurationUpdateResult) => {
            if (configurationUpdateResult.errorsOccurred) {
                changeLoadingToastToErrorToast(configurationUpdateResult.errorMessage, configurationUpdateToastId, toastContainerId);
                // setFormErrorState(configurationUpdateResult.tablesAndFieldsConfigurationErrors);
            } else {
                toast.update(configurationUpdateToastId, {
                    render: 'Configuration saved successfully!',
                    type: 'success',
                    isLoading: false,
                    containerId: toastContainerId.containerId,
                    closeButton: true,
                    autoClose: 4000,
                });
                // setFormErrorState(blankErrorState);
            }
        })
        .catch(() => changeLoadingToastToErrorToast('An unexpected error occurred', configurationUpdateToastId, toastContainerId))
        .finally(() => setConfigurationUpdatePending(false));
};

export const Settings = ({
                             base,
                             extensionConfiguration,
                             validateConfigUpdateAndSaveToGlobalConfig,
                             configurationUpdatePending,
                             setConfigurationUpdatePending
                         }:
                             {
                                 base: Base,
                                 extensionConfiguration?: ExtensionConfiguration,
                                 validateConfigUpdateAndSaveToGlobalConfig: (extensionConfiguration: ExtensionConfiguration) => Promise<ExtensionConfigurationUpdateResult>,
                                 configurationUpdatePending: boolean,
                                 setConfigurationUpdatePending: (pending: boolean) => void
                             }) => {
    useEffect(() => () => toast.dismiss(), []);

    const [aiProvidersConfiguration, setAiProvidersConfiguration] = useImmer(extensionConfiguration ? extensionConfiguration.aiProvidersConfiguration : defaultConfig.aiProvidersConfiguration);
    const [aiProviderName, setAiProviderName] = useState(extensionConfiguration ? extensionConfiguration.currentAiProvider : defaultConfig.currentAiProvider);
    const [searchTables, setSearchTables] = useImmer(extensionConfiguration ? extensionConfiguration.searchTables : defaultConfig.searchTables);
    const [manualConfigurationToastId] = [{containerId: 'manual-configuration-toast'}];

    const newExtensionConfigurationToSave: ExtensionConfiguration = {
        currentAiProvider: aiProviderName,
        aiProvidersConfiguration: aiProvidersConfiguration,
        searchTables: searchTables,
    }

    const getSanitizedSearchTableConfigs = (): { deletionOccurred: true, newSearchTableConfigs: SearchTableConfig[] } | { deletionOccurred: false } => {
        let deletionOccurred = false;
        const newSearchTableConfigs = searchTables
            .filter(searchTable => {
                if (searchTable.table.isDeleted) {
                    deletionOccurred = true;
                    return false;
                }
                return true;
            })
            .map(searchTable => {
                const newSearchFields = searchTable.searchFields.filter(searchField => {
                    if (searchField.isDeleted) {
                        deletionOccurred = true;
                        return false;
                    }
                    return true;
                });

                const newIntelliSearchIndexFields: Partial<typeof searchTable.intelliSearchIndexFields> = {};
                for (const [aiProviderName, indexField] of Object.entries(searchTable.intelliSearchIndexFields)) {
                    if (indexField !== undefined && indexField.isDeleted) {
                        deletionOccurred = true;
                        newIntelliSearchIndexFields[aiProviderName as AIProviderName] = undefined;
                    } else {
                        newIntelliSearchIndexFields[aiProviderName as AIProviderName] = indexField;
                    }
                }

                return {
                    ...searchTable,
                    searchFields: newSearchFields,
                    intelliSearchIndexFields: newIntelliSearchIndexFields
                };
            });

        if (deletionOccurred) {
            return {deletionOccurred: true, newSearchTableConfigs: newSearchTableConfigs};
        }
        return {deletionOccurred: false};
    };

    const sanitizeSearchTableConfigs = getSanitizedSearchTableConfigs()
    if (sanitizeSearchTableConfigs.deletionOccurred) {
        setSearchTables(sanitizeSearchTableConfigs.newSearchTableConfigs);
    }

    const removeSearchTable = (searchTablesIndex: number) => {
        setSearchTables(searchTables => {
            searchTables.splice(searchTablesIndex, 1);
        });
    }

    return <>
        <Box className='settings-container'>
            <Box border='default' padding={3} className='ai-config-container'>
                <FormField label="Select Your AI Provider">
                    <SelectButtons
                        value={aiProviderName}
                        onChange={newValue => setAiProviderName(newValue as AIProviderName)}
                        options={
                            [{
                                value: "openai",
                                label: `${aiProviderData["openai"].prettyName}`
                            }, {
                                value: "cohere",
                                label: `${aiProviderData["cohere"].prettyName}`
                            }]}
                    />
                </FormField>
                <FormField label={`${aiProviderData[aiProviderName].prettyName} API Key`}>
                    <Input
                        placeholder={`Enter your ${aiProviderData[aiProviderName].prettyName} API key`}
                        type='text'
                        required={true}
                        value={aiProvidersConfiguration[aiProviderName].apiKey}
                        onChange={e => {
                            const newValue = e.target.value;
                            setAiProvidersConfiguration(aiProvidersConfiguration => {
                                aiProvidersConfiguration[aiProviderName].apiKey = newValue;
                            });
                        }}
                    />
                </FormField>
                <details>
                    <summary>Advanced Configuration</summary>
                    <Box padding={3} paddingBottom={0}>
                        <FormField label="Embedding Model">
                            <Select
                                options={aiProviderData[aiProviderName].embeddingModelSelectOptions}
                                value={aiProvidersConfiguration[aiProviderName].embeddingModel}
                                onChange={newValue => {
                                    setAiProvidersConfiguration(aiProvidersConfiguration => {
                                        aiProvidersConfiguration[aiProviderName].embeddingModel = newValue as string
                                    });
                                }}
                            />
                        </FormField>
                    </Box>
                </details>
            </Box>

            <Box maxWidth='1000px' marginTop={4} border='default' padding={4}>
                <Heading size='small'>Searchable Tables</Heading>

                <Box display='flex' flexWrap='wrap'>
                    {searchTables.map((searchTableConfig, index) =>
                        <Box margin={3} border='default' key={index} padding={3} display='flex'
                             flexDirection='column'
                             justifyContent='space-between'>
                            <Box>
                                <Heading size="xsmall" display='inline'>Table: </Heading><Text
                                display='inline'>{searchTableConfig.table.name}</Text>
                            </Box>
                            <Box>
                                <Heading marginTop={3} size='xsmall'>Searchable Fields:</Heading>
                                {(searchTableConfig.searchFields).length !== 0 &&
                                    searchTableConfig.searchFields.map((searchField, index) =>
                                        <Box marginLeft={3}><FieldIcon position='relative' top='3px'
                                                                       field={searchField}
                                                                       size={16}/> <Text
                                            display='inline-block'>{searchField.name}</Text></Box>)
                                }
                            </Box>
                            <Button icon='trash' marginTop={3}
                                    onClick={() => removeSearchTable(index)}>Remove</Button>
                        </Box>)}
                </Box>
                <SearchTablePicker searchTables={searchTables} setSearchTables={setSearchTables} base={base}/>
            </Box>


            <Button
                maxWidth='200px'
                marginTop={4}
                disabled={configurationUpdatePending} variant='primary'
                onClick={() => attemptConfigUpdateAndShowToast(newExtensionConfigurationToSave, manualConfigurationToastId,
                    setConfigurationUpdatePending,
                    validateConfigUpdateAndSaveToGlobalConfig
                )}>
                {configurationUpdatePending
                    ? <Loader scale={0.2} fillColor='white'/>
                    : <Text textColor='white'>Save Configuration</Text>
                }
            </Button>

            <Toast {...manualConfigurationToastId} styles={{marginTop: '0'}}/>
        </Box>
    </>
}