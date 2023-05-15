import {AiryTableConfigWithDefinedDataIndexField, ExtensionConfiguration} from "../types/ConfigurationTypes";
import React from "react";
import {Box, loadCSSFromString, Text} from "@airtable/blocks/ui";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {AskAiry} from "./AskAiry";
import {AskAiryService} from "../services/AskAiryService";
import {OpenAIService} from "../services/OpenAIService";
import {Base} from "@airtable/blocks/models";
import {removeDeletedTablesAndFieldsFromAiryTableConfigs} from "../utils/RandomUtils";
import {AIService} from "../types/CoreTypes";

loadCSSFromString(`
.centered-container {
    display: flex;
    align-content: center;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    padding: 2rem;
    gap: 1rem;
}

@media (min-width: 515px) {
    .centered-container {
        padding: 5rem;
        gap: 1rem;
    }
}
`);

const getValidatedAiryTableConfigs = (extensionConfiguration: ExtensionConfiguration | undefined):
    { noValidAiryTables: false, configs: AiryTableConfigWithDefinedDataIndexField[], aiService: AIService }
    | { noValidAiryTables: true, errorMessage: string } => {

    if (extensionConfiguration === undefined) {
        return {
            noValidAiryTables: true,
            errorMessage: 'Configure the extension in the settings tab to use Ask Airy!'
        }
    }

    const aiService = new OpenAIService(
        extensionConfiguration.aiProvidersConfiguration.openai.apiKey,
        extensionConfiguration.aiProvidersConfiguration.openai.embeddingModel,
        3,
        140000)

    const sanitizedConfigs = removeDeletedTablesAndFieldsFromAiryTableConfigs(extensionConfiguration.airyTableConfigs).airyTableConfigs;
    if (sanitizedConfigs.length === 0) {
        return {
            noValidAiryTables: true,
            errorMessage: 'No tables are configured. Please add a table in the settings tab.'
        }
    }

    const configsWithIndexFields: AiryTableConfigWithDefinedDataIndexField[] = sanitizedConfigs
        .reduce((acc: AiryTableConfigWithDefinedDataIndexField[], config) => {
            const airyDataIndexField = config.airyDataIndexFields[extensionConfiguration.currentAiProvider];
            if (airyDataIndexField === undefined || config.fields.length === 0) {
                return acc;
            }

            return [...acc, {
                table: config.table,
                airyFields: config.fields,
                dataIndexField: airyDataIndexField
            }]
        }, []);

    if (configsWithIndexFields.length === 0) {
        return {
            noValidAiryTables: true,
            errorMessage: 'No valid tables found. Please update your tables configuration in the settings tab.'
        }
    }

    return {noValidAiryTables: false, configs: configsWithIndexFields, aiService: aiService};
}

const AskAiryWrapper = ({
                            airtableMutationService,
                            extensionConfiguration,
                            isLicensedUser,
                            askAiryIsPending,
                            setAskAiryIsPending,
                            base
                        }:
                            {
                                airtableMutationService: AirtableMutationService,
                                extensionConfiguration: ExtensionConfiguration | undefined,
                                isLicensedUser: boolean,
                                askAiryIsPending: boolean,
                                setAskAiryIsPending: (pending: boolean) => void,
                                base: Base
                            }) => {

    const validatedAiryTableConfigs = getValidatedAiryTableConfigs(extensionConfiguration);

    return validatedAiryTableConfigs.noValidAiryTables
        ? <Box className='centered-container'>
            <Text size='large'>{validatedAiryTableConfigs.errorMessage}</Text>
        </Box>
        : <AskAiry
            isLicensedUser={isLicensedUser}
            askAiryIsPending={askAiryIsPending}
            setAskAiryIsPending={setAskAiryIsPending}
            askAiryService={new AskAiryService(validatedAiryTableConfigs.aiService, airtableMutationService)}
            airyTableConfigs={validatedAiryTableConfigs.configs}
            base={base}
        />
}

export default AskAiryWrapper;