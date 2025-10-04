// server.js

require('dotenv').config();

const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();
// Tell Express to trust the X-Forwarded-Proto header from Render's proxy
app.enable('trust proxy');

// --- Middleware ---
app.use(cors({ origin: process.env.CLIENT_URL })); // Allow requests from your React app
app.use(passport.initialize());
app.use(bodyParser.json());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// --- Mock Database ---
// In a real app, you'd use a proper database like MongoDB or PostgreSQL.
const users = []; // Example: [{ id: 'google-123', email: 'test@gmail.com', name: 'Test User' }]

// --- Passport.js Strategies ---

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback" // This must match the authorized redirect URI in your Google Cloud Console
},
(accessToken, refreshToken, profile, done) => {
    // This is the "verify" callback function
    // It's called after a user successfully authenticates with Google.
    const email = profile.emails[0].value;
    let user = users.find(u => u.email === email);
    
    if (user) {
        // User exists, log them in
        console.log("Existing user found:", user);
        return done(null, user);
    } else {
        // New user, create them in our mock DB
        const newUser = {
            id: profile.id, // The unique ID from the provider
            name: profile.displayName,
            email: email,
            provider: 'google',
            isProfileComplete: false,
            role: null,
        };
        users.push(newUser);
        console.log("New user created:", newUser);
        return done(null, newUser);
    }
}));

// Facebook Strategy (Similar logic)
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'emails']
},
(accessToken, refreshToken, profile, done) => {
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.com`;
    let user = users.find(u => u.email === email);
    
    if (user) {
        return done(null, user);
    } else {
        const newUser = {
            id: profile.id,
            name: profile.displayName,
            email: email,
            provider: 'facebook',
        };
        users.push(newUser);
        return done(null, newUser);
    }
}));

// This tells Express to serve any static files from the React app's build directory
app.use(express.static(path.join(__dirname, '..', 'atlantic-connect-frontend', 'build')));

// --- Authentication Routes ---

// 1. Route to start the Google authentication flow
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// 2. Google's callback route
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login/failed', session: false }),
    (req, res) => {
        // On successful authentication, req.user is populated.
        // We create a JWT.
        const token = jwt.sign({ id: req.user.id, email: req.user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Redirect the user back to the React app with the token
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    }
);

// Facebook Routes (similar structure)
app.get('/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'], session: false })
);

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login/failed', session: false }),
    (req, res) => {
        const token = jwt.sign({ id: req.user.id, email: req.user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    }
);

// --- Protected API Route ---

// A simple middleware to verify the JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) return res.sendStatus(401); // Unauthorized
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = users.find(u => u.id === user.id); // Attach full user object
        next();
    });
};

// Example protected route to get the current user's profile
app.get('/api/profile', verifyToken, (req, res) => {
    if (!req.user) {
        return res.status(404).json({ message: "User not found" });
    }
    
    // This sends back the user details (retrieved from our mock DB)
    res.json(req.user);
});

// === NEW ENDPOINT for Profile Completion ===
app.post('/api/profile/complete', verifyToken, (req, res) => {
    // req.user is attached by the verifyToken middleware
    const user = req.user;
    const { role, phone, facilityName, facilityAddress } = req.body;
    
    if (!user) {
        return res.status(404).json({ message: "User not found." });
    }
    
    if (!role) {
        return res.status(400).json({ message: "Role is required." });
    }
    
    // Update the user in our mock database
    user.role = role;
    if (role === 'staff') {
        user.phone = phone;
        // In a real app, you'd handle file uploads for certifications here
    } else if (role === 'clinic') {
        user.facilityName = facilityName;
        user.facilityAddress = facilityAddress;
    }
    
    user.isProfileComplete = true;
    console.log("User profile updated:", user);
    res.status(200).json(user);
});

// === META DATA DELETION ENDPOINTS ===

// Helper function to parse the signed_request from Facebook
const parseSignedRequest = (signedRequest, secret) => {
    const [encodedSig, payload] = signedRequest.split('.');
    
    // Step 1: Decode the data
    const sig = Buffer.from(encodedSig, 'base64').toString('hex');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    
    // Step 2: Check algorithm
    if (data.algorithm.toUpperCase() !== 'HMAC-SHA256') {
        throw new Error('Unknown algorithm. Expected HMAC-SHA256');
    }
    
    // Step 3: Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSig = hmac.digest('hex');
    
    if (sig !== expectedSig) {
        throw new Error('Bad Signed JSON signature!');
    }
    
    return data;
};

// 1. Data Deletion Request Callback URL
// Meta will POST to this endpoint when a user requests data deletion
app.post('/meta/data-deletion', (req, res) => {
    console.log("Received data deletion request from Meta.");
    const signedRequest = req.body.signed_request;
    
    if (!signedRequest) {
        return res.status(400).send('Invalid request: signed_request is required.');
    }
    
    try {
        const data = parseSignedRequest(signedRequest, process.env.FACEBOOK_APP_SECRET);
        const userId = data.user_id;
        
        // --- Your data deletion logic starts here ---
        // For our mock DB, we find the user by their ID and remove them
        const userIndex = users.findIndex(u => u.id === userId && u.provider === 'facebook');
        if (userIndex > -1) {
            console.log(`Deleting data for user ID: ${userId}`);
            users.splice(userIndex, 1); // Remove the user from the array
        } else {
            console.log(`User with ID ${userId} not found.`);
        }
        
        // --- Your data deletion logic ends here ---
        
        // Respond to Meta as required
        const confirmationCode = `deletion_${userId}_${Date.now()}`;
        const statusUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/meta/deletion-status/${confirmationCode}`;
        
        res.json({
            url: statusUrl,
            confirmation_code: confirmationCode
        });
    } catch (error) {
        console.error("Error processing data deletion request:", error.message);
        return res.status(400).send('Error processing request.');
    }
});

// 2. Data Deletion Status Check URL
// Meta will GET this URL to check on the status of the deletion
app.get('/meta/deletion-status/:confirmation_code', (req, res) => {
    // For this mock implementation, we'll always report completion.
    // In a real-world scenario with a job queue, you would check the status of the deletion job.
    console.log(`Meta is checking status for code: ${req.params.confirmation_code}`);
    res.json({
        status: 'complete'
    });
});

// The "catchall" handler: for any request that doesn't match an API route,
// send back the main index.html file from the React app.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'atlantic-connect-frontend', 'build', 'index.html'));
});

// --- Server Start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));