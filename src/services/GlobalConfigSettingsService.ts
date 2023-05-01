import {
    AIProviderName,
    ExtensionConfiguration,
    GlobalConfigUpdateResult,
    SearchTableConfig,
    SerializableExtensionConfiguration,
    SerializableSearchTableConfig
} from "../types/ConfigurationTypes";
import {GlobalConfig} from "@airtable/blocks/types";
import {Field, FieldType} from "@airtable/blocks/models";

export class GlobalConfigSettingsService {
    private globalConfig: GlobalConfig;

    constructor(globalConfig: GlobalConfig) {
        this.globalConfig = globalConfig;
    }

    validateExtensionConfigUpdateAndSaveToGlobalConfig = async (extensionConfiguration: ExtensionConfiguration): Promise<GlobalConfigUpdateResult> => {
        if (extensionConfiguration.aiProvidersConfiguration[extensionConfiguration.currentAiProvider]!.apiKey === '') return {
            errorsOccurred: true,
            errorMessage: 'You must enter an API key.'
        }

        if (extensionConfiguration.searchTables.length === 0) return {
            errorsOccurred: true,
            errorMessage: 'You must add at least one table to the IntelliSearch Index.'
        }

        if (extensionConfiguration.searchTables.some(searchTable => searchTable.searchFields.length === 0)) return {
            errorsOccurred: true,
            errorMessage: 'You must add at least one search field to each table.'
        }

        if (!this.globalConfig.hasPermissionToSet('extensionConfiguration')) {
            return {
                errorsOccurred: true,
                errorMessage: 'You must have base editor permissions to update extension settings.',
            }
        }

        type ProcessedSearchTable =
            | { errorsOccurred: true; errorMessage: string }
            | { errorsOccurred: false; serializableSearchTableConfig: SerializableSearchTableConfig };

        async function processSearchTable(searchTableConfig: SearchTableConfig, aiProvider: AIProviderName): Promise<ProcessedSearchTable> {
            let searchIndexField = searchTableConfig.intelliSearchIndexFields[aiProvider];

            if (!searchIndexField) {
                const previouslyCreatedSearchIndexField = searchTableConfig.table.getFieldByNameIfExists(`IntelliSearch ${aiProvider} Index`);
                if (previouslyCreatedSearchIndexField) {
                    searchIndexField = previouslyCreatedSearchIndexField;
                } else {
                    if (!searchTableConfig.table.hasPermissionToCreateField()) {
                        return {
                            errorsOccurred: true,
                            errorMessage: `Insufficient permissions to create index field in ${searchTableConfig.table.name}`
                        };
                    }

                    try {
                        searchIndexField = await searchTableConfig.table.createFieldAsync(
                            `IntelliSearch ${aiProvider} Index`,
                            FieldType.MULTILINE_TEXT,
                            null,
                            'This field is used by the IntelliSearch Extension to store search index data for each record.'
                        );
                    } catch (e) {
                        return {
                            errorsOccurred: true,
                            errorMessage: `Failed to create index field for ${searchTableConfig.table.name}`
                        };
                    }
                }
            }

            return {
                errorsOccurred: false,
                serializableSearchTableConfig: {
                    table: searchTableConfig.table.id,
                    searchFields: searchTableConfig.searchFields.map((field: Field) => field.id),
                    intelliSearchIndexFields: {[aiProvider]: searchIndexField.id}
                }
            };
        }

        async function createIndexFieldsAndReturnSerializableSearchTableConfigs(searchTableConfigs: SearchTableConfig[], aiProvider: AIProviderName) {
            const serializableSearchTableConfigs: SerializableSearchTableConfig[] = [];
            const searchTableErrors: string[] = [];

            for (const searchTable of searchTableConfigs) {
                const processed = await processSearchTable(searchTable, aiProvider);
                if (processed.errorsOccurred) {
                    searchTableErrors.push(processed.errorMessage);
                } else {
                    serializableSearchTableConfigs.push(processed.serializableSearchTableConfig);
                }
            }

            return {serializableSearchTableConfigs, searchTableErrors};
        }

        const {
            serializableSearchTableConfigs,
            searchTableErrors
        } = await createIndexFieldsAndReturnSerializableSearchTableConfigs(extensionConfiguration.searchTables, extensionConfiguration.currentAiProvider);

        if (searchTableErrors.length > 0) {
            return {
                errorsOccurred: true,
                errorMessage: searchTableErrors.join('\n')
            }
        }

        const serializableExtensionConfiguration: SerializableExtensionConfiguration = {
            currentAiProvider: extensionConfiguration.currentAiProvider,
            aiProvidersConfiguration: extensionConfiguration.aiProvidersConfiguration,
            searchTables: serializableSearchTableConfigs
        }

        try {
            await this.globalConfig.setAsync('extensionConfiguration', serializableExtensionConfiguration)
            return {errorsOccurred: false}
        } catch (e) {
            return {
                errorsOccurred: true,
                errorMessage: 'The new extension configuration is valid, but an error occurred saving it into your settings.',
            }
        }
    }

}
