import React from "react";
import {Button, useRecords} from "@airtable/blocks/ui";
import {AskAiryServiceInterface, AskAiryTable} from "../types/CoreTypes";
import {Record} from "@airtable/blocks/models";
import {AiryTableConfigWithDefinedDataIndexField} from "../types/ConfigurationTypes";


export const AskAIButton = ({
                                askAiryIsPending,
                                setStatusMessage,
                                setNumRelevantRecordsUsedInAiAnswer,
                                setAskAiryIsPending,
                                askAiryService,
                                airyTableConfig,
                                setAIResponse,
                                setSearchResults,
                                query
                            }: {
    askAiryIsPending: boolean,
    setStatusMessage: (message: string) => void,
    setNumRelevantRecordsUsedInAiAnswer: (numRecords: number) => void,
    setAskAiryIsPending: (pending: boolean) => void,
    askAiryService: AskAiryServiceInterface,
    airyTableConfig: AiryTableConfigWithDefinedDataIndexField,
    setAIResponse: (response: ReadableStream | string | undefined) => void,
    setSearchResults: (results: Record[] | undefined) => void,
    query: string
}) => {
    const records = useRecords(airyTableConfig.table);

    const airyTable: AskAiryTable = {
        table: airyTableConfig.table,
        recordsToAskAiryAbout: records,
        airyFields: airyTableConfig.airyFields,
        airyDataIndexField: airyTableConfig.dataIndexField,
    }

    const executeAskAiry = async () => {
        setAskAiryIsPending(true);
        setAIResponse(undefined);
        setSearchResults(undefined);
        setStatusMessage('');

        setStatusMessage("Updating AI Data Index... This may take a while.")
        await askAiryService.updateAiryIndexDataForTable(airyTable);
        setStatusMessage("Finding records relevant to your query...");
        // TODO: Make num results configurable
        const relevantRecords = await askAiryService.executeSemanticSearchForTable(airyTable, query, 5);
        setSearchResults(relevantRecords);
        setStatusMessage("Asking the AI...");

        const aiResponse = await askAiryService.askAiryAboutRelevantRecords(airyTable, query, relevantRecords);
        setStatusMessage('');
        if (aiResponse.errorOccurred) {
            setAIResponse(aiResponse.message);
            setAskAiryIsPending(false);
        } else {
            setAIResponse(aiResponse.aiResponse);
            setNumRelevantRecordsUsedInAiAnswer(aiResponse.numRelevantRecordsUsedByAI);
        }
    }

    return <Button disabled={askAiryIsPending || query.length === 0}
                   variant='primary'
                   onClick={executeAskAiry}>
        Ask AI
    </Button>
}