import React from 'react';
import { Dashboard } from './pages/Dashboard';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0d14] text-[#f1f5f9]">
      <Dashboard />
    </div>
  );
};

export default App;
