const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    // Check for session-based authentication (OAuth)
    if (req.user) {
      return next();
    }

    // Check for JWT token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    // Check for session-based authentication (OAuth)
    if (req.user) {
      return next();
    }

    // Check for JWT token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      req.user = user;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
