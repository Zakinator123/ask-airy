import {AIProviderName, AIProviderOptions, ExtensionConfiguration} from "./ConfigurationTypes";

export const aiProviderData: Record<AIProviderName, AIProviderOptions> = {
    openai: {
        prettyName: 'OpenAI',
        indexFieldName: 'IntelliSearch OpenAI Index',
        embeddingModelSelectOptions: [{value: 'text-embedding-ada-002', label: 'text-embedding-ada-002'}]
    },
}

export const defaultConfig: ExtensionConfiguration = {
    currentAiProvider: 'openai',
    aiProvidersConfiguration: {
        openai: {
            apiKey: '',
            embeddingModel: 'text-embedding-ada-002',
            otherSettings: {},
        },
    },
    searchTables: [],
}