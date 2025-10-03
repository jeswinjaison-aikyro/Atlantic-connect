// src/components/ProfilePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Paper, Typography, Box, CircularProgress, Button, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import PlaceIcon from '@mui/icons-material/Place';

const BACKEND_URL = "http://localhost:5000";

const ProfilePage = () => {
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

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (!user) {
        return <Typography>Could not load user profile.</Typography>;
    }

    return (
        <Container component="main" maxWidth="md">
            <Paper elevation={4} sx={{ p: 4, mt: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    My Profile
                </Typography>
                <List>
                    <ListItem>
                        <ListItemIcon><PersonIcon /></ListItemIcon>
                        <ListItemText primary="Full Name" secondary={user.name} />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon><EmailIcon /></ListItemIcon>
                        <ListItemText primary="Email Address" secondary={user.email} />
                    </ListItem>
                    {/* Conditional details based on user role */}
                    {user.role === 'staff' && (
                        <ListItem>
                            <ListItemIcon><PhoneIcon /></ListItemIcon>
                            <ListItemText primary="Phone Number" secondary={user.phone || 'Not provided'} />
                        </ListItem>
                    )}
                    {user.role === 'clinic' && (
                        <>
                            <ListItem>
                                <ListItemIcon><BusinessIcon /></ListItemIcon>
                                <ListItemText primary="Facility Name" secondary={user.facilityName || 'Not provided'} />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><PlaceIcon /></ListItemIcon>
                                <ListItemText primary="Facility Address" secondary={user.facilityAddress || 'Not provided'} />
                            </ListItem>
                        </>
                    )}
                </List>
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button variant="contained" component={RouterLink} to="/dashboard">
                        Back to Dashboard
                    </Button>
                    <Button variant="outlined">
                        Edit Profile
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default ProfilePage;