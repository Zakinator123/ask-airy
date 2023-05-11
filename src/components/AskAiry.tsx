import React, {Suspense, useState} from "react";
import {
    Box,
    Button,
    FormField,
    Heading,
    Icon,
    Loader,
    RecordCardList,
    Select,
    Text,
    Tooltip,
    ViewPicker
} from "@airtable/blocks/ui";
import {Base, Record, Table, View, ViewType} from "@airtable/blocks/models";
import {AskAiryServiceInterface} from "../types/CoreTypes";
import {AskAiryButton} from "./AskAiryButton";
import {AiryTableConfigWithDefinedDataIndexField} from "../types/ConfigurationTypes";
import useReadableStream from "../utils/UseReadableStream";
import {FormFieldLabelWithTooltip} from "./FormFieldLabelWithTooltip";

function StreamedAIResponse({aiResponse, setAskAIPending}: {
    aiResponse: ReadableStream<Uint8Array>,
    setAskAIPending: (pending: boolean) => void
}) {
    const {data, error, streamIsOpen} = useReadableStream(aiResponse);

    if (streamIsOpen === false) {
        setAskAIPending(false);
    }

    const dataWithNewlines = data.split('\n').map((line, index) => (
        <Text key={index}>{line}</Text>
    ))

    return <Box padding={2}>{dataWithNewlines}</Box>
}

export const AskAiry = ({
                            askAiryIsPending,
                            setAskAiIsPending,
                            askAiService,
                            airyTableConfigs,
                            base
                        }: {
    askAiryIsPending: boolean,
    setAskAiIsPending: (pending: boolean) => void,
    askAiService: AskAiryServiceInterface,
    airyTableConfigs: AiryTableConfigWithDefinedDataIndexField[],
    base: Base
}) => {
    const [selectedTable, setSelectedTable] = useState<Table | undefined>(undefined);
    const [selectedView, setSelectedView] = useState<View | undefined>(undefined);
    const [searchResults, setSearchResults] = useState<Record[] | undefined>(undefined);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [AiryResponse, setAiryResponse] = useState<ReadableStream<Uint8Array> | string | undefined>(undefined);
    const [numRelevantRecordsUsedInAiryResponse, setNumRelevantRecordsUsedInAiryResponse] = useState<number>(0);
    const [query, setQuery] = useState("");

    return (
        <Box style={{
            padding: '3rem',
            gap: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            margin: 'auto',
            maxWidth: '600px',
            width: '100%'
        }}>
            <Box>
                <FormField label='What do you want to ask Airy about?'>
                    <Select
                        disabled={askAiryIsPending}
                        options={airyTableConfigs.map(airyTableConfig => ({
                            value: airyTableConfig.table.id,
                            label: airyTableConfig.table.name
                        }))}
                        value={selectedTable && selectedTable.id}
                        onChange={(tableId) => {
                            tableId && setSelectedTable(base.getTableByIdIfExists(tableId as string) ?? undefined);
                        }}
                    />
                </FormField>
            </Box>

            {selectedTable &&
                <Box>
                    <FormFieldLabelWithTooltip fieldLabel='(Optional) Select a View' fieldLabelTooltip='Views can be helpful for limiting which records Airy uses to answer your queries'/>
                        <ViewPicker
                            shouldAllowPickingNone={true}
                            allowedTypes={[ViewType.GRID]}
                            table={selectedTable}
                            view={selectedView}
                            onChange={newView => setSelectedView(newView ?? undefined)}
                        />
                </Box>
            }

            {/*// TODO: Add View Filter*/}
            {/*// TODO: Add ability to Ask Airy not about tables.*/}
            {/**/}
            {/*// TODO: Add guide dialog for how best to use Ask Airy - guide should mention that Airy is not a chatbot and will not remember prev questions.*/}
            {/*// TODO: Fix bug of pasting in a query after another answer has been generated crashing app*/}
            <FormField label='Query'>
                <textarea
                    rows={2}
                    style={{padding: '0.5rem', backgroundColor: '#f2f2f2', border: "none", resize: "vertical"}}
                    disabled={askAiryIsPending}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Ask Airy anything about your table..."
                />
            </FormField>
            <Suspense
                fallback={<Button disabled={true} variant='primary'>Loading Records...</Button>}>
                {selectedTable
                    ? <AskAiryButton
                        setNumRelevantRecordsUsedInAiAnswer={setNumRelevantRecordsUsedInAiryResponse}
                        setStatusMessage={setStatusMessage}
                        setAIResponse={setAiryResponse}
                        askAiryIsPending={askAiryIsPending}
                        setAskAiryIsPending={setAskAiIsPending}
                        askAiryService={askAiService}
                        airyTableConfig={(airyTableConfigs
                            // TODO: Make sure there are no edge cases here.
                            .find(airyTableConfig => airyTableConfig.table.id === selectedTable.id) as AiryTableConfigWithDefinedDataIndexField)}
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

            {AiryResponse &&
                // TODO: Make tooltip say users should verify the results themselves
                <Box>
                    <Heading display='inline-block'>Airy's Response </Heading>
                    <Tooltip
                        fitInWindowMode={Tooltip.fitInWindowModes.NUDGE}
                        content={() => <Text margin='0.5rem 0.5rem 0.5rem 0.5rem' textColor='white' size='small'
                        >
                            {numRelevantRecordsUsedInAiryResponse == 0
                                ? 'Warning: Airy may produce inaccurate information. Always crosscheck Airy\'s responses with the actual data.'
                                : <>{`Airy was able to use the top ${numRelevantRecordsUsedInAiryResponse} most relevant records to generate this response.`}<br/>
                                    Airy may produce inaccurate information.<br/> Always crosscheck Airy's
                                    responses with your actual data.</>}
                        </Text>}
                        placementX={Tooltip.placements.CENTER}
                        placementY={Tooltip.placements.TOP}>
                        <Icon position='relative' fillColor='red' name="info"
                              size={16} marginLeft='0.25rem'/>
                    </Tooltip>
                    {
                        typeof AiryResponse === 'string'
                            ? <Text>{AiryResponse}</Text>
                            : <StreamedAIResponse setAskAIPending={setAskAiIsPending} aiResponse={AiryResponse}/>
                    }
                </Box>
            }

            {searchResults &&
                <Box height='500px'>
                    <Heading>Potentially Relevant Records:</Heading>
                    <RecordCardList
                        height='500px'
                        style={{height: '500px'}}
                        records={searchResults}
                    />
                </Box>
            }
        </Box>
    )
}