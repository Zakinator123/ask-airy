import {Field, Table} from "@airtable/blocks/models";
import {FieldId, TableId} from "@airtable/blocks/types";

export type AIProviderName = "openai" | "cohere";

export type AiProvidersConfiguration = Record<AIProviderName, {
    apiKey: string,
    embeddingModel: string,
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
    searchTables: SearchTableConfigIds[],
}

export type SearchTableConfig = {
    table: Table,
    searchFields: Field[],
    intelliSearchIndexFields: {
        openai?: Field,
        cohere?: Field
    }
}

export type SearchTableConfigIds = {
    table: TableId,
    searchFields: FieldId[],
    intelliSearchIndexFields: {
        openai?: FieldId,
        cohere?: FieldId
    }
}

export type AIProviderOptions = {
    prettyName: string,
    embeddingModelSelectOptions: { value: string, label: string }[],
}