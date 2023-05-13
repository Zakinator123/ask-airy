import useReadableStream from "../utils/UseReadableStream";
import {Box, Text} from "@airtable/blocks/ui";
import React from "react";

export const StreamedAiryResponse = ({airyResponse, setAskAiryIsPending}: {
    airyResponse: ReadableStream<Uint8Array>,
    setAskAiryIsPending: (pending: boolean) => void
}) => {
    const {data} = useReadableStream(airyResponse, setAskAiryIsPending);
    const streamText = data === undefined ? '' : data.split('\n').map((line, index) => (<Text key={index}>{line}</Text>));
    return <Box padding={2}>{streamText}</Box>
}