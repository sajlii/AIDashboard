import React from 'react';
import ReactDOM from 'react-dom/client';
import IncidentDashboard from './components/IncidentDashboard'; // or App if you're using App.js as main

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <IncidentDashboard />
  </React.StrictMode>
);
