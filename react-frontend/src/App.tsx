import React, { useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { ControlPanel } from './components/Controls/ControlPanel';
import { ResetButton } from './components/Controls/ResetButton';
import { Dashboard } from './components/Dashboard/Dashboard';
import { useOrderMetrics } from './hooks/useOrderMetrics';

const App: React.FC = () => {
  const { connect, disconnect } = useWebSocket();
  const { metrics, fetchMetrics } = useOrderMetrics();

  useEffect(() => {
    connect();
    fetchMetrics();

    return () => {
      disconnect();
    };
  }, [connect, disconnect, fetchMetrics]);

  return (
    <div className="App">
      <ControlPanel />
      <ResetButton />
      <Dashboard metrics={metrics} />
    </div>
  );
};

export default App;