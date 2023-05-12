import React, {Suspense, useState} from "react";
import {
    Box,
    Button,
    FormField,
    Heading,
    Icon,
    Link,
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

function StreamedAIResponse({aiResponse, setAskAiryIsPending}: {
    aiResponse: ReadableStream<Uint8Array>,
    setAskAiryIsPending: (pending: boolean) => void
}) {
    const {data} = useReadableStream(aiResponse, setAskAiryIsPending);
    const dataWithNewlines = data.split('\n').map((line, index) => (<Text key={index}>{line}</Text>))
    return <Box padding={2}>{dataWithNewlines}</Box>
}

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
    const [selectedTable, setSelectedTable] = useState<Table | undefined>(undefined);
    const [selectedView, setSelectedView] = useState<View | undefined>(undefined);
    const [searchResults, setSearchResults] = useState<Record[] | undefined>(undefined);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [AiryResponse, setAiryResponse] = useState<ReadableStream<Uint8Array> | string | undefined>(undefined);
    const [numRelevantRecordsUsedInAiryResponse, setNumRelevantRecordsUsedInAiryResponse] = useState<number>(0);
    const [query, setQuery] = useState("");

    return (
        <Box style={{
            padding: '2rem',
            gap: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            margin: 'auto',
            maxWidth: '600px',
            width: '100%'
        }}>
            {!isLicensedUser &&
                <Box display='flex' justifyContent='center' alignContent='center' alignItems='center' flexWrap='wrap'>
                    <Text size='large'>A license is required to use Ask Airy.</Text>
                    <Link
                        size='large'
                        style={{display: 'inline'}}
                        href='https://www.zoftware-solutions.com/l/ask-airy'
                        target='_blank'
                    >&nbsp;<Button margin={3}
                                   style={{padding: '0.5rem'}}
                                   variant='primary'
                                   size='small'>
                        Start Free Trial
                    </Button>
                    </Link>
                </Box>
            }
            <Box>
                <FormField label='What do you want to ask Airy about?'>
                    <Select
                        disabled={askAiryIsPending}
                        options={[{value: undefined, label: ''}, ...airyTableConfigs.map(airyTableConfig => ({
                            value: airyTableConfig.table.id,
                            label: airyTableConfig.table.name
                        }))]}
                        value={selectedTable && selectedTable.id}
                        onChange={(tableId) => {
                            tableId && setSelectedTable(base.getTableByIdIfExists(tableId as string) ?? undefined);
                        }}
                    />
                </FormField>
            </Box>

            {selectedTable && selectedTable.views.length > 1 &&
                <Box>
                    <FormFieldLabelWithTooltip fieldLabel='(Optional) Select a View'
                                               fieldLabelTooltip='Views can be helpful for limiting which records Airy uses to answer your queries'/>
                    <ViewPicker
                        shouldAllowPickingNone={true}
                        allowedTypes={[ViewType.GRID]}
                        table={selectedTable}
                        view={selectedView}
                        onChange={newView => setSelectedView(newView ?? undefined)}
                    />
                </Box>
            }

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
                        isLicensedUser={isLicensedUser}
                        setNumRelevantRecordsUsedInAiAnswer={setNumRelevantRecordsUsedInAiryResponse}
                        setStatusMessage={setStatusMessage}
                        setAIResponse={setAiryResponse}
                        askAiryIsPending={askAiryIsPending}
                        setAskAiryIsPending={setAskAiryIsPending}
                        askAiryService={askAiryService}
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
                <Box>
                    <Heading display='inline-block'>Airy's Response </Heading>
                    <Tooltip
                        fitInWindowMode={Tooltip.fitInWindowModes.NUDGE}
                        content={() => numRelevantRecordsUsedInAiryResponse == 0
                            ? <Text margin='0.5rem' as='span' size='small' textColor='white'>
                                Warning: Airy may produce inaccurate information. Always crosscheck Airy\'s
                                responses with the actual data.
                            </Text>
                            : <>
                                <Text margin='0.5rem' as='span' size='small' textColor='white'>
                                    {`Airy was able to use the top ${numRelevantRecordsUsedInAiryResponse} most relevant records to generate this response.`}
                                </Text>
                                <br/>
                                <Text margin='0.5rem' as='span' size='small' textColor='white'>
                                    Airy may produce inaccurate information.
                                </Text>
                                <br/>
                                <Text margin='0.5rem' as='span' size='small' textColor='white'>
                                    Always crosscheck Airy's responses with your actual data.
                                </Text>
                            </>
                        }
                        placementX={Tooltip.placements.CENTER}
                        placementY={Tooltip.placements.TOP}>
                        <Icon position='relative' fillColor='red' name="info"
                              size={16} marginLeft='0.25rem'/>
                    </Tooltip>
                    {
                        typeof AiryResponse === 'string'
                            ? <Text>{AiryResponse}</Text>
                            : <StreamedAIResponse setAskAiryIsPending={setAskAiryIsPending} aiResponse={AiryResponse}/>
                    }
                </Box>
            }

            {searchResults && selectedTable &&
                <Box height='500px'>
                    <Heading>Potentially Relevant Records:</Heading>
                    <RecordCardList
                        fields={airyTableConfigs.find(airyTableConfig => airyTableConfig.table.id === selectedTable.id)?.airyFields ?? []}
                        height='500px'
                        style={{height: '500px'}}
                        records={searchResults}
                    />
                </Box>
            }
        </Box>
    )
}