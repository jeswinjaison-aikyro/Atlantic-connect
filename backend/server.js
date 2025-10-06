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
const bcrypt = require('bcryptjs');
const validator = require('validator');
const nodemailer = require('nodemailer');

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
const users = []; // Example: [{ id: 'google-123', email: 'test@gmail.com', name: 'Test User', ... }]
const emailVerifications = []; // Store email verification tokens and OTPs

// --- Email Configuration ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// --- Utility Functions for Email Auth ---
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const generateVerificationToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const sendVerificationEmail = async (email, otp, verificationLink) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email - Atlantic Connect',
        html: `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                <h2 style="color: #333; text-align: center;">Welcome to Atlantic Connect!</h2>
                <p>Please verify your email address to complete your registration.</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
                    <h3 style="margin: 0; color: #333;">Your OTP Code:</h3>
                    <p style="font-size: 24px; font-weight: bold; color: #4CAF50; margin: 10px 0;">${otp}</p>
                    <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
                </div>
                
                <p style="text-align: center; margin: 20px 0;">
                    <a href="${verificationLink}" 
                       style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email Address
                    </a>
                </p>
                
                <p style="color: #666; font-size: 14px;">
                    If you didn't request this verification, please ignore this email.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

// --- Passport.js Strategies ---

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback" // This must match your Google Cloud Console
},
(accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    let user = users.find(u => u.email === email);

    if (user) {
        // User exists, log them in
        console.log("Existing user found:", user);
        return done(null, user);
    } else {
        // New user, create in mock DB
        const newUser = {
            id: profile.id,
            name: profile.displayName,
            email: email,
            provider: 'google',
            emailVerified: true,
            isProfileComplete: false,
            role: null,
        };
        users.push(newUser);
        console.log("New user created:", newUser);
        return done(null, newUser);
    }
}));

// Facebook Strategy
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
            emailVerified: true,
            isProfileComplete: false,
            role: null,
        };
        users.push(newUser);
        return done(null, newUser);
    }
}));

// Serve React build files
app.use(express.static(path.join(__dirname, '..', 'atlantic-connect-frontend', 'build')));

// --- Email-based Authentication Routes ---

// Register with email
app.post('/auth/email/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, password, and name are required' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const otp = generateOTP();
        const verificationToken = generateVerificationToken();
        const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

        const newUser = {
            id: crypto.randomBytes(16).toString('hex'),
            name,
            email,
            password: hashedPassword,
            provider: 'email',
            emailVerified: false,
            isProfileComplete: false,
            role: null,
            createdAt: new Date()
        };

        const verificationData = {
            email,
            otp,
            token: verificationToken,
            userId: newUser.id,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
            createdAt: new Date()
        };

        emailVerifications.push(verificationData);
        users.push(newUser);

        const emailSent = await sendVerificationEmail(email, otp, verificationLink);

        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to send verification email' });
        }

        res.status(201).json({
            message: 'Registration successful! Please check your email for verification code.',
            userId: newUser.id
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Verify OTP
app.post('/auth/email/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const verificationRecord = emailVerifications.find(v => v.email === email && v.otp === otp);
        if (!verificationRecord) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date() > verificationRecord.expiresAt) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        const user = users.find(u => u.id === verificationRecord.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.emailVerified = true;
        // Remove verification record
        const index = emailVerifications.indexOf(verificationRecord);
        emailVerifications.splice(index, 1);

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({
            message: 'Email verified successfully!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                isProfileComplete: user.isProfileComplete
            }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Verify email via link
app.get('/auth/email/verify-link', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.redirect(`${process.env.CLIENT_URL}/verification-failed?reason=missing-token`);
        }

        const verificationRecord = emailVerifications.find(v => v.token === token);
        if (!verificationRecord) {
            return res.redirect(`${process.env.CLIENT_URL}/verification-failed?reason=invalid-token`);
        }

        if (new Date() > verificationRecord.expiresAt) {
            return res.redirect(`${process.env.CLIENT_URL}/verification-failed?reason=expired-token`);
        }

        const user = users.find(u => u.id === verificationRecord.userId);
        if (!user) {
            return res.redirect(`${process.env.CLIENT_URL}/verification-failed?reason=user-not-found`);
        }

        user.emailVerified = true;
        // Remove verification record
        const index = emailVerifications.indexOf(verificationRecord);
        emailVerifications.splice(index, 1);

        const jwtToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Redirect to frontend with token
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${jwtToken}`);

    } catch (error) {
        console.error('Link verification error:', error);
        res.redirect(`${process.env.CLIENT_URL}/verification-failed?reason=server-error`);
    }
});

// Email login
app.post('/auth/email/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        const user = users.find(u => u.email === email && u.provider === 'email');
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.emailVerified) {
            return res.status(401).json({
                message: 'Please verify your email before logging in',
                needsVerification: true
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                isProfileComplete: user.isProfileComplete
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Resend verification email
app.post('/auth/email/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = users.find(u => u.email === email && u.provider === 'email');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.emailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Remove existing verifications for email
        const existingRecords = emailVerifications.filter(v => v.email === email);
        existingRecords.forEach(record => {
            const idx = emailVerifications.indexOf(record);
            emailVerifications.splice(idx, 1);
        });

        const otp = generateOTP();
        const verificationToken = generateVerificationToken();
        const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

        const verificationData = {
            email,
            otp,
            token: verificationToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
            createdAt: new Date()
        };

        emailVerifications.push(verificationData);

        const emailSent = await sendVerificationEmail(email, otp, verificationLink);
        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to send verification email' });
        }

        res.json({ message: 'Verification email sent! Please check your inbox.' });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// --- Existing Social Authentication Routes ---

// Start Google authentication
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Google callback
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login/failed', session: false }),
    (req, res) => {
        const token = jwt.sign({ id: req.user.id, email: req.user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    }
);

// Start Facebook authentication
app.get('/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'], session: false })
);

// Facebook callback
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login/failed', session: false }),
    (req, res) => {
        const token = jwt.sign({ id: req.user.id, email: req.user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    }
);

// JWT verification middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403); // Forbidden

        req.user = users.find(u => u.id === decoded.id);
        next();
    });
};

// Protected route: Get user profile
app.get('/api/profile', verifyToken, (req, res) => {
    if (!req.user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.json(req.user);
});

// Profile completion endpoint
app.post('/api/profile/complete', verifyToken, (req, res) => {
    const user = req.user;
    const { role, phone, facilityName, facilityAddress } = req.body;

    if (!user) {
        return res.status(404).json({ message: "User not found." });
    }

    if (!role) {
        return res.status(400).json({ message: "Role is required." });
    }

    user.role = role;
    if (role === 'staff') {
        user.phone = phone;
    } else if (role === 'clinic') {
        user.facilityName = facilityName;
        user.facilityAddress = facilityAddress;
    }

    user.isProfileComplete = true;
    console.log("User profile updated:", user);
    res.status(200).json(user);
});

// --- META Data Deletion Endpoints ---

const parseSignedRequest = (signedRequest, secret) => {
    const [encodedSig, payload] = signedRequest.split('.');

    const sig = Buffer.from(encodedSig, 'base64').toString('hex');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());

    if (data.algorithm.toUpperCase() !== 'HMAC-SHA256') {
        throw new Error('Unknown algorithm. Expected HMAC-SHA256');
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSig = hmac.digest('hex');

    if (sig !== expectedSig) {
        throw new Error('Bad Signed JSON signature!');
    }

    return data;
};

app.post('/meta/data-deletion', (req, res) => {
    console.log("Received data deletion request from Meta.");
    const signedRequest = req.body.signed_request;

    if (!signedRequest) {
        return res.status(400).send('Invalid request: signed_request is required.');
    }

    try {
        const data = parseSignedRequest(signedRequest, process.env.FACEBOOK_APP_SECRET);
        const userId = data.user_id;

        const userIndex = users.findIndex(u => u.id === userId && u.provider === 'facebook');
        if (userIndex > -1) {
            console.log(`Deleting data for user ID: ${userId}`);
            users.splice(userIndex, 1);
        } else {
            console.log(`User with ID ${userId} not found.`);
        }

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

app.get('/meta/deletion-status/:confirmation_code', (req, res) => {
    console.log(`Meta is checking status for code: ${req.params.confirmation_code}`);
    res.json({ status: 'complete' });
});

// Catchall handler to serve React app for unmatched routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'atlantic-connect-frontend', 'build', 'index.html'));
});

// --- Server Start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
