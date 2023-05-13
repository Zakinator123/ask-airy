import { useState, useEffect } from 'react';
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
                const { value, done } = await reader.read();

                if (done) {
                    reader.releaseLock();
                    stream.cancel();
                    setAskAiryPending(false);
                    return;
                }

                setData((prevData) => prevData + decoder.decode(value));
                readData();
            } catch (err) {
                const error = err as Error;
                console.error(error);
                reader.releaseLock();
                setAskAiryPending(false);
                setData(error.message);
            }
        };

        readData();

        return () => {
            stream.cancel();
        };
    }, [stream]);

    return { data };
};

export default useReadableStream;
