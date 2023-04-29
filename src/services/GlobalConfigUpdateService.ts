import {NewExtensionConfiguration, NewExtensionConfigurationForGlobalConfig} from "../types/ConfigurationTypes";
import {GlobalConfig} from "@airtable/blocks/types";
import {Field, FieldType} from "@airtable/blocks/models";

export const getExtensionConfigSaver = (globalConfig: GlobalConfig) => {
    return (extensionConfiguration: NewExtensionConfiguration) =>
        validateExtensionConfigUpdateAndSaveToGlobalConfigCurried(globalConfig, extensionConfiguration);
}

type NewValidationResult = { errorsOccurred: false, } | { errorsOccurred: true, errorMessage: string }

export const validateExtensionConfigUpdateAndSaveToGlobalConfigCurried = async (
    globalConfig: GlobalConfig,
    extensionConfiguration: NewExtensionConfiguration)
    : Promise<NewValidationResult> => {

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

    const hasPermission: boolean = globalConfig.hasPermissionToSet('extensionConfiguration', extensionConfiguration)
    if (hasPermission) {

        console.log("Test 1")
        const mappedConfigForGlobalConfig: NewExtensionConfigurationForGlobalConfig = {
            currentAiProvider: extensionConfiguration.currentAiProvider,
            aiProvidersConfiguration: extensionConfiguration.aiProvidersConfiguration,
            searchTables: await Promise.all(extensionConfiguration.searchTables.map(async searchTable => {

                // TODO: Handle error handling here?
               let searchIndexField: Field;
                try {
                    searchIndexField = await searchTable.table.createFieldAsync(`IntelliSearch ${extensionConfiguration.currentAiProvider} Index`,
                        FieldType.MULTILINE_TEXT,
                        null,
                        'This field is used by the IntelliSearch Extension to store search index data for each record.'
                    )
                } catch (e) {
                    console.log("Error creating search index field")
                    console.log(e);
                    throw new Error(`Error creating search index field for table ${searchTable.table.name}: ${e}`)
                }

                console.log("Created search index field");
                return {
                    table: searchTable.table.id,
                    searchFields: searchTable.searchFields.map(searchField => searchField.id),
                    intelliSearchIndexFields: {
                        [extensionConfiguration.currentAiProvider]: searchIndexField.id,
                    }
                }
            }))
        }

        try {
            await globalConfig.setAsync('extensionConfiguration', mappedConfigForGlobalConfig)
            return {errorsOccurred: false}
        } catch (e) {
            return {
                errorsOccurred: true,
                errorMessage: 'The new extension configuration is valid, but an error occurred saving it into your settings.',
            }
        }
    } else {
        return {
            errorsOccurred: true,
            errorMessage: 'You must have base editor permissions to update extension settings.',
        };
    }
}
