// src/components/AuthCallback.js
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Parse the token from the URL query parameters
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      // Store the token in localStorage for future API requests
      localStorage.setItem('authToken', token);
      
      // Redirect to the user's dashboard
      navigate('/dashboard');
    } else {
      // Handle login failure
      console.error("Authentication failed. No token received.");
      navigate('/');
    }
  }, [location, navigate]);

  return <div>Loading...</div>;
};

export default AuthCallback;