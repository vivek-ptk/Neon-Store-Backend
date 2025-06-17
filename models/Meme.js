const mongoose = require('mongoose');

const memeSchema = new mongoose.Schema({
  image_url: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{
    type: String,
    required: true,
    trim: true,
    lowercase: true
  }],
  upvotes: {
    type: Number,
    default: 0,
    min: 0
  },
  downloads: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  cloudinary_id: {
    type: String,
    required: true
  },
  metadata: {
    width: Number,
    height: Number,
    format: String,
    size: Number
  }
}, {
  timestamps: true
});

// Index for better search performance
memeSchema.index({ tags: 1 });
memeSchema.index({ upvotes: -1 });
memeSchema.index({ downloads: -1 });
memeSchema.index({ createdAt: -1 });

// Virtual for popularity score (combination of upvotes and downloads)
memeSchema.virtual('popularityScore').get(function() {
  return (this.upvotes * 2) + this.downloads;
});

module.exports = mongoose.model('Meme', memeSchema);
