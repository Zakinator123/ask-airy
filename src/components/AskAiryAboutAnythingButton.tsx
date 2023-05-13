import React, {useEffect} from "react";
import {Button} from "@airtable/blocks/ui";
import {AskAiryServiceInterface} from "../types/CoreTypes";
import {Record} from "@airtable/blocks/models";
import {Toast} from "./Toast";
import {toast} from "react-toastify";

export const AskAiryAboutAnythingButton = ({
                                            isLicensedUser,
                                            askAiryIsPending,
                                            setStatusMessage,
                                            setAskAiryIsPending,
                                            askAiryService,
                                            setAiryResponse,
                                            setSearchResults,
                                            query
                                        }: {
    isLicensedUser: boolean,
    askAiryIsPending: boolean,
    setStatusMessage: (message: string) => void,
    setAskAiryIsPending: (pending: boolean) => void,
    askAiryService: AskAiryServiceInterface,
    setAiryResponse: (response: ReadableStream | string | undefined) => void,
    setSearchResults: (results: Record[] | undefined) => void,
    query: string
}) => {
    useEffect(() => () => toast.dismiss(), []);

    const executeAskAiry = async () => {
        setAskAiryIsPending(true);
        setAiryResponse(undefined);
        setSearchResults(undefined);
        setStatusMessage("Asking Airy...");

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
        <Toast containerId='ask-airy-anything-error'/>
    </>
}