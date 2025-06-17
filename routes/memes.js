const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const geminiService = require('../config/gemini');
const Meme = require('../models/Meme');
const { upload, handleMulterError } = require('../middleware/upload');

// Upload meme endpoint
router.post('/upload', upload.single('meme'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Get description from request body, default to empty string if not provided
    let { description = "" } = req.body;
    description = description.trim();

    // Upload image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'neon-meme-marketplace',
          quality: 'auto',
          fetch_format: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Convert image to base64 for Gemini API
    const base64Image = req.file.buffer.toString('base64');
    
    // Generate tags using Gemini API
    const tags = await geminiService.generateMemeTags(base64Image);

    // If description is empty, generate it using Gemini
    if (description === "" || description.length === 0) {
      try {
        description = await geminiService.generateMemeDescription(base64Image);
        console.log('Generated description using Gemini:', description);
      } catch (descriptionError) {
        console.warn('Failed to generate description, using fallback:', descriptionError.message);
        description = "A meme image uploaded to the marketplace";
      }
    }

    // Create meme document with description
    const meme = new Meme({
      image_url: uploadResult.secure_url,
      cloudinary_id: uploadResult.public_id,
      tags: tags,
      description: description.toLowerCase(), // Convert to lowercase for consistency
      metadata: {
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        size: uploadResult.bytes
      }
    });

    await meme.save();

    res.status(201).json({
      success: true,
      message: 'Meme uploaded successfully',
      meme: {
        id: meme._id,
        image_url: meme.image_url,
        tags: meme.tags,
        description: meme.description,
        upvotes: meme.upvotes,
        downloads: meme.downloads,
        createdAt: meme.createdAt
      },
      metadata: {
        descriptionGenerated: req.body.description === "" || !req.body.description
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload meme',
      error: error.message
    });
  }
});

// Search memes by tags and description
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Parse query string into individual words
    const searchWords = q.toLowerCase()
      .split(/\s+/)
      .filter(word => word.trim() !== '' && word.length > 1); // Filter out empty strings and single characters
    
    if (searchWords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid search terms'
      });
    }

    const skip = (page - 1) * limit;

    // Build query to search in both tags and description
    const combinedRegex = new RegExp(searchWords.join('|'), 'i'); // Creates a regex like /word1|word2|word3/i

    const searchQuery = {
        $or: [
            // Search in tags array: MongoDB automatically checks if *any* element in the array
            // matches the regex when $regex is applied directly to an array field.
            { tags: { $regex: combinedRegex } },
        
            // Search in description: Apply the combined regex directly to the string field.
            { description: { $regex: combinedRegex } }
        ]
    };

    // For better relevance, we can also use text search if we add text indexes
    // Alternative approach using $text search (requires text index)
    // const searchQuery = {
    //   $text: { $search: q }
    // };

    const memes = await Meme.find(searchQuery)
      .sort({ 
        // Sort by relevance (more matches = higher relevance) and then by date
        createdAt: -1 
      })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Meme.countDocuments(searchQuery);

    // Calculate relevance score for each meme
    const memesWithRelevance = memes.map(meme => {
      let relevanceScore = 0;
      
      // Check how many search words match in tags
      const tagMatches = meme.tags.filter(tag => 
        searchWords.some(word => tag.toLowerCase().includes(word.toLowerCase()))
      ).length;
      
      // Check how many search words match in description
      const descriptionMatches = meme.description ? 
        searchWords.filter(word => 
          meme.description.toLowerCase().includes(word.toLowerCase())
        ).length : 0;
      
      // Calculate relevance score (description get higher weight)
      relevanceScore = (descriptionMatches * 2) + tagMatches;
      
      return {
        id: meme._id,
        image_url: meme.image_url,
        tags: meme.tags,
        upvotes: meme.upvotes,
        downloads: meme.downloads,
        description: meme.description,
        createdAt: meme.createdAt,
        relevanceScore: relevanceScore
      };
    });

    // Sort by relevance score (highest first), then by creation date
    memesWithRelevance.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      searchQuery: q,
      searchWords: searchWords,
      memes: memesWithRelevance,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: memes.length,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});


// Get trending memes
router.get('/trending', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Calculate trending score based on recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get memes with trending score calculation
    const trendingMemes = await Meme.aggregate([
      {
        $addFields: {
          // Calculate days since creation
          daysSinceCreation: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert milliseconds to days
            ]
          },
          // Calculate trending score
          trendingScore: {
            $divide: [
              {
                $add: [
                  { $multiply: ['$upvotes', 2] }, // Upvotes have higher weight
                  '$downloads'
                ]
              },
              {
                $add: [
                  {
                    $divide: [
                      { $subtract: [new Date(), '$createdAt'] },
                      1000 * 60 * 60 * 24 // Days since creation
                    ]
                  },
                  1 // Add 1 to avoid division by zero
                ]
              }
            ]
          }
        }
      },
      {
        // Filter out memes older than 30 days for trending
        $match: {
          daysSinceCreation: { $lte: 30 }
        }
      },
      {
        $sort: { 
          trendingScore: -1, 
          upvotes: -1, 
          createdAt: -1 
        }
      },
      {
        $skip: skip
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: 1,
          image_url: 1,
          tags: 1,
          upvotes: 1,
          downloads: 1,
          description: 1,
          createdAt: 1,
          trendingScore: { $round: ['$trendingScore', 2] },
          daysSinceCreation: { $round: ['$daysSinceCreation', 1] }
        }
      }
    ]);

    // Get total count for pagination
    const totalTrending = await Meme.aggregate([
      {
        $addFields: {
          daysSinceCreation: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $match: {
          daysSinceCreation: { $lte: 30 }
        }
      },
      {
        $count: "total"
      }
    ]);

    const total = totalTrending.length > 0 ? totalTrending[0].total : 0;

    // Also get the most trending tag for additional context
    const tagStats = await Meme.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      { $unwind: '$tags' },
      { 
        $group: { 
          _id: '$tags', 
          count: { $sum: 1 },
          totalUpvotes: { $sum: '$upvotes' },
          totalDownloads: { $sum: '$downloads' },
          trendingScore: {
            $avg: {
              $add: [
                { $multiply: ['$upvotes', 2] },
                '$downloads'
              ]
            }
          }
        } 
      },
      { $sort: { trendingScore: -1, count: -1 } },
      { $limit: 1 }
    ]);

    const mostTrendingTag = tagStats.length > 0 ? tagStats[0]._id : null;

    res.json({
      success: true,
      trendingMemes: trendingMemes.map(meme => ({
        id: meme._id,
        image_url: meme.image_url,
        tags: meme.tags,
        upvotes: meme.upvotes,
        downloads: meme.downloads,
        description: meme.description,
        createdAt: meme.createdAt,
        trendingScore: meme.trendingScore,
        daysSinceCreation: meme.daysSinceCreation
      })),
      mostTrendingTag: mostTrendingTag,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: trendingMemes.length,
        totalItems: total
      },
      metadata: {
        calculationPeriod: "Last 30 days",
        algorithm: "Score = (upvotes * 2 + downloads) / (days_since_creation + 1)"
      }
    });

  } catch (error) {
    console.error('Trending memes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending memes',
      error: error.message
    });
  }
});

// Get popular tags (most common to least)
router.get('/popular', async (req, res) => {
  try {
    const { limit = 30 } = req.query;

    const popularTags = await Meme.aggregate([
      { $unwind: '$tags' },
      { 
        $group: { 
          _id: '$tags', 
          count: { $sum: 1 },
          totalUpvotes: { $sum: '$upvotes' },
          totalDownloads: { $sum: '$downloads' },
          avgUpvotes: { $avg: '$upvotes' }
        } 
      },
      { $sort: { count: -1, totalUpvotes: -1 } },
      { $limit: parseInt(limit) },
      { 
        $project: { 
          tag: '$_id', 
          count: 1, 
          totalUpvotes: 1, 
          totalDownloads: 1,
          avgUpvotes: { $round: ['$avgUpvotes', 2] },
          _id: 0 
        } 
      }
    ]);

    res.json({
      success: true,
      popularTags: popularTags
    });

  } catch (error) {
    console.error('Popular tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular tags',
      error: error.message
    });
  }
});

// Meme evolution analysis
router.post('/meme-evolution', upload.single('meme'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');
    
    // Analyze meme evolution using Gemini
    const evolutionData = await geminiService.traceMemeEvolution(base64Image);

    res.json({
      success: true,
      message: 'Meme evolution analysis completed',
      evolution: evolutionData,
      metadata: {
        analysisDate: new Date().toISOString(),
        aiModel: 'Google Gemini 2.0 Flash',
        analysisType: 'Comprehensive Evolution Tracking'
      }
    });

  } catch (error) {
    console.error('Meme evolution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze meme evolution',
      error: error.message
    });
  }
});

// Meme storm - generate meme ideas
router.post('/meme-storm', async (req, res) => {
  try {
    const { ideas } = req.body;
    
    if (!ideas) {
      return res.status(400).json({
        success: false,
        message: 'Ideas string is required'
      });
    }

    // Generate meme concepts using Gemini
    const memeStorm = await geminiService.generateMemeStorm(ideas);

    res.json({
      success: true,
      memeConcepts: memeStorm
    });

  } catch (error) {
    console.error('Meme storm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate meme storm',
      error: error.message
    });
  }
});

// Caption generator - generate captions for image
router.post('/caption-generator', upload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');
    
    // Generate captions using Gemini
    const captions = await geminiService.generateCaptions(base64Image);

    res.json({
      success: true,
      captions: captions,
      total: captions.length
    });

  } catch (error) {
    console.error('Caption generator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate captions',
      error: error.message
    });
  }
});

// Update upvote (only upvote, no downvote)
router.post('/update-upvote', async (req, res) => {
  try {
    const { memeId } = req.body;
    
    if (!memeId) {
      return res.status(400).json({
        success: false,
        message: 'Meme ID is required'
      });
    }

    const meme = await Meme.findById(memeId);
    if (!meme) {
      return res.status(404).json({
        success: false,
        message: 'Meme not found'
      });
    }

    // Only upvote - increment by 1
    meme.upvotes += 1;
    await meme.save();

    res.json({
      success: true,
      message: 'Meme upvoted successfully',
      upvotes: meme.upvotes,
      memeId: meme._id
    });

  } catch (error) {
    console.error('Update upvote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update upvote',
      error: error.message
    });
  }
});

// Track downloads
router.post('/track-downloads', async (req, res) => {
  try {
    const { memeId } = req.body;
    
    if (!memeId) {
      return res.status(400).json({
        success: false,
        message: 'Meme ID is required'
      });
    }

    const meme = await Meme.findByIdAndUpdate(
      memeId,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    if (!meme) {
      return res.status(404).json({
        success: false,
        message: 'Meme not found'
      });
    }

    res.json({
      success: true,
      downloads: meme.downloads
    });

  } catch (error) {
    console.error('Track downloads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track download',
      error: error.message
    });
  }
});

// Get all memes (with pagination and filters)
router.get('/memes', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = 'recent',
      tags 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tagArray };
    }

    // Determine sort criteria
    let sortCriteria = { createdAt: -1 }; // default: recent
    if (sort === 'popular') {
      sortCriteria = { upvotes: -1, downloads: -1 };
    } else if (sort === 'trending') {
      sortCriteria = { upvotes: -1, createdAt: -1 };
    }

    const memes = await Meme.find(query)
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Meme.countDocuments(query);

    res.json({
      success: true,
      memes: memes.map(meme => ({
        id: meme._id,
        image_url: meme.image_url,
        tags: meme.tags,
        upvotes: meme.upvotes,
        downloads: meme.downloads,
        title: meme.title,
        description: meme.description,
        createdAt: meme.createdAt
      })),
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: memes.length,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Get memes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get memes',
      error: error.message
    });
  }
});


module.exports = router;
