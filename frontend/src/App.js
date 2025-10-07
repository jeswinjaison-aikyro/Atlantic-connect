import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import AttendancePage from './components/AttendancePage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    const staffData = localStorage.getItem('staffData');

    if (token && staffData) {
      try {
        // Verify token with server
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const staff = JSON.parse(staffData);
          setUser(staff);
        } else {
          // Token invalid, clear storage
          localStorage.removeItem('authToken');
          localStorage.removeItem('staffData');
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('staffData');
      }
    }
    
    setLoading(false);
  };

  const handleLogin = (staff) => {
    setUser(staff);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <AttendancePage staff={user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
