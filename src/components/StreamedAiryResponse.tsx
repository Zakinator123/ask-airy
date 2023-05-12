import useReadableStream from "../utils/UseReadableStream";
import {Box, Text} from "@airtable/blocks/ui";
import React from "react";

export const StreamedAIResponse = ({airyResponse, setAskAiryIsPending}: {
    airyResponse: ReadableStream<Uint8Array>,
    setAskAiryIsPending: (pending: boolean) => void
}) => {
    const {data} = useReadableStream(airyResponse, setAskAiryIsPending);
    const dataWithNewlines = data.split('\n').map((line, index) => (<Text key={index}>{line}</Text>))
    return <Box padding={2}>{dataWithNewlines}</Box>
}