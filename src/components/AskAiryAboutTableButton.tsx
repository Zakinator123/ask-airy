import React, {useEffect, useRef} from "react";
import {Box, Button, Loader, Text, Tooltip, useRecords} from "@airtable/blocks/ui";
import {AskAiryServiceInterface, AskAiryTable} from "../types/CoreTypes";
import {Record, Table, View} from "@airtable/blocks/models";
import {AiryTableConfigWithDefinedDataIndexField} from "../types/ConfigurationTypes";
import {Toast} from "./Toast";
import {toast} from "react-toastify";


export const AskAiryAboutTableButton = ({
                                            dataIndexingPending,
                                            setDataIndexingPending,
                                            isLicensedUser,
                                            askAiryIsPending,
                                            statusMessage,
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
    dataIndexingPending: boolean,
    setDataIndexingPending: (pending: boolean) => void,
    isLicensedUser: boolean,
    askAiryIsPending: boolean,
    statusMessage: string,
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

    const dataIndexingIsPendingRef = useRef(dataIndexingPending);

    const airyTable: AskAiryTable = {
        table: airyTableConfig.table,
        recordsToAskAiryAbout: records,
        airyFields: airyTableConfig.airyFields,
        airyDataIndexField: airyTableConfig.dataIndexField,
    }

    const executeDataIndexing: () => Promise<{ executeSearchAfterIndexing: boolean }> = async () => {
        setStatusMessage("Checking if Airy's data index is up to date...")
        const staleOrUnIndexedRecords = await askAiryService.getRecordsWithStaleAiryIndexData(airyTable);

        if (staleOrUnIndexedRecords.length > 0) {
            setDataIndexingPending(true);
            dataIndexingIsPendingRef.current = true;
            let updateResult;
            if (staleOrUnIndexedRecords.length === records.length) {
                const progressMessageUpdaterForFirstTimeIndexBuild = (numSuccessfulUpdates: number, numFailedUpdates: number) => {
                    if (!dataIndexingIsPendingRef.current) return;
                    setStatusMessage(`Building Airy Data Index for the ${airyTable.table.name} table. This may take a while..
                     ${numSuccessfulUpdates}/${staleOrUnIndexedRecords.length} records have been been successfully indexed.
                     ${numFailedUpdates !== 0 ? ` Up to ${numFailedUpdates} records were not indexed successfully.`: ''}`);
                }
                progressMessageUpdaterForFirstTimeIndexBuild(0, 0);

                updateResult = await askAiryService.updateAiryDataIndexForTable(airyTable, staleOrUnIndexedRecords, progressMessageUpdaterForFirstTimeIndexBuild, dataIndexingIsPendingRef);
                if (!dataIndexingIsPendingRef.current) return {executeSearchAfterIndexing: false};

                if (updateResult.airtableWriteSuccesses === 0) {
                    setStatusMessage("❌ Failed to build Airy Data Index - please check your API key and try again. If the issue persists, please contact support.");
                    setDataIndexingPending(false);
                    dataIndexingIsPendingRef.current = false;
                    setAskAiryIsPending(false);
                    return {executeSearchAfterIndexing: false};
                } else if (updateResult.numAirtableUpdateFailures > 0) {
                    toast.error(`Errors occurred while building the Airy Data Index. Up to ${updateResult.numAirtableUpdateFailures + updateResult.numEmbeddingFailures} records were not indexed successfully.
                      Un-indexed records will not be used by Ask Airy. Please check your API key and try again.
                      If the issue persists, please contact support.`, {
                        autoClose: 10000,
                        containerId: 'ask-airy-error'
                    });
                }
            } else {
                const progressMessageUpdaterForIndexUpdate = (numSuccessfulUpdates: number, numFailedUpdates: number) => {
                    if (!dataIndexingIsPendingRef.current) return;
                    setStatusMessage(`Updating ${staleOrUnIndexedRecords.length} records in the Airy Data Index for the ${airyTable.table.name} table.
                     ${numSuccessfulUpdates}/${staleOrUnIndexedRecords.length} records have been been successfully updated.
                     ${numFailedUpdates !== 0 ? ` Up to ${numFailedUpdates} records were not indexed successfully.` : ''}`);
                }

                progressMessageUpdaterForIndexUpdate(0, 0);
                updateResult = await askAiryService.updateAiryDataIndexForTable(airyTable, staleOrUnIndexedRecords, progressMessageUpdaterForIndexUpdate, dataIndexingIsPendingRef);

                if (!dataIndexingIsPendingRef.current) return {executeSearchAfterIndexing: false};

                const numFailures = updateResult.numAirtableUpdateFailures + updateResult.numEmbeddingFailures;

                if (updateResult.airtableWriteSuccesses === 0) {
                    toast.error('The Airy Data Index could not be updated.' +
                        ' Ask Airy results may not be accurate as a result - please check your API key and try again.' +
                        ' If the issue persists, please contact support.', {
                        containerId: 'ask-airy-error',
                        autoClose: 10000
                    });
                } else if (numFailures > 0) {
                    toast.error(`Errors occurred while updating the Airy Data Index. Up to ${numFailures} records were not updated successfully.
                     Ask Airy results may not be accurate as a result - please check your API key and try again.
                     If the issue persists, please contact support.`, {
                        autoClose: 10000,
                        containerId: 'ask-airy-error'
                    });
                }
            }
        }
        setDataIndexingPending(false);
        dataIndexingIsPendingRef.current = false;
        return {executeSearchAfterIndexing: true};
    }

    async function executeSearchAndAskAiry() {
        setStatusMessage("Finding records relevant to your query...");
        // TODO: Make num results configurable
        // TODO: Test semantic search with empty table.
        let relevantRecords: Record[] = [];
        try {
            relevantRecords = await askAiryService.executeSemanticSearchForTable(airyTable, query, 5, (numCorruptedRecords: number) => {
                toast.error(`There were ${numCorruptedRecords} records with corrupted data in the ${airyTable.airyDataIndexField.name} field.
                 These records will not be used by Ask Airy and the corrupted data in their data index field will be removed.`);
            });
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
            toast.error('You must have edit permissions on the Airy Data Index field to use Ask Airy.', {
                autoClose: 10000,
                containerId: 'ask-airy-error'
            });
        } else {
            setAiryResponse(undefined);
            setStatusMessage('');
            setAskAiryIsPending(true);
            setAiryResponse(undefined);
            setSearchResults(undefined);
            const {executeSearchAfterIndexing} = await executeDataIndexing();
            if (executeSearchAfterIndexing) {
                await executeSearchAndAskAiry()
            }
            // Data Indexing ended prematurely - search was called from skip indexing button. OR Index build failed.
        }
    };

    return <>
        <Button disabled={askAiryIsPending || query.length === 0}
                variant='primary'
                onClick={clickAskAiryButton}>
            Ask Airy
        </Button>

        {
            statusMessage.length !== 0 && <Box display='flex' justifyContent='center'>
                <Text margin={3} fontSize={16}>{askAiryIsPending &&
                    <Loader scale={0.25}/>}&nbsp; &nbsp;{statusMessage}</Text>
            </Box>
        }

        {dataIndexingPending &&
            <Box margin={3} display='flex' justifyContent='center'>
                <Tooltip
                    content="Ask Airy results may not be accurate if indexing is incomplete."
                    placementX={Tooltip.placements.CENTER}
                    placementY={Tooltip.placements.BOTTOM}
                    shouldHideTooltipOnClick={true}
                >
                    <Button variant='danger' onClick={() => {
                        dataIndexingIsPendingRef.current = false;
                        setDataIndexingPending(false);
                        executeSearchAndAskAiry();
                    }}>
                        Skip Remaining Data Indexing
                    </Button>
                </Tooltip>
            </Box>
        }
        <Toast containerId='ask-airy-error'/>
    </>
}