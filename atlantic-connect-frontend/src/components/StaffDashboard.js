// src/components/StaffDashboard.js
import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';

const StaffDashboard = ({ user }) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Staff Dashboard</Typography>
      <Typography variant="h6" gutterBottom>Welcome back, {user.name}!</Typography>
      
      {/* Example cards from the PDF */}
      <Paper sx={{p: 2, mt: 2}}>
        <Typography variant="h6">Next Upcoming Shift</Typography>
        <Typography>No upcoming shifts. Time to find one!</Typography>
      </Paper>
      <Paper sx={{p: 2, mt: 2}}>
        <Typography variant="h6">Weekly Earnings Summary</Typography>
        <Typography>$0.00</Typography>
      </Paper>
      <Button variant="contained" sx={{mt: 3}}>Find New Shifts</Button>
    </Box>
  );
};

export default StaffDashboard;