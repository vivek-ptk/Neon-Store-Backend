# Neon Meme Marketplace - Backend API

A neon-drenched meme marketplace backend built with Node.js, Express, MongoDB, and Google Gemini AI.

## Features

- **Meme Upload** - Upload memes with automatic AI-generated tags
- **Smart Search** - Search memes by tags with AI assistance
- **Tag Management** - Trending tags and popularity ranking
- **Meme Analytics** - Track upvotes and downloads
- **AI-Powered Features** - Meme evolution analysis and meme storm generation
- **Cloud Storage** - Cloudinary integration for image storage

## API Endpoints

### Memes
- `POST /api/upload` - Upload a meme
- `GET /api/search` - Search memes by tags
- `GET /api/search-assist` - Get tag suggestions
- `GET /api/:tag` - Get memes by specific tag
- `GET /api/trending` - Get most trending tag
- `GET /api/popular` - Get popular tags ranked
- `POST /api/meme-evolution` - Analyze meme evolution
- `POST /api/meme-storm` - Generate meme ideas
- `POST /api/caption-generator` - Generate captions for image
- `POST /api/update-upvote` - Upvote/remove upvote
- `POST /api/track-downloads` - Track meme downloads
- `GET /api/memes` - Get all memes with pagination

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Cloudinary account
- Google Gemini API key

### Installation

1. **Clone and navigate to the backend directory**
   ```bash
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory with the following variables:
     ```env
   # Environment
   NODE_ENV=development
   PORT=5000

   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/neon-meme-marketplace

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key

   # Frontend
   FRONTEND_URL=http://localhost:3000
   ```

4. **Set up Cloudinary**
   - Sign up at [Cloudinary](https://cloudinary.com/)
   - Get your cloud name, API key, and API secret from the dashboard

5. **Set up Google Gemini API**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create an API key for Gemini

6. **Start MongoDB**
   - If using local MongoDB: `mongod`
   - If using MongoDB Atlas: Ensure your connection string is correct

7. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## Project Structure

```
Backend/
├── config/
│   ├── cloudinary.js      # Cloudinary configuration
│   └── gemini.js          # Google Gemini AI service
├── middleware/
│   └── upload.js          # File upload middleware
├── models/
│   └── Meme.js            # Meme data model
├── routes/
│   └── memes.js           # Meme-related routes
├── utils/
│   └── helpers.js         # Utility functions
├── .env                   # Environment variables
├── .gitignore
├── package.json
├── server.js              # Main server file
└── README.md
```

## Database Schema

### Meme Schema
```javascript
{
  image_url: String,
  tags: [String],
  upvotes: Number,
  downloads: Number,
  title: String,
  description: String,
  cloudinary_id: String,
  metadata: Object,
  timestamps: true
}
```

## API Response Format

All API responses follow this format:

```javascript
{
  "success": boolean,
  "message": "string",
  "data": {} // Response data
}
```

## Error Handling

The API includes comprehensive error handling:
- Input validation
- Authentication errors
- Rate limiting
- File upload errors
- Database errors
- External API errors

## Security Features

- Helmet.js for security headers
- Rate limiting
- Input sanitization
- CORS configuration

## Development

For development, use:
```bash
npm run dev
```

This uses nodemon for automatic server restarts on file changes.

## Testing

Test the API endpoints using tools like:
- Postman
- Insomnia
- curl
- Thunder Client (VS Code extension)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
# Neon-Store-Backend
