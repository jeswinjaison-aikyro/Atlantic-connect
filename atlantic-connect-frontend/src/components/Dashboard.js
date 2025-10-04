// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Box, CircularProgress, Button, AppBar, Toolbar, Typography } from '@mui/material';
import Onboarding from './Onboarding';
import StaffDashboard from './StaffDashboard';
import ClinicDashboard from './ClinicDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const response = await axios.get(`${BACKEND_URL}/api/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUser(response.data);
      } catch (err) {
        localStorage.removeItem('authToken');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/');
  };

  // Called from Onboarding component after successful profile update
  const handleProfileComplete = (updatedUser) => {
    setUser(updatedUser);
  };

  const renderContent = () => {
    if (loading) {
      return <CircularProgress />;
    }
    if (!user.isProfileComplete) {
      return <Onboarding user={user} onProfileComplete={handleProfileComplete} />;
    }
    if (user.role === 'staff') {
      return <StaffDashboard user={user} />;
    }
    if (user.role === 'clinic') {
      return <ClinicDashboard user={user} />;
    }
    return <Typography>Unknown user role. Please contact support.</Typography>;
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Atlantic Connect
          </Typography>
          {user && (
            <Button color="inherit" onClick={handleLogout}>Logout</Button>
          )}
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {renderContent()}
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;