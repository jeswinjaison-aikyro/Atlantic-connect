
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Container, 
    Box, 
    Typography, 
    Paper, 
    CircularProgress, 
    Alert,
    Button 
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const EmailVerificationPage = () => {
    const [verificationStatus, setVerificationStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            const urlParams = new URLSearchParams(location.search);
            const token = urlParams.get('token');

            if (!token) {
                setVerificationStatus('error');
                setMessage('Invalid verification link. No token provided.');
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/auth/email/verify-link?token=${token}`);
                
                if (response.redirected) {
                    // If redirected, it means verification was successful
                    const redirectUrl = new URL(response.url);
                    const jwtToken = redirectUrl.searchParams.get('token');
                    
                    if (jwtToken) {
                        localStorage.setItem('token', jwtToken);
                        setVerificationStatus('success');
                        setMessage('Email verified successfully! Redirecting to dashboard...');
                        setTimeout(() => {
                            navigate('/dashboard');
                        }, 2000);
                    } else {
                        setVerificationStatus('error');
                        setMessage('Verification failed. Please try again.');
                    }
                } else {
                    setVerificationStatus('error');
                    setMessage('Email verification failed. The link may be expired or invalid.');
                }
            } catch (error) {
                console.error('Verification error:', error);
                setVerificationStatus('error');
                setMessage('Network error occurred. Please try again.');
            }
        };

        verifyEmail();
    }, [location, navigate]);

    const handleBackToLogin = () => {
        navigate('/login');
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
                    <Typography component="h1" variant="h4" gutterBottom>
                        Email Verification
                    </Typography>

                    {verificationStatus === 'loading' && (
                        <Box sx={{ mt: 3, mb: 3 }}>
                            <CircularProgress size={60} />
                            <Typography variant="body1" sx={{ mt: 2 }}>
                                Verifying your email...
                            </Typography>
                        </Box>
                    )}

                    {verificationStatus === 'success' && (
                        <Box sx={{ mt: 3, mb: 3 }}>
                            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                            <Alert severity="success" sx={{ mb: 2 }}>
                                {message}
                            </Alert>
                        </Box>
                    )}

                    {verificationStatus === 'error' && (
                        <Box sx={{ mt: 3, mb: 3 }}>
                            <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {message}
                            </Alert>
                            <Button 
                                variant="contained" 
                                onClick={handleBackToLogin}
                                sx={{ mt: 2 }}
                            >
                                Back to Login
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Container>
    );
};

export default EmailVerificationPage;
