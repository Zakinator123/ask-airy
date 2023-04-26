import {TablesAndFieldsConfigurationErrors} from "./ConfigurationTypes";

export type ExtensionConfigurationUpdateResult = {
    errorsOccurred: true,
    errorMessage: string,
    tablesAndFieldsConfigurationErrors: TablesAndFieldsConfigurationErrors
} | { errorsOccurred: false }

export type PremiumStatus = 'premium' | 'invalid' | 'expired' | 'unable-to-verify' | 'free';