import {
    ExtensionConfiguration,
    TablesAndFieldsConfigurationIds,
    ValidationResult
} from "../types/ConfigurationTypes";
import {GlobalConfig} from "@airtable/blocks/types";
import {blankErrorState} from "../utils/Constants";
import {ExtensionConfigurationUpdateResult} from "../types/OtherTypes";

export const getExtensionConfigSaver = (globalConfig: GlobalConfig, configurationValidator: (configurationData: TablesAndFieldsConfigurationIds) => ValidationResult) => {
    return (extensionConfiguration: ExtensionConfiguration) =>
        validateExtensionConfigUpdateAndSaveToGlobalConfigCurried(globalConfig, extensionConfiguration, configurationValidator);
}

export const validateExtensionConfigUpdateAndSaveToGlobalConfigCurried = async (
    globalConfig: GlobalConfig,
    extensionConfiguration: ExtensionConfiguration,
    validateTablesAndFields: (configurationData: TablesAndFieldsConfigurationIds) => ValidationResult)
    : Promise<ExtensionConfigurationUpdateResult> => {
    const validationResult = validateTablesAndFields(extensionConfiguration.tableAndFieldIds);
    if (validationResult.errorsPresent) {
        return {
            errorsOccurred: true,
            errorMessage: 'There are error(s) with your configuration.',
            tablesAndFieldsConfigurationErrors: validationResult.errors
        }
    } else {
        const hasPermission: boolean = globalConfig.hasPermissionToSet('extensionConfiguration', extensionConfiguration)
        if (hasPermission) {
            try {
                await globalConfig.setAsync('extensionConfiguration', extensionConfiguration)
                return {errorsOccurred: false}
            } catch (e) {
                return {
                    errorsOccurred: true,
                    errorMessage: 'The new extension configuration is valid, but an error occurred saving it into your settings.',
                    tablesAndFieldsConfigurationErrors: blankErrorState
                }
            }
        } else {
            return {
                errorsOccurred: true,
                errorMessage: 'You must have base editor permissions to update extension settings.',
                tablesAndFieldsConfigurationErrors: blankErrorState
            };
        }
    }
}
