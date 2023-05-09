import {
    AIProviderName,
    ExtensionConfiguration,
    GlobalConfigUpdateResult,
    AiryTableConfig,
    SerializableExtensionConfiguration,
    SerializableAiryTableConfig
} from "../types/ConfigurationTypes";
import {GlobalConfig} from "@airtable/blocks/types";
import {Base, Field, FieldType} from "@airtable/blocks/models";
import {aiProviderData} from "../types/Constants";
import {removeDeletedTablesAndFieldsFromAiryTableConfigs} from "../utils/RandomUtils";

export class GlobalConfigSettingsService {
    private globalConfig: GlobalConfig;
    private base: Base;

    constructor(globalConfig: GlobalConfig, base: Base) {
        this.globalConfig = globalConfig;
        this.base = base;
    }

    validateExtensionConfigUpdateAndSaveToGlobalConfig = async (extensionConfiguration: ExtensionConfiguration): Promise<GlobalConfigUpdateResult> => {
        if (extensionConfiguration.aiProvidersConfiguration[extensionConfiguration.currentAiProvider]!.apiKey === '') return {
            errorsOccurred: true,
            errorMessage: 'You must enter an API key.'
        }

        if (extensionConfiguration.airyTableConfigs.length === 0) return {
            errorsOccurred: true,
            errorMessage: 'You must make at least one table accessible to Airy.'
        }

        if (extensionConfiguration.airyTableConfigs.some(airyTable => airyTable.fields.length === 0)) return {
            errorsOccurred: true,
            errorMessage: 'You must allow at least one field in each table to be accessible to Airy.'
        }

        if (!this.globalConfig.hasPermissionToSet('extensionConfiguration')) {
            return {
                errorsOccurred: true,
                errorMessage: 'You must have base editor permissions to update extension settings.',
            }
        }

        type ProcessedAiryTable =
            | { errorsOccurred: true; errorMessage: string }
            | { errorsOccurred: false; serializableAiryTableConfig: SerializableAiryTableConfig };

        async function processAiryTables(airyTableConfig: AiryTableConfig, aiProvider: AIProviderName): Promise<ProcessedAiryTable> {
            let airyDataIndexField = airyTableConfig.airyDataIndexFields[aiProvider];

            if (!airyDataIndexField) {
                const previouslyCreatedAiryDataIndexField = airyTableConfig.table.getFieldByNameIfExists(aiProviderData[aiProvider].indexFieldName);
                if (previouslyCreatedAiryDataIndexField) {
                    airyDataIndexField = previouslyCreatedAiryDataIndexField;
                } else {
                    if (!airyTableConfig.table.hasPermissionToCreateField()) {
                        return {
                            errorsOccurred: true,
                            errorMessage: `Insufficient permissions to create index field in ${airyTableConfig.table.name}`
                        };
                    }

                    try {
                        airyDataIndexField = await airyTableConfig.table.createFieldAsync(
                            aiProviderData[aiProvider].indexFieldName,
                            FieldType.MULTILINE_TEXT,
                            null,
                            'This field is used by the Ask Airy Extension.'
                        );
                    } catch (e) {
                        return {
                            errorsOccurred: true,
                            errorMessage: `Failed to create index field for ${airyTableConfig.table.name}`
                        };
                    }
                }
            }

            return {
                errorsOccurred: false,
                serializableAiryTableConfig: {
                    tableId: airyTableConfig.table.id,
                    airyFieldIds: airyTableConfig.fields.map((field: Field) => field.id),
                    airyDataIndexFieldIds: {[aiProvider]: airyDataIndexField.id}
                }
            };
        }

        async function createIndexFieldsAndReturnSerializableAiryTableConfigs(airyTableConfigs: AiryTableConfig[], aiProvider: AIProviderName) {
            const serializableAiryTableConfigs: SerializableAiryTableConfig[] = [];
            const searchTableErrors: string[] = [];

            for (const searchTable of airyTableConfigs) {
                const processed = await processAiryTables(searchTable, aiProvider);
                if (processed.errorsOccurred) {
                    searchTableErrors.push(processed.errorMessage);
                } else {
                    serializableAiryTableConfigs.push(processed.serializableAiryTableConfig);
                }
            }

            return {serializableAiryTableConfigs: serializableAiryTableConfigs, airyTableErrors: searchTableErrors};
        }

        const {
            serializableAiryTableConfigs,
            airyTableErrors
        } = await createIndexFieldsAndReturnSerializableAiryTableConfigs(extensionConfiguration.airyTableConfigs, extensionConfiguration.currentAiProvider);

        if (airyTableErrors.length > 0) {
            return {
                errorsOccurred: true,
                errorMessage: airyTableErrors.join('\n')
            }
        }

        const serializableExtensionConfiguration: SerializableExtensionConfiguration = {
            currentAiProvider: extensionConfiguration.currentAiProvider,
            aiProvidersConfiguration: extensionConfiguration.aiProvidersConfiguration,
            airyTables: serializableAiryTableConfigs
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

    getExtensionConfigurationFromGlobalConfig = (): ExtensionConfiguration | undefined => {
        const serializableExtensionConfiguration = this.globalConfig.get('extensionConfiguration') as SerializableExtensionConfiguration | undefined;

        if (!serializableExtensionConfiguration) return undefined;

        const extensionConfiguration: ExtensionConfiguration = {
            currentAiProvider: serializableExtensionConfiguration.currentAiProvider,
            aiProvidersConfiguration: serializableExtensionConfiguration.aiProvidersConfiguration,
            airyTableConfigs: []
        }

        for (const serializableAiryTableConfig of serializableExtensionConfiguration.airyTables) {
            const airyTable = this.base.getTableByIdIfExists(serializableAiryTableConfig.tableId);
            if (!airyTable) continue;

            const airyFields: Field[] = serializableAiryTableConfig.airyFieldIds
                .map(fieldId => airyTable.getFieldByIdIfExists(fieldId))
                .filter((field): field is Field => field !== null);

            if (airyFields.length === 0) continue;

            const airyDataIndexFields = Object.entries(serializableAiryTableConfig.airyDataIndexFieldIds).reduce((acc, [aiProvider, fieldId]) => {
                const field = airyTable.getFieldByIdIfExists(fieldId);
                if (field) {
                    acc[aiProvider as AIProviderName] = field;
                }
                return acc;
            }, {} as Record<AIProviderName, Field>);

            extensionConfiguration.airyTableConfigs.push({
                table: airyTable,
                fields: airyFields,
                airyDataIndexFields: airyDataIndexFields
            });
        }

        const sanitizedAiryTableConfigs = removeDeletedTablesAndFieldsFromAiryTableConfigs(extensionConfiguration.airyTableConfigs);
        if (sanitizedAiryTableConfigs.deletionOccurred) {
            extensionConfiguration.airyTableConfigs = sanitizedAiryTableConfigs.airyTableConfigs;
        }

        return extensionConfiguration;
    }

}
