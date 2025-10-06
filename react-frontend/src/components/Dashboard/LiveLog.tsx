import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

const LiveLog = () => {
    const [logs, setLogs] = useState([]);
    const { connect, disconnect } = useWebSocket('ws://localhost:3000');

    useEffect(() => {
        connect((message) => {
            setLogs((prevLogs) => [...prevLogs, message]);
        });

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return (
        <div className="live-log">
            <h2>Live Log</h2>
            <ul>
                {logs.map((log, index) => (
                    <li key={index}>{log}</li>
                ))}
            </ul>
        </div>
    );
};

export default LiveLog;