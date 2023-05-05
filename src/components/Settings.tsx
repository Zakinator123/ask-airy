import React, {useEffect, useState} from "react";
import {
    Box,
    Button,
    FieldIcon,
    FormField,
    Heading,
    Icon,
    Input,
    loadCSSFromString,
    Loader,
    Select,
    SelectButtons,
    Text,
    Tooltip
} from "@airtable/blocks/ui";
import {Base} from "@airtable/blocks/models";
import {
    AIProviderName,
    AIProviderOptions,
    ExtensionConfiguration, OpenAIEmbeddingModel,
    SearchTableConfig,
} from "../types/ConfigurationTypes";
import {Id, toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {
    asyncAirtableOperationWrapper,
    changeLoadingToastToErrorToast,
    removeDeletedTablesAndFieldsFromSearchTableConfigs
} from "../utils/RandomUtils";
import {OfflineToastMessage} from "./OfflineToastMessage";
import {useImmer} from "use-immer";
import {SearchTablePicker} from "./SearchTablePicker";
import {Toast} from "./Toast";
import {GlobalConfigSettingsService} from "../services/GlobalConfigSettingsService";
import {aiProviderData, defaultConfig} from "../types/Constants";

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

const attemptConfigUpdateAndShowToast = (
    extensionConfiguration: ExtensionConfiguration,
    toastContainerId: { containerId: Id },
    setConfigurationUpdatePending: (pending: boolean) => void,
    globalConfigSettingsService: GlobalConfigSettingsService,
    setSearchTableConfigs: (searchTableConfigs: SearchTableConfig[]) => void
) => {
    setConfigurationUpdatePending(true);

    const configurationUpdateToastId = toast.loading('Attempting to save configuration..', toastContainerId);
    asyncAirtableOperationWrapper(() => globalConfigSettingsService.validateExtensionConfigUpdateAndSaveToGlobalConfig(extensionConfiguration),
        () => toast.loading(<OfflineToastMessage/>, {autoClose: false, containerId: toastContainerId.containerId}))
        .then((configurationUpdateResult) => {
            if (configurationUpdateResult.errorsOccurred) {
                changeLoadingToastToErrorToast(configurationUpdateResult.errorMessage, configurationUpdateToastId, toastContainerId);
            } else {

                const extensionConfiguration = globalConfigSettingsService.getExtensionConfigurationFromGlobalConfig();
                if (extensionConfiguration) {
                    setSearchTableConfigs(extensionConfiguration.searchTables);
                }

                toast.update(configurationUpdateToastId, {
                    render: 'Configuration saved successfully!',
                    type: 'success',
                    isLoading: false,
                    containerId: toastContainerId.containerId,
                    closeButton: true,
                    autoClose: 4000,
                });
            }
        })
        .catch(() => changeLoadingToastToErrorToast('An unexpected error occurred', configurationUpdateToastId, toastContainerId))
        .finally(() => setConfigurationUpdatePending(false));
};

export const Settings = ({
                             base,
                             extensionConfiguration,
                             globalConfigSettingsService,
                             configurationUpdatePending,
                             setConfigurationUpdatePending
                         }:
                             {
                                 base: Base,
                                 extensionConfiguration?: ExtensionConfiguration,
                                 globalConfigSettingsService: GlobalConfigSettingsService
                                 configurationUpdatePending: boolean,
                                 setConfigurationUpdatePending: (pending: boolean) => void
                             }) => {
    useEffect(() => () => toast.dismiss(), []);

    const [aiProvidersConfiguration, setAiProvidersConfiguration] = useImmer(extensionConfiguration ? extensionConfiguration.aiProvidersConfiguration : defaultConfig.aiProvidersConfiguration);
    const [aiProviderName, setAiProviderName] = useState(extensionConfiguration ? extensionConfiguration.currentAiProvider : defaultConfig.currentAiProvider);
    const [searchTableConfigs, setSearchTableConfigs] = useImmer(extensionConfiguration ? extensionConfiguration.searchTables : defaultConfig.searchTables);
    const [manualConfigurationToastId] = [{containerId: 'manual-configuration-toast'}];

    const newExtensionConfigurationToSave: ExtensionConfiguration = {
        currentAiProvider: aiProviderName,
        aiProvidersConfiguration: aiProvidersConfiguration,
        searchTables: searchTableConfigs,
    }

    const sanitizeSearchTableConfigs = removeDeletedTablesAndFieldsFromSearchTableConfigs(searchTableConfigs)
    if (sanitizeSearchTableConfigs.deletionOccurred) {
        setSearchTableConfigs(sanitizeSearchTableConfigs.searchTableConfigs);
    }

    const removeSearchTable = (searchTablesIndex: number) => {
        setSearchTableConfigs(searchTables => {
            searchTables.splice(searchTablesIndex, 1);
        });
    }

    return <>
        <Box className='settings-container'>
            <Box padding={3} display='flex' flexDirection='column' alignItems='center' maxWidth='500px ' className='ai-config-container'>
                <Heading size='small' marginBottom={3}>AI Configuration</Heading>

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
                                        aiProvidersConfiguration[aiProviderName].embeddingModel = newValue as OpenAIEmbeddingModel;
                                    });
                                }}
                            />
                        </FormField>
                    </Box>
                </details>
            </Box>

            <Box display='flex' alignItems='center' flexDirection='column' maxWidth='1000px' marginTop={4} padding={3}>
                <Heading size='small'>Searchable Tables</Heading>

                <Box display='flex' flexWrap='wrap' justifyContent='center'>
                    {searchTableConfigs.map((searchTableConfig, index) =>
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
                                        <Box key={index} marginLeft={3}>
                                            <FieldIcon
                                                position='relative'
                                                top='3px'
                                                field={searchField}
                                                size={16}/> <Text display='inline-block'>{searchField.name}</Text>
                                        </Box>)
                                }
                            </Box>

                            <Box borderBottom='solid' borderColor='lightgray' paddingBottom={4}>
                                <Heading marginTop={3} size='xsmall'>IntelliSearch Index Field: <Tooltip
                                    content="This field will be used to store AI-generated search data."
                                    placementX={Tooltip.placements.CENTER}
                                    placementY={Tooltip.placements.BOTTOM}
                                    shouldHideTooltipOnClick={true}
                                ><Icon size={12} name='info' position='relative' top='1px'/></Tooltip></Heading>
                                <Box marginLeft={3}>
                                    {(searchTableConfig.intelliSearchIndexFields[aiProviderName] !== undefined)
                                        ? <Text>
                                            ✅ {aiProviderData[aiProviderName].prettyName} Index field created.
                                        </Text>
                                        : <Text>
                                            ⚠️ {aiProviderData[aiProviderName].prettyName} Index field not yet
                                            created. <br/>
                                            Save configuration to create field.
                                        </Text>
                                    }
                                </Box>
                            </Box>
                            <Button icon='trash' marginTop={3}
                                    onClick={() => removeSearchTable(index)}>Remove</Button>
                        </Box>)}
                </Box>
                <SearchTablePicker searchTables={searchTableConfigs} setSearchTables={setSearchTableConfigs}
                                   base={base}/>
            </Box>


            <Button
                size='large'
                maxWidth='200px'
                margin='auto'
                marginBottom={4}
                disabled={configurationUpdatePending} variant='primary'
                onClick={() => attemptConfigUpdateAndShowToast(newExtensionConfigurationToSave, manualConfigurationToastId,
                    setConfigurationUpdatePending,
                    globalConfigSettingsService,
                    setSearchTableConfigs,
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