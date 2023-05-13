import React, {useEffect, useState} from "react";
import {
    Box,
    Button,
    FieldIcon,
    Heading,
    Icon,
    Input,
    Link,
    loadCSSFromString,
    Loader,
    Text,
    Tooltip
} from "@airtable/blocks/ui";
import {Base} from "@airtable/blocks/models";
import {AiryTableConfig, ExtensionConfiguration,} from "../types/ConfigurationTypes";
import {Id, toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {
    asyncAirtableOperationWrapper,
    changeLoadingToastToErrorToast,
    removeDeletedTablesAndFieldsFromAiryTableConfigs
} from "../utils/RandomUtils";
import {OfflineToastMessage} from "./OfflineToastMessage";
import {useImmer} from "use-immer";
import {AiryTableConfigDialog} from "./AiryTableConfigDialog";
import {Toast} from "./Toast";
import {GlobalConfigSettingsService} from "../services/GlobalConfigSettingsService";
import {aiProviderData, defaultConfig} from "../types/Constants";
import {FormFieldLabelWithTooltip} from "./FormFieldLabelWithTooltip";

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
    align-items: center;
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
    setAiryTableConfigs: (airyTableConfigs: AiryTableConfig[]) => void
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
                    setAiryTableConfigs(extensionConfiguration.airyTableConfigs);
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
    const [aiProviderName] = useState(extensionConfiguration ? extensionConfiguration.currentAiProvider : defaultConfig.currentAiProvider);
    const [airyTableConfigs, setAiryTableConfigs] = useImmer(extensionConfiguration ? extensionConfiguration.airyTableConfigs : defaultConfig.airyTableConfigs);
    const [manualConfigurationToastId] = [{containerId: 'manual-configuration-toast'}];

    const newExtensionConfigurationToSave: ExtensionConfiguration = {
        currentAiProvider: aiProviderName,
        aiProvidersConfiguration: aiProvidersConfiguration,
        airyTableConfigs: airyTableConfigs,
    }

    const sanitizeAiryTableConfigs = removeDeletedTablesAndFieldsFromAiryTableConfigs(airyTableConfigs)
    if (sanitizeAiryTableConfigs.deletionOccurred) {
        setAiryTableConfigs(sanitizeAiryTableConfigs.airyTableConfigs);
    }

    const removeAiryTable = (airyTablesIndex: number) => {
        setAiryTableConfigs(airyTables => {
            airyTables.splice(airyTablesIndex, 1);
        });
    }


    return <>
        <Box className='settings-container'>
            <Box padding={3}
                 display='flex'
                 flexDirection='column'
                 alignItems='center'
                 maxWidth='420px'
                 width='100%'
                 className='ai-config-container'>
                <Heading marginBottom={3}>Airy AI Settings</Heading>

                {/*<SelectButtons*/}
                {/*    value={aiProviderName}*/}
                {/*    onChange={newValue => setAiProviderName(newValue as AIProviderName)}*/}
                {/*    options={*/}
                {/*        [{*/}
                {/*            value: "openai",*/}
                {/*            label: `${aiProviderData["openai"].prettyName}`*/}
                {/*        }]}*/}
                {/*/>*/}

                <Box width='100%'>

                    <FormFieldLabelWithTooltip fieldLabel={`${aiProviderData[aiProviderName].prettyName} API Key`}
                                               fieldLabelTooltip='Ask Airy uses the OpenAI API under the hood.'/>
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
                    <Text margin={1} size='small'>Sign up <Link size='small'
                                                                href='https://platform.openai.com/signup'
                                                                target='_blank'>here.</Link>
                        &nbsp;Generate an API key <Link size='small' href='https://platform.openai.com/account/api-keys'
                                                  target='_blank'>here.</Link>
                    </Text>
                </Box>

                {/*<details>*/}
                {/*    <summary>Advanced Configuration</summary>*/}
                {/*    <Box padding={3} paddingBottom={0}>*/}
                {/*        <FormField label="Embedding Model">*/}
                {/*            <Select*/}
                {/*                options={aiProviderData[aiProviderName].embeddingModelSelectOptions}*/}
                {/*                value={aiProvidersConfiguration[aiProviderName].embeddingModel}*/}
                {/*                onChange={newValue => {*/}
                {/*                    setAiProvidersConfiguration(aiProvidersConfiguration => {*/}
                {/*                        aiProvidersConfiguration[aiProviderName].embeddingModel = newValue as OpenAIEmbeddingModel;*/}
                {/*                    });*/}
                {/*                }}*/}
                {/*            />*/}
                {/*        </FormField>*/}
                {/*    </Box>*/}
                {/*</details>*/}

            </Box>

            <Box display='flex' alignItems='center' flexDirection='column' maxWidth='1000px' padding={3}>
                <Heading>Tables Accessible to Airy</Heading>

                <Box display='flex' flexWrap='wrap' justifyContent='center'>
                    {airyTableConfigs.map((airyTableConfig, index) =>
                        <Box maxWidth='350px' margin={3} border='default' key={index} padding={3} display='flex'
                             flexDirection='column'
                             justifyContent='space-between'>
                            <Box>
                                <Heading size="xsmall" display='inline'>Table: </Heading><Text
                                display='inline'>{airyTableConfig.table.name}</Text>
                            </Box>
                            <Box>
                                <Heading marginTop={3} size='xsmall'>Fields Accessible to Airy:</Heading>
                                {(airyTableConfig.fields).length !== 0 &&
                                    <Box display='flex'
                                         flexWrap='wrap'>{airyTableConfig.fields.map((airyField, index) =>
                                        <Box key={index} marginLeft={3}>
                                            <FieldIcon
                                                position='relative'
                                                top='3px'
                                                field={airyField}
                                                size={16}/> <Text display='inline-block'>{airyField.name}</Text>
                                        </Box>)}
                                    </Box>
                                }
                            </Box>

                            <Box borderBottom='solid' borderColor='lightgray' paddingBottom={4}>
                                <Heading marginTop={3} size='xsmall'>Airy Data Index Field: <Tooltip
                                    content="This field will be used to store data used by Ask Airy."
                                    placementX={Tooltip.placements.CENTER}
                                    placementY={Tooltip.placements.BOTTOM}
                                    shouldHideTooltipOnClick={true}
                                ><Icon size={12} name='info' position='relative' top='1px'/></Tooltip></Heading>
                                <Box marginLeft={3}>
                                    {(airyTableConfig.airyDataIndexFields[aiProviderName] !== undefined)
                                        ? <Text>
                                            ✅ Airy {aiProviderData[aiProviderName].prettyName} Index field created.
                                        </Text>
                                        : <Text>
                                            ⚠️ Airy {aiProviderData[aiProviderName].prettyName} Index field not yet
                                            created. <br/>
                                            Save configuration to create field.
                                        </Text>
                                    }
                                </Box>
                            </Box>
                            <Button icon='trash' marginTop={3}
                                    onClick={() => removeAiryTable(index)}>Remove</Button>
                        </Box>)}
                </Box>
                <AiryTableConfigDialog airyTableConfigs={airyTableConfigs} setAiryTableConfigs={setAiryTableConfigs}
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
                    setAiryTableConfigs,
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