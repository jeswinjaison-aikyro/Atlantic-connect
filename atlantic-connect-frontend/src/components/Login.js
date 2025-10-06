// src/components/LoginPage.js

import React, { useState } from 'react';
import { 
    Container, 
    Box, 
    Typography, 
    Button, 
    Paper, 
    TextField, 
    Divider, 
    Alert,
    CircularProgress,
    Tab,
    Tabs
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import EmailIcon from '@mui/icons-material/Email';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const LoginPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        otp: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [showOTPField, setShowOTPField] = useState(false);
    const [pendingVerification, setPendingVerification] = useState(false);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setFormData({ email: '', password: '', name: '', otp: '' });
        setMessage({ text: '', type: '' });
        setShowOTPField(false);
        setPendingVerification(false);
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const socialLogin = (provider) => {
        window.location.href = `${BACKEND_URL}/auth/${provider}`;
    };

    const handleEmailRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch(`${BACKEND_URL}/auth/email/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ 
                    text: 'Registration successful! Please check your email for verification code.', 
                    type: 'success' 
                });
                setShowOTPField(true);
                setPendingVerification(true);
            } else {
                setMessage({ text: data.message || 'Registration failed', type: 'error' });
            }
        } catch (error) {
            console.error('Registration error:', error);
            setMessage({ text: 'Network error. Please try again.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch(`${BACKEND_URL}/auth/email/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token with the same key as social login
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect to dashboard (same flow as social login)
                window.location.href = '/dashboard';
            } else {
                if (data.needsVerification) {
                    setMessage({ 
                        text: data.message + ' Check your email or request a new verification link.', 
                        type: 'warning' 
                    });
                    setShowOTPField(true);
                    setPendingVerification(true);
                } else {
                    setMessage({ text: data.message || 'Login failed', type: 'error' });
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            setMessage({ text: 'Network error. Please try again.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOTPVerification = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch(`${BACKEND_URL}/auth/email/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    otp: formData.otp
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token with the same key as social login
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                setMessage({ text: 'Email verified successfully! Redirecting...', type: 'success' });
                setTimeout(() => {
                    // Redirect to dashboard (same flow as social login)
                    window.location.href = '/dashboard';
                }, 2000);
            } else {
                setMessage({ text: data.message || 'OTP verification failed', type: 'error' });
            }
        } catch (error) {
            console.error('OTP verification error:', error);
            setMessage({ text: 'Network error. Please try again.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setIsLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch(`${BACKEND_URL}/auth/email/resend-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ text: 'Verification email sent! Please check your inbox.', type: 'success' });
            } else {
                setMessage({ text: data.message || 'Failed to resend verification', type: 'error' });
            }
        } catch (error) {
            console.error('Resend verification error:', error);
            setMessage({ text: 'Network error. Please try again.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
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
                <Paper elevation={3} sx={{ padding: 4, width: '100%', maxWidth: 400 }}>
                    <Typography component="h1" variant="h4" align="center" gutterBottom>
                        Welcome to Atlantic Connect
                    </Typography>
                    <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
                        Sign in to continue
                    </Typography>

                    {message.text && (
                        <Alert severity={message.type} sx={{ mb: 2 }}>
                            {message.text}
                        </Alert>
                    )}

                    {/* Social Login Buttons */}
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<GoogleIcon />}
                        onClick={() => socialLogin('google')}
                        sx={{ 
                            mb: 2, 
                            backgroundColor: '#DB4437', 
                            '&:hover': { backgroundColor: '#C33D2E' } 
                        }}
                    >
                        Sign in with Google
                    </Button>

                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<FacebookIcon />}
                        onClick={() => socialLogin('facebook')}
                        sx={{ 
                            mb: 2,
                            backgroundColor: '#4267B2', 
                            '&:hover': { backgroundColor: '#365899' } 
                        }}
                    >
                        Sign in with Meta
                    </Button>

                    <Divider sx={{ my: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            OR
                        </Typography>
                    </Divider>

                    {/* Email Authentication Tabs */}
                    <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 2 }}>
                        <Tab label="Sign In" />
                        <Tab label="Register" />
                    </Tabs>

                    {/* Sign In Tab */}
                    {tabValue === 0 && !pendingVerification && (
                        <Box component="form" onSubmit={handleEmailLogin} sx={{ mt: 1 }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                value={formData.email}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                startIcon={<EmailIcon />}
                                sx={{ mt: 3, mb: 2 }}
                                disabled={isLoading}
                            >
                                {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
                            </Button>
                        </Box>
                    )}

                    {/* Register Tab */}
                    {tabValue === 1 && !pendingVerification && (
                        <Box component="form" onSubmit={handleEmailRegister} sx={{ mt: 1 }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="name"
                                label="Full Name"
                                name="name"
                                autoComplete="name"
                                autoFocus
                                value={formData.name}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={handleInputChange}
                                disabled={isLoading}
                                helperText="Password must be at least 6 characters long"
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                startIcon={<EmailIcon />}
                                sx={{ mt: 3, mb: 2 }}
                                disabled={isLoading}
                            >
                                {isLoading ? <CircularProgress size={24} /> : 'Register'}
                            </Button>
                        </Box>
                    )}

                    {/* OTP Verification Section */}
                    {showOTPField && (
                        <Box>
                            <Divider sx={{ my: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Email Verification
                                </Typography>
                            </Divider>
                            
                            <Box component="form" onSubmit={handleOTPVerification} sx={{ mt: 1 }}>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="otp"
                                    label="Enter 6-digit OTP"
                                    name="otp"
                                    value={formData.otp}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                    inputProps={{ maxLength: 6 }}
                                    helperText="Check your email for the verification code"
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 2, mb: 1 }}
                                    disabled={isLoading || !formData.otp}
                                >
                                    {isLoading ? <CircularProgress size={24} /> : 'Verify Email'}
                                </Button>
                                <Button
                                    fullWidth
                                    variant="text"
                                    onClick={handleResendVerification}
                                    disabled={isLoading}
                                    sx={{ mt: 1 }}
                                >
                                    Resend Verification Email
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Container>
    );
};

export default LoginPage;
