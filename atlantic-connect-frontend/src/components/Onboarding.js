// src/components/Onboarding.js
import React, { useState } from 'react';
import axios from 'axios';
import { Container, Paper, Typography, Box, Button, TextField, ToggleButtonGroup, ToggleButton } from '@mui/material';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const Onboarding = ({ user, onProfileComplete }) => {
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState({});

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setRole(newRole);
      setFormData({}); // Reset form data when role changes
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    try {
      const payload = { role, ...formData };
      const response = await axios.post(`${BACKEND_URL}/api/profile/complete`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      onProfileComplete(response.data); // Notify the parent component
    } catch (error) {
      console.error("Failed to complete profile:", error);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={6} sx={{ p: 4, mt: 8 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Complete Your Profile, {user.name}
        </Typography>
        <Typography align="center" sx={{ mb: 3 }}>
          Please select your role to get started.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <ToggleButtonGroup value={role} exclusive onChange={handleRoleChange} aria-label="user role">
            <ToggleButton value="staff" aria-label="staff">I'm a Healthcare Professional</ToggleButton>
            <ToggleButton value="clinic" aria-label="clinic">I'm a Facility Manager</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {role && (
          <Box component="form" onSubmit={handleSubmit}>
            {role === 'staff' && (
              <>
                <Typography variant="h6" sx={{ mb: 2 }}>Staff Details</Typography>
                <TextField label="Phone Number" name="phone" fullWidth required sx={{ mb: 2 }} onChange={handleInputChange} />
                <Button variant="outlined" component="label" fullWidth>
                  Upload License/Certification
                  <input type="file" hidden />
                </Button>
              </>
            )}

            {role === 'clinic' && (
              <>
                <Typography variant="h6" sx={{ mb: 2 }}>Facility Details</Typography>
                <TextField label="Facility Name" name="facilityName" fullWidth required sx={{ mb: 2 }} onChange={handleInputChange} />
                <TextField label="Facility Address" name="facilityAddress" fullWidth required sx={{ mb: 2 }} onChange={handleInputChange} />
              </>
            )}

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>
              Save and Continue
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Onboarding;