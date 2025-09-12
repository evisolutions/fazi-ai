const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login endpoint with hardcoded credentials
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Check hardcoded credentials
    if (username !== config.login.username || password !== config.login.password) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        username: username
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      user: {
        username: username
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

router.post('/check-token', authenticateToken, (req, res) => {
  res.json({
    message: 'Token is valid'
  });
});

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ 
    message: 'Logout successful. Please remove the token from client storage.' 
  });
});

module.exports = router;
