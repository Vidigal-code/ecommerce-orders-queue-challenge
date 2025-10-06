import React from 'react';

const ResetButton: React.FC<{ onReset: () => void }> = ({ onReset }) => {
    return (
        <button onClick={onReset} className="reset-button">
            Reset
        </button>
    );
};

export default ResetButton;