import {ExtensionConfiguration, AiryTableConfigWithDefinedDataIndexField} from "../types/ConfigurationTypes";
import React from "react";
import {Box, loadCSSFromString, Text} from "@airtable/blocks/ui";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {AskAiry} from "./AskAiry";
import {AskAiryService} from "../services/AskAiryService";
import {OpenAIService} from "../services/OpenAIService";
import {Base} from "@airtable/blocks/models";
import {removeDeletedTablesAndFieldsFromAiryTableConfigs} from "../utils/RandomUtils";
import {RequestRateLimiter} from "../utils/RequestRateLimiter";

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
    { noValidAiryTables: false, configs: AiryTableConfigWithDefinedDataIndexField[] }
    | { noValidAiryTables: true, errorMessage: string } => {

    if (extensionConfiguration === undefined) {
        return {
            noValidAiryTables: true,
            errorMessage: 'You must configure the extension in the settings tab before you can use it!'
        }
    }

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

    return {noValidAiryTables: false, configs: configsWithIndexFields};
}

const AskAiryWrapper = ({
                           airtableMutationService,
                           extensionConfiguration,
                           isPremiumUser,
                           askAiryIsPending,
                           setAskAiryIsPending,
                           base
                       }:
                           {
                               airtableMutationService: AirtableMutationService,
                               extensionConfiguration: ExtensionConfiguration | undefined,
                               isPremiumUser: boolean,
                               askAiryIsPending: boolean,
                               setAskAiryIsPending: (pending: boolean) => void,
                               base: Base
                           }) => {

    const validatedAiryTableConfigs = getValidatedAiryTableConfigs(extensionConfiguration);

    return validatedAiryTableConfigs.noValidAiryTables
        ? <Box className='centered-container'>
            <Text>{validatedAiryTableConfigs.errorMessage}</Text>
        </Box>
        : <AskAiry
            askAiIsPending={askAiryIsPending}
            setAskAiIsPending={setAskAiryIsPending}
            askAiService={
                new AskAiryService(
                    new OpenAIService(extensionConfiguration!.aiProvidersConfiguration.openai.apiKey,
                        extensionConfiguration!.aiProvidersConfiguration.openai.embeddingModel,
                        2800,
                        220000),
                    new AirtableMutationService(new RequestRateLimiter(10, 5)))}
            airyTableConfigs={validatedAiryTableConfigs.configs}
            base={base}
        />
}

export default AskAiryWrapper;