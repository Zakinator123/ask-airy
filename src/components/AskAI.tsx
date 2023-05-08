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
import {AskAIServiceInterface} from "../types/CoreTypes";
import {AskAIButton} from "./AskAIButton";
import {SearchTableConfigWithDefinedSearchIndexField} from "../types/ConfigurationTypes";
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

type AIPowerPreferenceOptions = { label: 'Fast'; value: 'fast' } | { label: 'Powerful'; value: 'powerful' }
const aiPowerOptions: AIPowerPreferenceOptions[] = [
    {value: "powerful", label: "Powerful"},
    {value: "fast", label: "Fast"},
];

export const AskAI = ({
                          askAiIsPending,
                          setAskAiIsPending,
                          askAiService,
                          searchTableConfigs,
                          base
                      }: {
    askAiIsPending: boolean,
    setAskAiIsPending: (pending: boolean) => void,
    askAiService: AskAIServiceInterface,
    searchTableConfigs: SearchTableConfigWithDefinedSearchIndexField[],
    base: Base
}) => {
    const [tableToSearch, setTableToSearch] = useState<Table | undefined>(undefined);
    const [searchResults, setSearchResults] = useState<Record[] | undefined>(undefined);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [AIResponse, setAIResponse] = useState<ReadableStream<Uint8Array> | string | undefined>(undefined);
    const [numRelevantRecordsUsedInAiAnswer, setNumRelevantRecordsUsedInAiAnswer] = useState<number>(0);
    const [query, setQuery] = useState("");
    const [aiPowerPreference, setAiPowerPreference] = useState(aiPowerOptions[0]!.value);

    return (
        <Box style={{
            padding: '3rem',
            gap: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            margin: 'auto',
            maxWidth: '550px',
            width: '100%'
        }}>
            <Box>
                <FormField label='What do you want to ask the AI about?'>
                    <Select
                        disabled={askAiIsPending}
                        options={searchTableConfigs.map(searchTableConfig => ({
                            value: searchTableConfig.table.id,
                            label: searchTableConfig.table.name
                        }))}
                        value={tableToSearch && tableToSearch.id}
                        onChange={(tableId) => {
                            tableId && setTableToSearch(base.getTableByIdIfExists(tableId as string) ?? undefined);
                        }}
                    />
                </FormField>
            </Box>

            <Box>
                <FormFieldLabelWithTooltip fieldLabel={'AI Performance'}
                                           fieldLabelTooltip={'A more powerful AI will take longer to respond, but may produce better results.'}/>
                <SelectButtons
                    value={aiPowerPreference}
                    disabled={askAiIsPending}
                    onChange={newValue => setAiPowerPreference(newValue as AIPowerPreferenceOptions['value'])}
                    options={aiPowerOptions}
                />
            </Box>

            <FormField label='Query'>
                <Input
                    disabled={askAiIsPending}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Ask the AI anything about your table..."
                />
            </FormField>
            <Suspense
                fallback={<Button disabled={true} variant='primary'>Loading Records... <Loader scale={0.2}/></Button>}>
                {tableToSearch
                    ? <AskAIButton
                        setNumRelevantRecordsUsedInAiAnswer={setNumRelevantRecordsUsedInAiAnswer}
                        setStatusMessage={setStatusMessage}
                        setAIResponse={setAIResponse}
                        searchIsPending={askAiIsPending}
                        setAskAiIsPending={setAskAiIsPending}
                        askAIService={askAiService}
                        searchTableConfig={(searchTableConfigs
                            // TODO: Make sure there are no edge cases here.
                            .find(searchTableConfig => searchTableConfig.table.id === tableToSearch.id) as SearchTableConfigWithDefinedSearchIndexField)}
                        setSearchResults={setSearchResults}
                        aiPowerPreference={aiPowerPreference}
                        query={query}
                    />
                    : <Button disabled={true} variant='primary'>Ask AI</Button>
                }
            </Suspense>

            {statusMessage.length !== 0 && <Box display='flex' justifyContent='center'>
                <Text fontSize={16}><Loader scale={0.25}/>&nbsp; &nbsp;{statusMessage}</Text>
            </Box>}

            {AIResponse &&
                <Box>
                    <Heading display='inline-block'>AI Response </Heading><Tooltip
                    fitInWindowMode={Tooltip.fitInWindowModes.NUDGE}
                    content={() => <Text margin='0 0.5rem 0 0.5rem' textColor='white' size='small' display='inline'>
                        {numRelevantRecordsUsedInAiAnswer == 0
                            ? 'The AI did not use any data from Airtable to respond to this query.'
                            : `The AI was able to use the top ${numRelevantRecordsUsedInAiAnswer} most relevant records to generate this response.`}</Text>}
                    placementX={Tooltip.placements.CENTER}
                    placementY={Tooltip.placements.TOP}>
                    <Icon position='relative' fillColor='dark-gray' name="info"
                          size={16} marginLeft='0.25rem'/>
                </Tooltip>
                    {
                        typeof AIResponse === 'string'
                            ? <Text>{AIResponse}</Text>
                            : <StreamedAIResponse setAskAIPending={setAskAiIsPending} aiResponse={AIResponse}/>
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