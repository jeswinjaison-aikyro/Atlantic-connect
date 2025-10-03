// src/components/DataDeletionPage.js
import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';

const DataDeletionPage = () => {
    return (
        <Container component="main" maxWidth="md">
            <Paper elevation={4} sx={{ p: 4, mt: 8 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Data Deletion Policy
                </Typography>
                <Typography paragraph>
                    To request the deletion of your data from Atlantic Connect, you can remove our app from your Facebook account settings.
                </Typography>
                <Typography paragraph>
                    Follow these steps:
                </Typography>
                <Box component="ol" sx={{ pl: 4 }}>
                    <li>Log in to your Facebook account.</li>
                    <li>Go to "Settings & Privacy" > "Settings".</li>
                    <li>In the left sidebar, click on "Apps and Websites".</li>
                    <li>Find "Atlantic Connect" in your list of active apps.</li>
                    <li>Select it and click the "Remove" button.</li>
                </Box>
                <Typography paragraph sx={{ mt: 2 }}>
                    Once you remove the app, Facebook will notify us to delete all data associated with your account, and we will process this request automatically.
                </Typography>
            </Paper>
        </Container>
    );
};

export default DataDeletionPage;