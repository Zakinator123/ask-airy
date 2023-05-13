import React, {useEffect} from "react";
import {Button, useRecords} from "@airtable/blocks/ui";
import {AskAiryServiceInterface, AskAiryTable} from "../types/CoreTypes";
import {Record, Table, View} from "@airtable/blocks/models";
import {AiryTableConfigWithDefinedDataIndexField} from "../types/ConfigurationTypes";
import {Toast} from "./Toast";
import {toast} from "react-toastify";


export const AskAiryAboutTableButton = ({
                                            isLicensedUser,
                                            askAiryIsPending,
                                            setStatusMessage,
                                            setNumRelevantRecordsUsedInAiAnswer,
                                            setAskAiryIsPending,
                                            askAiryService,
                                            airyTableConfig,
                                            setAiryResponse,
                                            setSearchResults,
                                            selectedView,
                                            query
                                        }: {
    isLicensedUser: boolean,
    askAiryIsPending: boolean,
    setStatusMessage: (message: string) => void,
    setNumRelevantRecordsUsedInAiAnswer: (numRecords: number) => void,
    setAskAiryIsPending: (pending: boolean) => void,
    askAiryService: AskAiryServiceInterface,
    airyTableConfig: AiryTableConfigWithDefinedDataIndexField,
    setAiryResponse: (response: ReadableStream | string | undefined) => void,
    setSearchResults: (results: Record[] | undefined) => void,
    selectedView: View | undefined,
    query: string
}) => {
    useEffect(() => () => toast.dismiss(), []);
    let tableOrViewForAskAiry: View | Table;
    tableOrViewForAskAiry = selectedView ? selectedView : airyTableConfig.table;
    const records = useRecords(tableOrViewForAskAiry, {fields: [airyTableConfig.dataIndexField.id, ...airyTableConfig.airyFields]});

    const airyTable: AskAiryTable = {
        table: airyTableConfig.table,
        recordsToAskAiryAbout: records,
        airyFields: airyTableConfig.airyFields,
        airyDataIndexField: airyTableConfig.dataIndexField,
    }

    const executeAskAiry = async () => {
        setAskAiryIsPending(true);
        setAiryResponse(undefined);
        setSearchResults(undefined);
        setStatusMessage('');

        setStatusMessage("Checking if Airy's data index is up to date...")
        const staleOrUnIndexedRecords = await askAiryService.getRecordsWithStaleAiryIndexData(airyTable);
        if (staleOrUnIndexedRecords.length > 0) {
            let updateResult;
            if (staleOrUnIndexedRecords.length === records.length) {
                const progressMessageUpdaterForFirstTimeIndexBuild = (numSuccessfulUpdates: number) => {
                    setStatusMessage(`Building Airy Data Index for the ${airyTable.table.name} table. This may take a while. ${numSuccessfulUpdates}/${staleOrUnIndexedRecords.length} records have been been successfully indexed...`);
                }

                progressMessageUpdaterForFirstTimeIndexBuild(0);

                updateResult = await askAiryService.updateAiryDataIndexForTable(airyTable, staleOrUnIndexedRecords, progressMessageUpdaterForFirstTimeIndexBuild);
                if (updateResult.airtableWriteSuccesses === 0) {
                    setStatusMessage("❌ Failed to build Airy Data Index - please check your API key or API key tier settings and try again. If the issue persists, please contact support.");
                    setAskAiryIsPending(false);
                    return;
                } else if (updateResult.airtableWriteSuccesses < staleOrUnIndexedRecords.length) {
                    toast.error(`Errors occurred while building the Airy Data Index. Up to ${updateResult.numAirtableUpdateFailures + updateResult.numEmbeddingFailures} records were not indexed successfully.
                      Un-indexed records will not be used by Ask Airy. Please check your API key or API key tier settings and try again.
                      If the issue persists, please contact support.`, {
                        autoClose: 10000,
                        containerId: 'ask-airy-error'
                    });
                }
            } else {
                const progressMessageUpdaterForIndexUpdate = (numSuccessfulUpdates: number) => {
                    setStatusMessage(`Updating ${staleOrUnIndexedRecords.length} records in the Airy Data Index for the ${airyTable.table.name} table. ${numSuccessfulUpdates}/${staleOrUnIndexedRecords.length} records have been been successfully updated...`);
                }

                progressMessageUpdaterForIndexUpdate(0);

                updateResult = await askAiryService.updateAiryDataIndexForTable(airyTable, staleOrUnIndexedRecords, progressMessageUpdaterForIndexUpdate);

                const numFailures = updateResult.numAirtableUpdateFailures + updateResult.numEmbeddingFailures;

                if (updateResult.airtableWriteSuccesses === 0) {
                    toast.error('The Airy Data Index could not be updated.' +
                        ' Ask Airy results may not be accurate as a result - please check your API key or API key tier settings and try again.' +
                        ' If the issue persists, please contact support.', {
                        containerId: 'ask-airy-error',
                        autoClose: 10000
                    });
                } else if (numFailures > 0) {
                    toast.error(`Errors occurred while updating the Airy Data Index. Up to ${numFailures} records were not updated successfully.
                     Ask Airy results may not be accurate as a result - please check your API key or API key tier settings and try again.
                     If the issue persists, please contact support.`, {
                        autoClose: 10000,
                        containerId: 'ask-airy-error'
                    });
                }
            }
        }

        // Split out this part of the code so that when users eject out of indexing this won't be duplicated.
        setStatusMessage("Finding records relevant to your query...");
        // TODO: Make num results configurable
        // TODO: Test semantic search with empty table.
        let relevantRecords: Record[] = [];
        try {
            relevantRecords = await askAiryService.executeSemanticSearchForTable(airyTable, query, 5);
        } catch (e) {
            setStatusMessage("❌ An error occurred finding relevant records for Airy.");
            setAskAiryIsPending(false);
            return;
        }
        setSearchResults(relevantRecords);
        setStatusMessage("Asking Airy...");

        const aiResponse = await askAiryService.askAiryAboutRelevantRecords(airyTable, query, relevantRecords);
        setStatusMessage('');
        if (aiResponse.errorOccurred) {
            setAiryResponse(aiResponse.message);
            setAskAiryIsPending(false);
        } else {
            setAiryResponse(aiResponse.streamingResponse);
            setNumRelevantRecordsUsedInAiAnswer(aiResponse.numRelevantRecordsUsedByAI);
        }
    }

    const clickAskAiryButton = async () => {
        if (!isLicensedUser) {
            toast.error('You must have a license to use Ask Airy. See the License tab for more details.', {
                autoClose: 10000,
                containerId: 'ask-airy-error'
            });
        } else if (!airyTableConfig.table.hasPermissionToUpdateRecord(undefined, {[airyTableConfig.dataIndexField.id]: undefined})) {
            toast.error('You must have edit permissions on the Airy Data Index field to use Ask Airy.', {autoClose: 10000, containerId: 'ask-airy-error'});
        } else {
            executeAskAiry();
        }
    };

    return <>
        <Button disabled={askAiryIsPending || query.length === 0}
                variant='primary'
                onClick={clickAskAiryButton}>
            Ask Airy
        </Button>
        <Toast containerId='ask-airy-error'/>
    </>
}