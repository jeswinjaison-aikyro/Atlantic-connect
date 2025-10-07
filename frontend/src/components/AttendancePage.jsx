import React, { useState, useEffect } from 'react';
import './AttendancePage.css';

const AttendancePage = ({ staff, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [locationStatus, setLocationStatus] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  useEffect(() => {
    checkGeolocationSupport();
    loadAttendanceHistory();
  }, []);

  const checkGeolocationSupport = () => {
    if (!navigator.geolocation) {
      setMessage({
        text: 'Geolocation is not supported by this browser. Please use a modern browser.',
        type: 'error'
      });
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/attendance/history/${staff.staffId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceHistory(data.records || []);
      }
    } catch (error) {
      console.error('Error loading attendance history:', error);
    }
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

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000 // Use cached location if less than 30 seconds old
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let errorMessage = 'Location access failed. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please enable location permissions and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location service is unavailable. Please check your GPS settings.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
          }
          reject(new Error(errorMessage));
        },
        options
      );
    });
  };

  const markAttendance = async (action = 'check-in') => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    setLocationStatus('Getting your location...');

    try {
      // Get current location
      const location = await getCurrentLocation();
      setLocationStatus(`Location acquired (±${Math.round(location.accuracy)}m accuracy)`);

      // Get assigned clinic location from staff data
      const assignedClinic = staff.assignedClinic;
      if (!assignedClinic) {
        throw new Error('No clinic assigned to your profile. Please contact admin.');
      }

      // Calculate distance to clinic
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        assignedClinic.latitude,
        assignedClinic.longitude
      );

      console.log(`Distance to ${assignedClinic.name}: ${distance.toFixed(2)} meters`);

      // Check if within geofence
      if (distance > assignedClinic.radius) {
        throw new Error(
          `You are ${Math.round(distance)}m away from ${assignedClinic.name}. ` +
          `Please get within ${assignedClinic.radius}m to mark attendance.`
        );
      }

      // Prepare attendance data
      const attendanceData = {
        staffId: staff.staffId,
        action: action,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        },
        clinicId: assignedClinic.id,
        distance: Math.round(distance),
        timestamp: new Date().toISOString()
      };

      // Send to server
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attendanceData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          text: `${action === 'check-in' ? 'Check-in' : 'Check-out'} successful! ` +
                `Distance: ${Math.round(distance)}m from ${assignedClinic.name}`,
          type: 'success'
        });
        
        // Refresh attendance history
        loadAttendanceHistory();
        
        // Store backup in localStorage
        const backup = JSON.parse(localStorage.getItem('attendanceBackup') || '[]');
        backup.push(attendanceData);
        localStorage.setItem('attendanceBackup', JSON.stringify(backup.slice(-10))); // Keep last 10 records
        
      } else {
        throw new Error(result.message || 'Failed to mark attendance');
      }

    } catch (error) {
      setMessage({
        text: error.message,
        type: 'error'
      });
      console.error('Attendance marking error:', error);
    } finally {
      setLoading(false);
      setLocationStatus('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('staffData');
    onLogout();
  };

  return (
    <div className="attendance-container">
      <div className="attendance-card">
        <div className="attendance-header">
          <div className="staff-info">
            <h2>Welcome, {staff.name}</h2>
            <p>Staff ID: {staff.staffId}</p>
            {staff.assignedClinic && (
              <p className="clinic-name">📍 {staff.assignedClinic.name}</p>
            )}
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        <div className="instructions">
          <h3>Instructions:</h3>
          <ul>
            <li>Ensure you are within the clinic premises</li>
            <li>Allow location access when prompted</li>
            <li>Click the appropriate button below to mark attendance</li>
          </ul>
        </div>

        {locationStatus && (
          <div className="location-status">
            📍 {locationStatus}
          </div>
        )}

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="attendance-buttons">
          <button
            onClick={() => markAttendance('check-in')}
            disabled={loading}
            className="attendance-btn check-in"
          >
            {loading ? 'Processing...' : '🕐 Mark Check-In'}
          </button>

          <button
            onClick={() => markAttendance('check-out')}
            disabled={loading}
            className="attendance-btn check-out"
          >
            {loading ? 'Processing...' : '🕐 Mark Check-Out'}
          </button>
        </div>

        <div className="attendance-info">
          <p>Your location will be verified to ensure you're at the assigned clinic</p>
          <p>Accuracy: GPS location within {staff.assignedClinic?.radius || 75}m radius</p>
        </div>

        {attendanceHistory.length > 0 && (
          <div className="attendance-history">
            <h3>Recent Attendance</h3>
            <div className="history-list">
              {attendanceHistory.slice(0, 5).map((record, index) => (
                <div key={index} className="history-item">
                  <span className={`action ${record.action}`}>
                    {record.action === 'check-in' ? '🟢' : '🔴'} {record.action}
                  </span>
                  <span className="time">
                    {new Date(record.timestamp).toLocaleString()}
                  </span>
                  <span className="distance">
                    {record.distance}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;