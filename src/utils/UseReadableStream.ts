import { useState, useEffect } from 'react';

interface UseReadableStreamResult {
    data: string;
    error: Error | null;
    streamIsOpen: boolean;
}

const useReadableStream = (stream: ReadableStream<Uint8Array> | undefined): UseReadableStreamResult => {
    const [data, setData] = useState<string>('');
    const [error, setError] = useState<Error | null>(null);
    const [streamIsOpen, setStreamIsOpen] = useState<boolean>(true);

    useEffect(() => {
        if (!stream) {
            setError(new Error('No stream provided'));
            setStreamIsOpen(false);
            return;
        }

        setStreamIsOpen(true);

        const reader = stream.getReader();
        const decoder = new TextDecoder('utf-8');

        const readData = async () => {
            try {
                const { value, done } = await reader.read();

                if (done) {
                    reader.releaseLock();
                    stream.cancel();
                    setStreamIsOpen(false);
                    return;
                }

                setData((prevData) => prevData + decoder.decode(value));
                readData();
            } catch (err) {
                console.log(err);
            }
        };

        readData();

        return () => {
            setStreamIsOpen(false);
            stream.cancel();
        };
    }, [stream]);

    return { data, error, streamIsOpen };
};

export default useReadableStream;
