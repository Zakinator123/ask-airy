import {Field, Table} from "@airtable/blocks/models";
import {FieldId, TableId} from "@airtable/blocks/types";

export type AIProviderName = "openai";

export type AiProvidersConfiguration = Record<AIProviderName, {
    apiKey: string,
    embeddingModel: OpenAIEmbeddingModel,
    otherSettings: {},
}>

export type ExtensionConfiguration = {
    currentAiProvider: AIProviderName,
    aiProvidersConfiguration: AiProvidersConfiguration
    searchTables: SearchTableConfig[],
}

export type SerializableExtensionConfiguration = {
    currentAiProvider: AIProviderName,
    aiProvidersConfiguration: AiProvidersConfiguration
    searchTables: SerializableSearchTableConfig[],
}

export type SearchTableConfig = {
    table: Table,
    searchFields: Field[],
    intelliSearchIndexFields: {
        openai?: Field,
    }
}

export type SerializableSearchTableConfig = {
    table: TableId,
    searchFields: FieldId[],
    intelliSearchIndexFields: {
        openai?: FieldId,
    }
}

export type AIProviderOptions = {
    prettyName: string,
    indexFieldName: string,
    embeddingModelSelectOptions: { value: string, label: string }[],
}

export type SearchTableConfigWithDefinedSearchIndexField = {
    table: Table,
    searchFields: Field[],
    intelliSearchIndexField: Field,
}

export type OpenAIEmbeddingModel = 'text-embedding-ada-002';

export type GlobalConfigUpdateResult = { errorsOccurred: false, } | { errorsOccurred: true, errorMessage: string }