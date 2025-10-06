import React from 'react';

const PhaseIndicator = ({ currentPhase }) => {
    return (
        <div className="phase-indicator">
            <h2>Current Processing Phase</h2>
            <p>{currentPhase}</p>
        </div>
    );
};

export default PhaseIndicator;