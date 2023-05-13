import React from 'react';
import {Box, Heading, Icon, Text, Tooltip} from "@airtable/blocks/ui";
import {StreamedAIResponse} from "./StreamedAiryResponse";

export const AiryResponse = ({airyResponse, numRelevantRecordsUsedInAiryResponse, setAskAiryIsPending}: {
    airyResponse: ReadableStream | string,
    numRelevantRecordsUsedInAiryResponse: number,
    setAskAiryIsPending: (pending: boolean) => void
}) => {

    return <Box>
        <Heading display='inline-block'>Airy's Response </Heading>
        <Tooltip
            fitInWindowMode={Tooltip.fitInWindowModes.NUDGE}
            content={() => numRelevantRecordsUsedInAiryResponse == 0
                ? <>
                    <Text margin='0.5rem' as='span' size='small' textColor='white'>
                        Warning: Airy may produce inaccurate information.
                    </Text>
                    <br/>
                    <Text margin='0.5rem' as='span' size='small' textColor='white'>
                        Select a table above if you would like to ask Airy about your Airtable data.
                    </Text></>
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
            typeof airyResponse === 'string'
                ? <Text>{airyResponse}</Text>
                : <StreamedAIResponse setAskAiryIsPending={setAskAiryIsPending} airyResponse={airyResponse}/>
        }
    </Box>
}