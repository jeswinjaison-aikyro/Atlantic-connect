// src/components/ClinicDashboard.js
import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';

const ClinicDashboard = ({ user }) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Clinic Dashboard</Typography>
      <Typography variant="h6" gutterBottom>Welcome, {user.name} from {user.facilityName}!</Typography>

      {/* Example cards from the PDF */}
      <Paper sx={{p: 2, mt: 2}}>
        <Typography variant="h6">Active Shifts</Typography>
        <Typography>You have 0 active shifts.</Typography>
      </Paper>
      <Paper sx={{p: 2, mt: 2}}>
        <Typography variant="h6">Recent Invoices</Typography>
        <Typography>No new invoices.</Typography>
      </Paper>
      <Button variant="contained" sx={{mt: 3}}>Create a New Staff Request</Button>
    </Box>
  );
};

export default ClinicDashboard;