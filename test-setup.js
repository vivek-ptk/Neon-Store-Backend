const mongoose = require('mongoose');
require('dotenv').config();

// Test MongoDB connection
async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/neon-meme-marketplace');
    console.log('✅ MongoDB connected successfully');
    
    // Test environment variables
    console.log('\n🔍 Checking environment variables...');
    const requiredVars = [
      'MONGODB_URI',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY', 
      'CLOUDINARY_API_SECRET',
      'GEMINI_API_KEY'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length === 0) {
      console.log('✅ All required environment variables are set');
    } else {
      console.log('❌ Missing environment variables:', missing.join(', '));
      console.log('💡 Please check your .env file');
    }
    
    console.log('\n🚀 Setup test completed!');
    console.log('💡 Run "npm run dev" to start the server');
    console.log('🎯 All authentication has been removed - API is now public!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('💡 Make sure MongoDB is running and the connection string is correct');
  } finally {
    mongoose.connection.close();
  }
}

testConnection();
