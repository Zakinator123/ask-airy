import {Field, Table} from "@airtable/blocks/models";
import {FieldId, TableId} from "@airtable/blocks/types";

export type AiProvidersConfiguration = Record<AIProviderName, {
    apiKey: string,
    embeddingModel: string,
    otherSettings: {},
}>

export type AIProviderName = string;


export type NewExtensionConfiguration = {
    currentAiProvider: AIProviderName,
    aiProvidersConfiguration: AiProvidersConfiguration
    searchTables: SearchTableConfig[],
}

export type SearchTableConfig = {
    [key: string]: any,
    table: Table,
    searchFields: Field[],
}

export type SearchTableConfigIds = {
    table: TableId,
    searchFields: FieldId[],
    intelliSearchIndexFields: {
        openai?: FieldId,
        cohere?: FieldId
    }
}

export type NewExtensionConfigurationForGlobalConfig = {
    currentAiProvider: AIProviderName,
    aiProvidersConfiguration: AiProvidersConfiguration
    searchTables: SearchTableConfigIds[],
}

export type AIProviderOptions = {
    prettyName: string,
    embeddingModelSelectOptions: { value: string, label: string }[],
}