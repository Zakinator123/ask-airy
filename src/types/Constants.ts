import {AIProviderName, AIProviderOptions, ExtensionConfiguration} from "./ConfigurationTypes";

export const aiProviderData: Record<AIProviderName, AIProviderOptions> = {
    openai: {
        prettyName: 'OpenAI',
        indexFieldName: 'IntelliSearch OpenAI Index',
        embeddingModelSelectOptions: [{value: 'text-embedding-ada-002', label: 'text-embedding-ada-002'}]
    },
    cohere: {
        prettyName: 'Cohere',
        indexFieldName: 'IntelliSearch Cohere Index',
        embeddingModelSelectOptions: [
            {value: 'large', label: 'large'},
            {value: 'small', label: 'small'},
            {value: 'multilingual-22-12', label: 'multilingual-22-12'}]
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
        cohere: {
            apiKey: '',
            embeddingModel: 'large',
            otherSettings: {},
        }
    },
    searchTables: [],
}