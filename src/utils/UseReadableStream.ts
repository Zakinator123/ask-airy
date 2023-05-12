import { useState, useEffect } from 'react';
import {UseReadableStreamResult} from "../types/CoreTypes";

const useReadableStream = (stream: ReadableStream<Uint8Array> | undefined, setAskAiryPending: (askAiryPending: boolean) => void): UseReadableStreamResult => {
    const [data, setData] = useState<string>('');

    useEffect(() => {
        if (!stream) {
            console.error('No stream provided to useReadableStream hook')
            setAskAiryPending(false);
            return;
        }

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
            } catch (err: any) {
                setData(JSON.stringify(err));
                console.log(err);
            }
        };

        readData();

        return () => {
            stream.cancel();
            setAskAiryPending(false);
        };
    }, [stream]);

    return { data };
};

export default useReadableStream;
