const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  uploadedMemes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meme'
  }],
  upvotedMemes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meme'
  }],
  preferences: {
    favoriteCategories: [String],
    theme: {
      type: String,
      enum: ['light', 'dark', 'neon'],
      default: 'neon'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
