const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../keys");
const mongoose = require("mongoose");
const User = mongoose.model("User");

module.exports = async (req, res, next) => {
    try {
        // Check for authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('No token provided or invalid token format');
            return res.status(401).json({
                success: false,
                error: "Authorization token required (format: 'Bearer <token>')"
            });
        }

        // Extract token
        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            console.error('Token not found in Authorization header');
            return res.status(401).json({
                success: false,
                error: "Authentication token is required"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        // Find user
        const user = await User.findById(decoded.userId);
        if (!user) {
            console.error('User not found for token:', decoded.userId);
            return res.status(401).json({
                success: false,
                error: "User not found"
            });
        }
        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        
        let errorMessage = "Authentication failed";
        let statusCode = 401;

        if (error.name === 'JsonWebTokenError') {
            errorMessage = "Invalid token";
        } else if (error.name === 'TokenExpiredError') {
            errorMessage = "Token has expired";
            statusCode = 401;
        } else if (error.name === 'MongoError' || error.name === 'CastError') {
            errorMessage = "Database error during authentication";
            statusCode = 500;
        }

        return res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
};
