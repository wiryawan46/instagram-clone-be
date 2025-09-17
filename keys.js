// MongoDB connection configuration
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/instagram-clone';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Export the configuration
module.exports = {
    MONGODB_URI,
    JWT_SECRET
};
