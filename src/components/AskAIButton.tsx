import React from "react";
import {Button, useRecords} from "@airtable/blocks/ui";
import {AIPowerPreference, AskAIServiceInterface, SearchTable} from "../types/CoreTypes";
import {Record} from "@airtable/blocks/models";
import {SearchTableConfigWithDefinedSearchIndexField} from "../types/ConfigurationTypes";


export const AskAIButton = ({
                                searchIsPending,
                                setStatusMessage,
                                setNumRelevantRecordsUsedInAiAnswer,
                                setAskAiIsPending,
                                askAIService,
                                searchTableConfig,
                                setAIResponse,
                                setSearchResults,
                                aiPowerPreference,
                                query
                            }: {
    searchIsPending: boolean,
    setStatusMessage: (message: string) => void,
    setNumRelevantRecordsUsedInAiAnswer: (numRecords: number) => void,
    setAskAiIsPending: (pending: boolean) => void,
    askAIService: AskAIServiceInterface,
    searchTableConfig: SearchTableConfigWithDefinedSearchIndexField,
    setAIResponse: (response: ReadableStream | string | undefined) => void,
    setSearchResults: (results: Record[] | undefined) => void,
    aiPowerPreference: AIPowerPreference,
    query: string
}) => {
    const records = useRecords(searchTableConfig.table);

    const searchTable: SearchTable = {
        table: searchTableConfig.table,
        recordsToSearch: records,
        searchFields: searchTableConfig.searchFields,
        intelliSearchIndexField: searchTableConfig.intelliSearchIndexField,
    }

    const executeSearch = async () => {
        setAskAiIsPending(true);
        setAIResponse(undefined);
        setSearchResults(undefined);
        setStatusMessage('');

        setStatusMessage("Updating AI Data Index... This may take a while.")
        await askAIService.updateSearchIndexForTable(searchTable);
        setStatusMessage("Finding records relevant to your query...");
        const relevantRecords = await askAIService.executeSemanticSearchForTable(searchTable, query, 5, aiPowerPreference);
        setSearchResults(relevantRecords);
        setStatusMessage("Asking the AI...");

        const aiResponse = await askAIService.askAIAboutRelevantRecords(searchTable, query, relevantRecords, aiPowerPreference);
        setStatusMessage('');
        if (aiResponse.errorOccurred) {
            setAIResponse(aiResponse.message);
            setAskAiIsPending(false);
        } else {
            setAIResponse(aiResponse.aiResponse);
            setNumRelevantRecordsUsedInAiAnswer(aiResponse.numRelevantRecordsUsedByAI);
        }
    }

    return <Button disabled={searchIsPending || query.length === 0}
                   variant='primary'
                   onClick={executeSearch}>
        Ask AI
    </Button>
}