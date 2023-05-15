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
import {AskAiryAboutTableButton} from "./AskAiryAboutTableButton";
import {AiryTableConfigWithDefinedDataIndexField} from "../types/ConfigurationTypes";
import {FormFieldLabelWithTooltip} from "./FormFieldLabelWithTooltip";
import {AiryResponse} from "./AiryResponse";
import {LicenseRequiredMessage} from "./LicenseRequiredMessage";
import {TableId} from "@airtable/blocks/types";
import {AskAiryAboutAnythingButton} from "./AskAiryAboutAnythingButton";
import {Tips} from "./Tips";

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
    const [askAiryTopic, setAskAiryTopic] = useState<TableId | 'anything' | undefined>(undefined);
    const [selectedView, setSelectedView] = useState<View | undefined>(undefined);
    const [searchResults, setSearchResults] = useState<Record[] | undefined>(undefined);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [airyResponse, setAiryResponse] = useState<ReadableStream<Uint8Array> | string | undefined>(undefined);
    const [numRelevantRecordsUsedInAiryResponse, setNumRelevantRecordsUsedInAiryResponse] = useState<number>(0);
    const [query, setQuery] = useState("");
    const [tipsDialogOpen, setTipsDialogOpen] = useState(false);
    const [dataIndexingPending, setDataIndexingPending] = useState<boolean>(false);

    let selectedTable: Table | undefined = undefined;
    let selectedTableConfig: AiryTableConfigWithDefinedDataIndexField | undefined = undefined;

    let askAiryButton = <Button marginBottom={3} disabled={true} variant='primary'>Ask Airy</Button>;

    if (askAiryTopic === 'anything') {
        askAiryButton = <AskAiryAboutAnythingButton isLicensedUser={isLicensedUser}
                                                    askAiryIsPending={askAiryIsPending}
                                                    statusMessage={statusMessage}
                                                    setStatusMessage={setStatusMessage}
                                                    setAskAiryIsPending={setAskAiryIsPending}
                                                    askAiryService={askAiryService}
                                                    setAiryResponse={setAiryResponse}
                                                    setSearchResults={setSearchResults}
                                                    query={query}/>
    } else if (askAiryTopic !== undefined) {
        selectedTable = base.getTableByIdIfExists(askAiryTopic) ?? undefined;
        if (selectedTable !== undefined) {
            selectedTableConfig = airyTableConfigs.find(airyTableConfig => airyTableConfig.table.id === selectedTable!.id)


            if (selectedTableConfig !== undefined) {
                askAiryButton =
                    <Suspense fallback={<Button disabled={true} variant='primary'><Loader position='relative' top='1px'
                                                                                          fillColor='white'
                                                                                          scale={0.2}/>&nbsp; Loading
                        Records..</Button>}>
                        <AskAiryAboutTableButton
                            dataIndexingPending={dataIndexingPending}
                            setDataIndexingPending={setDataIndexingPending}
                            isLicensedUser={isLicensedUser}
                            setNumRelevantRecordsUsedInAiAnswer={setNumRelevantRecordsUsedInAiryResponse}
                            statusMessage={statusMessage}
                            setStatusMessage={setStatusMessage}
                            setAiryResponse={setAiryResponse}
                            askAiryIsPending={askAiryIsPending}
                            setAskAiryIsPending={setAskAiryIsPending}
                            askAiryService={askAiryService}
                            airyTableConfig={selectedTableConfig}
                            selectedView={selectedView}
                            setSearchResults={setSearchResults}
                            query={query}
                        />
                    </Suspense>
            }
        }
    }

    return (<>
            <Box style={{
                padding: '2rem',
                gap: '1rem',
                display: 'flex',
                flexDirection: 'column',
                margin: 'auto',
                maxWidth: '500px',
                width: '100%'
            }}>
                {!isLicensedUser && <LicenseRequiredMessage/>}
                <Box>
                    <FormField label='What do you want to ask Airy about?'>
                        <Select
                            disabled={askAiryIsPending}
                            options={[
                                {value: undefined, label: ''},
                                {value: 'anything', label: 'Anything (unrelated to your Airtable data)'},
                                ...airyTableConfigs.map(airyTableConfig => ({
                                    value: airyTableConfig.table.id,
                                    label: airyTableConfig.table.name
                                }))]}
                            value={askAiryTopic}
                            onChange={(askAiryTopic) => {
                                setAiryResponse(undefined);
                                setNumRelevantRecordsUsedInAiryResponse(0);
                                setSearchResults(undefined);
                                setSelectedView(undefined);
                                setStatusMessage('');
                                setAskAiryTopic(askAiryTopic ? askAiryTopic as 'anything' | TableId : undefined);
                            }}
                        />
                    </FormField>
                </Box>

                {selectedTable && selectedTable.views.length > 1 &&
                    <Box marginBottom={2}>
                        <FormFieldLabelWithTooltip fieldLabel='(Optional) Select a View'
                                                   fieldLabelTooltip='Views are helpful for filtering the records Airy uses to answer your queries.'/>
                        <ViewPicker
                            disabled={askAiryIsPending}
                            shouldAllowPickingNone={true}
                            allowedTypes={[ViewType.GRID]}
                            placeholder={''}
                            table={selectedTable}
                            view={selectedView}
                            onChange={newView => {
                                setNumRelevantRecordsUsedInAiryResponse(0);
                                setSearchResults(undefined);
                                setStatusMessage('');
                                setAiryResponse(undefined);
                                setSelectedView(newView ?? undefined);
                            }}
                        />
                    </Box>
                }

                <Box marginBottom={2}>
                    <FormField label='Query'>
                <textarea
                    maxLength={1500}
                    rows={2}
                    style={{
                        padding: '0.5rem',
                        backgroundColor: '#f2f2f2',
                        border: "none",
                        resize: "vertical",
                        color: askAiryIsPending ? 'lightGray' : '#333333'
                    }}
                    disabled={askAiryIsPending}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Ask Airy anything..."
                />
                        <TextButton margin={1} onClick={() => setTipsDialogOpen(true)} width='fit-content' icon='info'>
                            Guide to using Ask Airy
                        </TextButton>
                        <Tips tipsDialogOpen={tipsDialogOpen} setTipsDialogOpen={setTipsDialogOpen}/>
                    </FormField>
                </Box>

                {askAiryButton}

                {airyResponse && <AiryResponse airyResponse={airyResponse}
                                               setAskAiryIsPending={setAskAiryIsPending}
                                               numRelevantRecordsUsedInAiryResponse={numRelevantRecordsUsedInAiryResponse}/>}

            </Box>
            {searchResults && selectedTableConfig &&
                <Box width='85%' height='500px' marginBottom={5}>
                    <Heading>Potentially Relevant Records:</Heading>
                    <RecordCardList
                        fields={selectedTableConfig.airyFields}
                        height='500px'
                        style={{height: '500px'}}
                        records={searchResults}
                    />
                </Box>
            }
        </>
    )
}