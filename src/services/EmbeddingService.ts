import {Configuration, OpenAIApi} from "openai";
import {EmbeddingService, RecordToIndex} from "../types/CoreTypes";

export class OpenAIEmbeddingService implements EmbeddingService {
    private openai

    constructor(apiKey: string) {
        this.openai = new OpenAIApi(new Configuration({apiKey}));
    }

    getEmbeddingsForRecords = (recordsToEmbed: Array<RecordToIndex>) => {
        const serializedRecords = recordsToEmbed.map((recordToEmbed) => recordToEmbed.serializedDataToEmbed);
        return this.openai.createEmbedding(
            {
                model: 'text-embedding-ada-002',
                input: serializedRecords,
            })
            .then((response) =>
                response.data.data.map(({embedding, index}) =>
                    ({
                        recordId: recordsToEmbed[index]!.recordId,
                        hash: recordsToEmbed[index]!.newHash,
                        embedding: embedding
                    })));
    }

    getEmbeddingForString = (query: string) => {
        return this.openai.createEmbedding(
            {
                model: 'text-embedding-ada-002',
                input: query,
            })
            .then((response) =>
                response.data.data[0]!.embedding)
    }
}