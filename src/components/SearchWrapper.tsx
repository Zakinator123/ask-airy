import {ExtensionConfiguration, TablesAndFieldsConfigurationIds, ValidationResult} from "../types/ConfigurationTypes";
import React from "react";
import {Box, loadCSSFromString, Text} from "@airtable/blocks/ui";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {Search} from "./Search";
import {RateLimiter} from "../utils/RateLimiter";
import {SemanticSearchService} from "../services/SemanticSearchService";
import {OpenAIEmbeddingService} from "../services/EmbeddingService";

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

const SearchWrapper = ({
                           airtableMutationService,
                           extensionConfiguration,
                           configurationValidator,
                           isPremiumUser,
                           transactionIsProcessing,
                           setTransactionIsProcessing
                       }:
                           {
                               airtableMutationService: AirtableMutationService,
                               extensionConfiguration: ExtensionConfiguration | undefined,
                               configurationValidator: (configIds: TablesAndFieldsConfigurationIds) => ValidationResult,
                               isPremiumUser: boolean,
                               transactionIsProcessing: boolean,
                               setTransactionIsProcessing: (processing: boolean) => void
                           }) => {

    if (extensionConfiguration === undefined) {
        return <Box className='centered-container'>
            <Search
                semanticSearchService={
                new SemanticSearchService(
                    new OpenAIEmbeddingService('test'),
                    new AirtableMutationService(new RateLimiter(10, 5)))}/>
            {/*<Text size="large">You must configure the extension in the settings tab before you can use it!</Text>*/}
        </Box>;
    }

    const validationResult = configurationValidator(extensionConfiguration.tableAndFieldIds);
    return validationResult.errorsPresent ?
        <Box className='centered-container'><Text>
            Something has changed with your base schema and your extension configuration is now invalid. Please correct
            it in the
            settings page.</Text>
        </Box> : <Text>Search goes here.</Text>
}

export default SearchWrapper;