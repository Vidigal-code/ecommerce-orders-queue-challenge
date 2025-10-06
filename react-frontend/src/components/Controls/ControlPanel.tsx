import React from 'react';

const ControlPanel: React.FC<{ onStart: () => void; onReset: () => void }> = ({ onStart, onReset }) => {
    return (
        <div className="control-panel">
            <button onClick={onStart}>Start Order Processing</button>
            <button onClick={onReset}>Reset Database</button>
        </div>
    );
};

export default ControlPanel;