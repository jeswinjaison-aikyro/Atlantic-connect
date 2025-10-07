// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
app.set('trust proxy', 1); // trust first proxy (e.g., if behind Nginx or Heroku)


// In-memory storage (replace with your database)
let staffMembers = [
  {
    staffId: 'nurse001',
    password: '$2b$10$u8IrnUcNDRYnG18XeHjaDOT46NKf684T2k9I.l6WQcw02SnbFPkqu', // 'password123'
    name: 'Sarah Johnson',
    role: 'Nurse',
    assignedClinic: {
      id: 'clinic_1',
      name: 'Downtown Medical Center',
      latitude: 25.8888,
      longitude: -74.0060,
      radius: 75
    }
  },
  {
    staffId: 'cleaner002',
    password: '$2b$10$u8IrnUcNDRYnG18XeHjaDOT46NKf684T2k9I.l6WQcw02SnbFPkqu', // 'password123'
    name: 'Michael Chen',
    role: 'Cleaner',
    assignedClinic: {
      id: 'clinic_2',
      name: 'Suburban Health Clinic',
      latitude:10.530197,
      longitude: 76.201860,
      radius: 100
    }
  }
];

let attendanceRecords = [];

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourapp.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later.'
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Utility functions
const generateToken = (staff) => {
  return jwt.sign(
    { 
      staffId: staff.staffId, 
      name: staff.name, 
      role: staff.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { staffId, password } = req.body;

    if (!staffId || !password) {
      return res.status(400).json({ message: 'Staff ID and password are required' });
    }
    
    // DEBUG 1: Log incoming credentials
    console.log(`[LOGIN ATTEMPT] Staff ID: ${staffId}`);
    // DO NOT LOG THE PLAINTEXT PASSWORD IN PRODUCTION!
    console.log(`[DEBUG] Incoming Password Length: ${password.length}`); 

    // Find staff member
    const staff = staffMembers.find(s => s.staffId === staffId);
    if (!staff) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // DEBUG 2: Log the stored hash
    console.log(`[DEBUG] Stored Hash: ${staff.password.substring(0, 35)}...`); // Log only start of hash for brevity/security

    // Verify password
    const isValidPassword = await bcrypt.compare(password, staff.password);
    
    // DEBUG 3: Log the comparison result
    console.log(`[DEBUG] bcrypt.compare result: ${isValidPassword}`);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(staff);

    // Return user data (without password)
    const { password: _, ...staffData } = staff;
    
    res.json({
      message: 'Login successful',
      token,
      staff: staffData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Token valid', 
    user: req.user 
  });
});

// Attendance routes
app.post('/api/attendance/mark', authenticateToken, async (req, res) => {
  try {
    const { staffId, action, location, clinicId, distance } = req.body;

    // Validate request
    if (!staffId || !action || !location || !clinicId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['check-in', 'check-out'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be check-in or check-out' });
    }

    // Verify staff member
    const staff = staffMembers.find(s => s.staffId === staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Verify location is within geofence
    const clinic = staff.assignedClinic;
    const calculatedDistance = calculateDistance(
      location.latitude,
      location.longitude,
      clinic.latitude,
      clinic.longitude
    );

    if (calculatedDistance > clinic.radius) {
      return res.status(400).json({ 
        message: `Location verification failed. You are ${Math.round(calculatedDistance)}m away from ${clinic.name}. Please get within ${clinic.radius}m.`,
        distance: Math.round(calculatedDistance),
        required: clinic.radius
      });
    }

    // Check for duplicate entries (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentRecord = attendanceRecords.find(record => 
      record.staffId === staffId && 
      record.action === action &&
      new Date(record.timestamp) > fiveMinutesAgo
    );

    if (recentRecord) {
      return res.status(400).json({ 
        message: `Duplicate ${action} detected. Please wait before marking attendance again.`
      });
    }

    // Create attendance record
    const attendanceRecord = {
      id: Date.now().toString(),
      staffId,
      staffName: staff.name,
      action,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      },
      clinicId,
      clinicName: clinic.name,
      distance: Math.round(calculatedDistance),
      timestamp: new Date().toISOString(),
      verified: true
    };

    attendanceRecords.push(attendanceRecord);

    console.log(`Attendance marked: ${staff.name} - ${action} at ${clinic.name}`);

    res.json({
      message: `${action} recorded successfully`,
      record: attendanceRecord
    });

  } catch (error) {
    console.error('Attendance marking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get attendance history
app.get('/api/attendance/history/:staffId', authenticateToken, (req, res) => {
  try {
    const { staffId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Verify staff member exists
    const staff = staffMembers.find(s => s.staffId === staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Get attendance records for staff member
    const records = attendanceRecords
      .filter(record => record.staffId === staffId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.json({
      staffId,
      records,
      total: records.length
    });

  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all attendance records (admin only)
app.get('/api/attendance/all', authenticateToken, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const sortedRecords = attendanceRecords
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

    res.json({
      records: paginatedRecords,
      pagination: {
        page,
        limit,
        total: attendanceRecords.length,
        pages: Math.ceil(attendanceRecords.length / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching all attendance records:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Serve static files in production
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Handle 404
app.get((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Attendance system ready for healthcare staff`);
});

module.exports = app;