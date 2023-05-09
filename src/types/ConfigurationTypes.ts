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
    airyTableConfigs: AiryTableConfig[],
}

export type SerializableExtensionConfiguration = {
    currentAiProvider: AIProviderName,
    aiProvidersConfiguration: AiProvidersConfiguration
    airyTables: SerializableAiryTableConfig[],
}

export type AiryTableConfig = {
    table: Table,
    fields: Field[],
    airyDataIndexFields: {
        openai?: Field,
    }
}

export type SerializableAiryTableConfig = {
    tableId: TableId,
    airyFieldIds: FieldId[],
    airyDataIndexFieldIds: {
        openai?: FieldId,
    }
}

export type AIProviderOptions = {
    prettyName: string,
    indexFieldName: string,
    embeddingModelSelectOptions: { value: string, label: string }[],
}

export type AiryTableConfigWithDefinedDataIndexField = {
    table: Table,
    airyFields: Field[],
    dataIndexField: Field,
}

export type OpenAIEmbeddingModel = 'text-embedding-ada-002';

export type GlobalConfigUpdateResult = { errorsOccurred: false, } | { errorsOccurred: true, errorMessage: string }