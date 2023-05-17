import React, {useEffect} from "react";
import {Box, Button, Loader, Text} from "@airtable/blocks/ui";
import {AskAiryServiceInterface} from "../types/CoreTypes";
import {Record} from "@airtable/blocks/models";
import {Toast} from "./Toast";
import {toast} from "react-toastify";

export const AskAiryAboutAnythingButton = ({
                                            isLicensedUser,
                                            askAiryIsPending,
                                            statusMessage,
                                            setStatusMessage,
                                            setAskAiryIsPending,
                                            askAiryService,
                                            setAiryResponse,
                                            setSearchResults,
                                            query
                                        }: {
    isLicensedUser: boolean,
    askAiryIsPending: boolean,
    statusMessage: string,
    setStatusMessage: (message: string) => void,
    setAskAiryIsPending: (pending: boolean) => void,
    askAiryService: AskAiryServiceInterface,
    setAiryResponse: (response: ReadableStream | string | undefined) => void,
    setSearchResults: (results: Record[] | undefined) => void,
    query: string
}) => {
    useEffect(() => () => toast.dismiss(), []);

    const executeAskAiry = async () => {
        setAiryResponse(undefined);
        setStatusMessage("Asking Airy...");
        setAskAiryIsPending(true);
        setAiryResponse(undefined);
        setSearchResults(undefined);

        const aiResponse = await askAiryService.askAiryAboutAnything(query);
        setStatusMessage('');
        if (aiResponse.errorOccurred) {
            setAiryResponse(aiResponse.message);
            setAskAiryIsPending(false);
        } else {
            setAiryResponse(aiResponse.streamingResponse);
        }
    }

    return <>
        <Button disabled={askAiryIsPending || query.length === 0}
                variant='primary'
                onClick={() => {
                    isLicensedUser
                        ? executeAskAiry()
                        : toast.error('You must have a license to use Ask Airy. See the License tab for more details.', {
                            autoClose: 10000,
                            containerId: 'ask-airy-anything-error'
                        });
                }}>
            Ask Airy
        </Button>
        {
            statusMessage.length !== 0 && <Box display='flex' justifyContent='center'>
                <Text fontSize={16}>{askAiryIsPending && <Loader scale={0.25}/>}&nbsp; &nbsp;{statusMessage}</Text>
            </Box>
        }
        <Toast containerId='ask-airy-anything-error'/>
    </>
}