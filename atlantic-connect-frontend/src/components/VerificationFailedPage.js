// src/components/VerificationFailedPage.js

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Container, 
    Box, 
    Typography, 
    Paper, 
    Alert,
    Button 
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

const VerificationFailedPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const getErrorMessage = () => {
        const urlParams = new URLSearchParams(location.search);
        const reason = urlParams.get('reason');

        switch (reason) {
            case 'missing-token':
                return 'Invalid verification link. The verification token is missing.';
            case 'invalid-token':
                return 'Invalid verification token. The link may have been tampered with.';
            case 'expired-token':
                return 'Verification link has expired. Please request a new verification email.';
            case 'user-not-found':
                return 'User not found. Please register again.';
            case 'server-error':
                return 'Server error occurred. Please try again later.';
            default:
                return 'Email verification failed. Please try again.';
        }
    };

    const handleBackToLogin = () => {
        navigate('/login');
    };

    const handleRequestNewVerification = () => {
        navigate('/login?tab=1'); // Navigate to register tab
    };

    return (
        <Container component="main" maxWidth="sm">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Paper elevation={3} sx={{ padding: 4, width: '100%', maxWidth: 400, textAlign: 'center' }}>
                    <Typography component="h1" variant="h4" gutterBottom color="error">
                        Verification Failed
                    </Typography>

                    <Box sx={{ mt: 3, mb: 3 }}>
                        <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {getErrorMessage()}
                        </Alert>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Button 
                                variant="contained" 
                                onClick={handleBackToLogin}
                                color="primary"
                            >
                                Back to Login
                            </Button>
                            
                            <Button 
                                variant="outlined" 
                                onClick={handleRequestNewVerification}
                                color="secondary"
                            >
                                Request New Verification
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default VerificationFailedPage;
