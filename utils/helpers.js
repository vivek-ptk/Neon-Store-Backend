// Helper function to validate image file types
const isValidImageType = (mimetype) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
  ];
  return allowedTypes.includes(mimetype);
};

// Helper function to generate unique filename
const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const extension = originalName.split('.').pop();
  return `meme_${timestamp}_${random}.${extension}`;
};

// Helper function to validate tags
const validateTags = (tags) => {
  if (!Array.isArray(tags)) return false;
  
  return tags.every(tag => 
    typeof tag === 'string' && 
    tag.length > 0 && 
    tag.length <= 50 &&
    /^[a-zA-Z0-9\s\-_]+$/.test(tag)
  );
};

// Helper function to sanitize search query
const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  
  return query
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .trim()
    .slice(0, 200);
};

// Helper function to calculate popularity score
const calculatePopularityScore = (upvotes, downloads, createdAt) => {
  const daysSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyFactor = Math.max(0.1, 1 / (daysSinceCreation + 1));
  
  return (upvotes * 3 + downloads) * recencyFactor;
};

// Helper function to format API response
const formatMemeResponse = (meme, userId = null) => {
  return {
    id: meme._id,
    image_url: meme.image_url,
    tags: meme.tags,
    upvotes: meme.upvotes,
    downloads: meme.downloads,
    title: meme.title,
    description: meme.description,
    uploadedBy: meme.uploadedBy,
    createdAt: meme.createdAt,
    updatedAt: meme.updatedAt,
    hasUpvoted: userId ? meme.upvotedBy.includes(userId) : false,
    popularityScore: calculatePopularityScore(meme.upvotes, meme.downloads, meme.createdAt)
  };
};

// Helper function to validate pagination parameters
const validatePagination = (page, limit) => {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    skip: (validatedPage - 1) * validatedLimit
  };
};

// Helper function to build MongoDB aggregation pipeline for tag statistics
const buildTagStatsPipeline = (limit = 50) => {
  return [
    { $unwind: '$tags' },
    { 
      $group: { 
        _id: '$tags', 
        count: { $sum: 1 },
        totalUpvotes: { $sum: '$upvotes' },
        totalDownloads: { $sum: '$downloads' },
        avgUpvotes: { $avg: '$upvotes' },
        lastUsed: { $max: '$createdAt' }
      } 
    },
    { $sort: { count: -1, totalUpvotes: -1 } },
    { $limit: limit },
    { 
      $project: { 
        tag: '$_id', 
        count: 1, 
        totalUpvotes: 1, 
        totalDownloads: 1,
        avgUpvotes: { $round: ['$avgUpvotes', 2] },
        lastUsed: 1,
        _id: 0 
      } 
    }
  ];
};

module.exports = {
  isValidImageType,
  generateUniqueFileName,
  validateTags,
  sanitizeSearchQuery,
  calculatePopularityScore,
  formatMemeResponse,
  validatePagination,
  buildTagStatsPipeline
};
