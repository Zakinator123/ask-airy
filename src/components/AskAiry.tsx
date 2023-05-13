import React, {Suspense, useState} from "react";
import {
    Box,
    Button,
    FormField,
    Heading,
    Loader,
    RecordCardList,
    Select,
    Text,
    TextButton,
    ViewPicker
} from "@airtable/blocks/ui";
import {Base, Record, Table, View, ViewType} from "@airtable/blocks/models";
import {AskAiryServiceInterface} from "../types/CoreTypes";
import {AskAiryButton} from "./AskAiryButton";
import {AiryTableConfigWithDefinedDataIndexField} from "../types/ConfigurationTypes";
import {FormFieldLabelWithTooltip} from "./FormFieldLabelWithTooltip";
import {Tips} from "./Tips";
import {AiryResponse} from "./AiryResponse";
import {LicenseRequiredMessage} from "./LicenseRequiredMessage";
import {TableId} from "@airtable/blocks/types";

export const AskAiry = ({
                            isLicensedUser,
                            askAiryIsPending,
                            setAskAiryIsPending,
                            askAiryService,
                            airyTableConfigs,
                            base
                        }: {
    isLicensedUser: boolean,
    askAiryIsPending: boolean,
    setAskAiryIsPending: (pending: boolean) => void,
    askAiryService: AskAiryServiceInterface,
    airyTableConfigs: AiryTableConfigWithDefinedDataIndexField[],
    base: Base
}) => {
    const [selectedTableId, setSelectedTableId] = useState<TableId | undefined>(undefined);
    const [selectedView, setSelectedView] = useState<View | undefined>(undefined);
    const [searchResults, setSearchResults] = useState<Record[] | undefined>(undefined);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [airyResponse, setAiryResponse] = useState<ReadableStream<Uint8Array> | string | undefined>(undefined);
    const [numRelevantRecordsUsedInAiryResponse, setNumRelevantRecordsUsedInAiryResponse] = useState<number>(0);
    const [query, setQuery] = useState("");
    const [tipsDialogOpen, setTipsDialogOpen] = useState(false);

    const selectedTable: Table | undefined = selectedTableId ? base.getTableByIdIfExists(selectedTableId) ?? undefined : undefined;
    const selectedTableConfig: AiryTableConfigWithDefinedDataIndexField | undefined = selectedTable ? airyTableConfigs.find(airyTableConfig => airyTableConfig.table.id === selectedTable.id) : undefined;

    return (
        <Box style={{
            padding: '2rem',
            gap: '1rem',
            display: 'flex',
            flexDirection: 'column',
            margin: 'auto',
            maxWidth: '600px',
            width: '100%'
        }}>
            {!isLicensedUser && <LicenseRequiredMessage/>}
            <Box>
                <FormField label='What do you want to ask Airy about?'>
                    <Select
                        disabled={askAiryIsPending}
                        options={[
                            {value: undefined, label: ''},
                            ...airyTableConfigs.map(airyTableConfig => ({
                                value: airyTableConfig.table.id,
                                label: airyTableConfig.table.name
                            }))]}
                        value={selectedTableId}
                        onChange={(tableId) => {
                            setAiryResponse(undefined);
                            setNumRelevantRecordsUsedInAiryResponse(0);
                            setSearchResults(undefined);
                            setSelectedView(undefined);
                            setStatusMessage('');
                            setQuery('');
                            setSelectedTableId(tableId ? tableId as string : undefined);
                        }}
                    />
                </FormField>
            </Box>

            {selectedTable && selectedTable.views.length > 1 &&
                <Box marginBottom={2}>
                    <FormFieldLabelWithTooltip fieldLabel='(Optional) Select a View'
                                               fieldLabelTooltip='Views are helpful for limiting which records Airy finds and uses to answer your queries'/>
                    <ViewPicker
                        shouldAllowPickingNone={true}
                        allowedTypes={[ViewType.GRID]}
                        placeholder={''}
                        table={selectedTable}
                        view={selectedView}
                        onChange={newView => {
                            setAiryResponse(undefined);
                            setNumRelevantRecordsUsedInAiryResponse(0);
                            setSearchResults(undefined);
                            setStatusMessage('');
                            setQuery('');
                            setSelectedView(newView ?? undefined);
                        }}
                    />
                </Box>
            }

            <Box marginBottom={2}>
                <FormField label='Query'>
                <textarea
                    rows={2}
                    style={{padding: '0.5rem', backgroundColor: '#f2f2f2', border: "none", resize: "vertical"}}
                    disabled={askAiryIsPending}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Ask Airy anything about your table..."
                />
                    <TextButton margin={1} onClick={() => setTipsDialogOpen(true)} width='fit-content' icon='info'>
                        Tips for using Ask Airy
                    </TextButton>
                    <Tips tipsDialogOpen={tipsDialogOpen} setTipsDialogOpen={setTipsDialogOpen}/>
                </FormField>
            </Box>

            <Suspense
                fallback={<Button disabled={true} variant='primary'>Loading Records...</Button>}>
                {selectedTableConfig
                    ? <AskAiryButton
                        isLicensedUser={isLicensedUser}
                        setNumRelevantRecordsUsedInAiAnswer={setNumRelevantRecordsUsedInAiryResponse}
                        setStatusMessage={setStatusMessage}
                        setAIResponse={setAiryResponse}
                        askAiryIsPending={askAiryIsPending}
                        setAskAiryIsPending={setAskAiryIsPending}
                        askAiryService={askAiryService}
                        airyTableConfig={selectedTableConfig}
                        selectedView={selectedView}
                        setSearchResults={setSearchResults}
                        query={query}
                    />
                    : <Button disabled={true} variant='primary'>Ask Airy</Button>
                }
            </Suspense>

            {statusMessage.length !== 0 && <Box display='flex' justifyContent='center'>
                <Text fontSize={16}>{askAiryIsPending && <Loader scale={0.25}/>}&nbsp; &nbsp;{statusMessage}</Text>
            </Box>}

            {airyResponse && <AiryResponse airyResponse={airyResponse}
                                           setAskAiryIsPending={setAskAiryIsPending}
                                           numRelevantRecordsUsedInAiryResponse={numRelevantRecordsUsedInAiryResponse}/>}

            {searchResults && selectedTableConfig &&
                <Box height='500px'>
                    <Heading>Potentially Relevant Records:</Heading>
                    <RecordCardList
                        fields={selectedTableConfig.airyFields}
                        height='500px'
                        style={{height: '500px'}}
                        records={searchResults}
                    />
                </Box>
            }
        </Box>
    )
}