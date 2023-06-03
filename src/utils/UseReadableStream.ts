import {useEffect, useState} from 'react';
import {UseReadableStreamResult} from "../types/CoreTypes";

const useReadableStream = (stream: ReadableStream<Uint8Array> | undefined, setAskAiryPending: (askAiryPending: boolean) => void): UseReadableStreamResult => {
    const [data, setData] = useState<string>('');

    useEffect(() => {
        if (!stream) {
            console.error('No stream provided to useReadableStream hook')
            return;
        }
        setAskAiryPending(true);

        const reader = stream.getReader();
        const decoder = new TextDecoder('utf-8');

        const readData = async () => {
            try {
                const {value, done} = await reader.read();

                if (done) {
                    reader.releaseLock();
                    stream.cancel();
                    setAskAiryPending(false);
                    return;
                }

                setData((prevData) => prevData + decoder.decode(value));
                readData();
            } catch (err: any) {
                if (err?.type === "MAX_TOKENS") {
                    reader.releaseLock();
                    setAskAiryPending(false);
                    setData((prevData) => prevData + " \n------ \n Airy could not complete the response because it was too long.\n Try again, or adjust your query by asking Airy to be more concise.");
                    return;
                }

                const error = err as Error;
                console.error(error);
                reader.releaseLock();
                setAskAiryPending(false);
                setData(error.message);
                stream.cancel().catch((e) => console.error(e));
            }
        };

        readData();

        return () => {
            // TODO: Test this
            console.log("Releasing lock");
            reader.releaseLock();
            console.log("Reader lock released");
            stream.cancel();
            console.log("Stream canceled");
        };
    }, [stream, setAskAiryPending]);

    return {data};
};

export default useReadableStream;
