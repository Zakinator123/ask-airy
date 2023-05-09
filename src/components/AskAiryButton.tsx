import React from "react";
import {Button, useRecords} from "@airtable/blocks/ui";
import {AskAiryServiceInterface, AskAiryTable} from "../types/CoreTypes";
import {Record} from "@airtable/blocks/models";
import {AiryTableConfigWithDefinedDataIndexField} from "../types/ConfigurationTypes";
import {Toast} from "./Toast";
import {toast} from "react-toastify";


export const AskAiryButton = ({
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

        setStatusMessage("Checking if Airy's data index is up to date...")
        const staleOrUnIndexedRecords = await askAiryService.getRecordsWithStaleAiryIndexData(airyTable);
        if (staleOrUnIndexedRecords.length > 0) {

            const updateResultPromise = askAiryService.updateAiryDataIndexForTable(airyTable, staleOrUnIndexedRecords);
            let updateResult;

            if (staleOrUnIndexedRecords.length === records.length) {
                setStatusMessage(`Building Airy Data Index for the ${airyTable.table.name} table - this may take a while...`);
                updateResult = await updateResultPromise;
                if (updateResult === 'full-embedding-failure') {
                    setStatusMessage("❌ Failed to build Airy Data Index - please check your API key or API key tier settings and try again. If the issue persists, please contact support.");
                    setAskAiryIsPending(false);
                    return;
                }
            } else {
                setStatusMessage(`Updating ${staleOrUnIndexedRecords.length} records in the Airy Data Index for the ${airyTable.table.name} table...`);
                const updateResult = await updateResultPromise;
                if (updateResult !== 'success') {
                    toast.error('Errors occurred while updating the Airy Data Index - please check your API key or API key tier settings and try again. If the issue persists, please contact support.', {containerId: 'ask-airy-error'});
                }
            }
        }
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

    return <>
        <Button disabled={askAiryIsPending || query.length === 0}
                variant='primary'
                onClick={executeAskAiry}>
            Ask Airy
        </Button>
        <Toast containerId='ask-airy-error'/>
    </>
}