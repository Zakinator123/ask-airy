import {ExtensionConfiguration, SearchTableConfigWithDefinedSearchIndexField} from "../types/ConfigurationTypes";
import React from "react";
import {Box, loadCSSFromString, Text} from "@airtable/blocks/ui";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {Search} from "./Search";
import {RateLimiter} from "../utils/RateLimiter";
import {SemanticSearchService} from "../services/SemanticSearchService";
import {OpenAIEmbeddingService} from "../services/EmbeddingService";
import {Base} from "@airtable/blocks/models";
import {removeDeletedTablesAndFieldsFromSearchTableConfigs} from "../utils/RandomUtils";

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

const getValidatedSearchTableConfigs = (extensionConfiguration: ExtensionConfiguration | undefined):
    { noValidSearchTables: false, configs: SearchTableConfigWithDefinedSearchIndexField[] }
    | { noValidSearchTables: true, errorMessage: string } => {

    if (extensionConfiguration === undefined) {
        return {
            noValidSearchTables: true,
            errorMessage: 'You must configure the extension in the settings tab before you can use it!'
        }
    }

    const sanitizedConfigs = removeDeletedTablesAndFieldsFromSearchTableConfigs(extensionConfiguration.searchTables).searchTableConfigs;
    if (sanitizedConfigs.length === 0) {
        return {
            noValidSearchTables: true,
            errorMessage: 'No search tables are configured. Please add a search table in the settings tab.'
        }
    }

    const configsWithIndexFields: SearchTableConfigWithDefinedSearchIndexField[] = sanitizedConfigs
        .reduce((acc: SearchTableConfigWithDefinedSearchIndexField[], config) => {
            const intelliSearchIndexField = config.intelliSearchIndexFields[extensionConfiguration.currentAiProvider];
            if (intelliSearchIndexField === undefined || config.searchFields.length === 0) {
                return acc;
            }

            return [...acc, {
                table: config.table,
                searchFields: config.searchFields,
                intelliSearchIndexField: intelliSearchIndexField
            }]
        }, []);

    if (configsWithIndexFields.length === 0) {
        return {
            noValidSearchTables: true,
            errorMessage: 'No valid search tables found. Please update your search tables configuration in the settings tab.'
        }
    }

    return {noValidSearchTables: false, configs: configsWithIndexFields};
}

const SearchWrapper = ({
                           airtableMutationService,
                           extensionConfiguration,
                           isPremiumUser,
                           transactionIsProcessing,
                           setTransactionIsProcessing,
                           base
                       }:
                           {
                               airtableMutationService: AirtableMutationService,
                               extensionConfiguration: ExtensionConfiguration | undefined,
                               isPremiumUser: boolean,
                               transactionIsProcessing: boolean,
                               setTransactionIsProcessing: (processing: boolean) => void,
                               base: Base
                           }) => {

    const validatedSearchTableConfigs = getValidatedSearchTableConfigs(extensionConfiguration);

    return validatedSearchTableConfigs.noValidSearchTables
        ? <Box className='centered-container'>
            <Text>{validatedSearchTableConfigs.errorMessage}</Text>
        </Box>
        : <Search
            semanticSearchService={
                new SemanticSearchService(
                    new OpenAIEmbeddingService(extensionConfiguration!.aiProvidersConfiguration.openai.apiKey),
                    new AirtableMutationService(new RateLimiter(10, 5)))}
            searchTableConfigs={validatedSearchTableConfigs.configs}
            base={base}
        />
}

export default SearchWrapper;