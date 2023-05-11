import React, {Suspense, useState} from "react";
import {
    Box,
    Button,
    FormField,
    Heading,
    Icon,
    Input,
    Loader,
    RecordCardList,
    Select,
    SelectButtons,
    Text,
    Tooltip
} from "@airtable/blocks/ui";
import {Base, Record, Table} from "@airtable/blocks/models";
import {AskAiryServiceInterface} from "../types/CoreTypes";
import {AskAiryButton} from "./AskAiryButton";
import {AiryTableConfigWithDefinedDataIndexField} from "../types/ConfigurationTypes";
import {FormFieldLabelWithTooltip} from "./FormFieldLabelWithTooltip";
import useReadableStream from "../utils/UseReadableStream";

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
                          askAiIsPending,
                          setAskAiIsPending,
                          askAiService,
                          airyTableConfigs,
                          base
                      }: {
    askAiIsPending: boolean,
    setAskAiIsPending: (pending: boolean) => void,
    askAiService: AskAiryServiceInterface,
    airyTableConfigs: AiryTableConfigWithDefinedDataIndexField[],
    base: Base
}) => {
    const [table, setTable] = useState<Table | undefined>(undefined);
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
                        disabled={askAiIsPending}
                        options={airyTableConfigs.map(airyTableConfig => ({
                            value: airyTableConfig.table.id,
                            label: airyTableConfig.table.name
                        }))}
                        value={table && table.id}
                        onChange={(tableId) => {
                            tableId && setTable(base.getTableByIdIfExists(tableId as string) ?? undefined);
                        }}
                    />
                </FormField>
            </Box>

            <FormField label='Query'>
                <textarea
                    rows={2}
                    style={{padding: '0.5rem', backgroundColor: '#f2f2f2', border: "none", resize: "vertical"}}
                    disabled={askAiIsPending}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Ask Airy anything about your table..."
                />
            </FormField>
            <Suspense
                fallback={<Button disabled={true} variant='primary'>Loading Records...</Button>}>
                {table
                    ? <AskAiryButton
                        setNumRelevantRecordsUsedInAiAnswer={setNumRelevantRecordsUsedInAiryResponse}
                        setStatusMessage={setStatusMessage}
                        setAIResponse={setAiryResponse}
                        askAiryIsPending={askAiIsPending}
                        setAskAiryIsPending={setAskAiIsPending}
                        askAiryService={askAiService}
                        airyTableConfig={(airyTableConfigs
                            // TODO: Make sure there are no edge cases here.
                            .find(airyTableConfig => airyTableConfig.table.id === table.id) as AiryTableConfigWithDefinedDataIndexField)}
                        setSearchResults={setSearchResults}
                        query={query}
                    />
                    : <Button disabled={true} variant='primary'>Ask Airy</Button>
                }
            </Suspense>

            {statusMessage.length !== 0 && <Box display='flex' justifyContent='center'>
                <Text fontSize={16}><Loader scale={0.25}/>&nbsp; &nbsp;{statusMessage}</Text>
            </Box>}

            {AiryResponse &&
                // TODO: Make tooltip say users should verify the results themselves
                <Box>
                    <Heading display='inline-block'>Airy's Response </Heading>
                    <Tooltip
                    fitInWindowMode={Tooltip.fitInWindowModes.NUDGE}
                    content={() => <Text margin='0 0.5rem 0 0.5rem' textColor='white' size='small' display='inline'>
                        {numRelevantRecordsUsedInAiryResponse == 0
                            ? 'Airy did not use any data from Airtable to respond to this query.'
                            : `Airy was able to use the top ${numRelevantRecordsUsedInAiryResponse} most relevant records to generate this response.`}</Text>}
                    placementX={Tooltip.placements.CENTER}
                    placementY={Tooltip.placements.TOP}>
                    <Icon position='relative' fillColor='dark-gray' name="info"
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