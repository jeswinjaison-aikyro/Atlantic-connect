// src/components/LoginPage.js
import React from 'react';
import { Container, Box, Typography, Button, Paper } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';

const BACKEND_URL = "http://localhost:5000";

const LoginPage = () => {
  const socialLogin = (provider) => {
    window.location.href = `${BACKEND_URL}/auth/${provider}`;
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={6} sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 4
      }}>
        <Typography component="h1" variant="h5">
          Welcome to Atlantic Connect
        </Typography>
        <Typography component="p" sx={{ mt: 1, color: 'text.secondary' }}>
          Sign in to continue
        </Typography>
        <Box sx={{ mt: 3, width: '100%' }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={() => socialLogin('google')}
            sx={{ mb: 2, backgroundColor: '#DB4437', '&:hover': { backgroundColor: '#C33D2E' } }}
          >
            Sign in with Google
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<FacebookIcon />}
            onClick={() => socialLogin('facebook')}
            sx={{ backgroundColor: '#4267B2', '&:hover': { backgroundColor: '#365899' } }}
          >
            Sign in with Meta
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;