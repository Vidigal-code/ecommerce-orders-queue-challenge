import { useEffect, useRef, useState } from 'react';

const useWebSocket = (url: string) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [messages, setMessages] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        const ws = new WebSocket(url);
        setSocket(ws);

        ws.onmessage = (event) => {
            if (isMounted.current) {
                setMessages((prevMessages) => [...prevMessages, event.data]);
            }
        };

        ws.onerror = (event) => {
            setError(`WebSocket error: ${event}`);
        };

        ws.onclose = () => {
            setSocket(null);
        };

        return () => {
            isMounted.current = false;
            ws.close();
        };
    }, [url]);

    return { socket, messages, error };
};

export default useWebSocket;