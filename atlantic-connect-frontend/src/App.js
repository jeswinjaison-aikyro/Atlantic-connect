// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/Login';
import Dashboard from './components/Dashboard';
import AuthCallback from './components/AuthCallback';
import ProfilePage from './components/ProfilePage'; // <-- Import ProfilePage
import Layout from './components/Layout'; 
import DataDeletionPage from './components/DataDeletionPage'; 
import EmailVerificationPage from './components/EmailVerificationPage';
import VerificationFailedPage from './components/VerificationFailedPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/data-deletion" element={<DataDeletionPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/verification-failed" element={<VerificationFailedPage />} />
          {/* Protected routes are now nested inside the Layout */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;