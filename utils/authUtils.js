const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../keys");

/**
 * Extracts the user ID from a JWT token
 * @param {string} token - The JWT token (with or without 'Bearer ' prefix)
 * @returns {string|null} The user ID if token is valid, null otherwise
 */
const getUserIdFromToken = (token) => {
    try {
        // Remove 'Bearer ' prefix if it exists
        const tokenWithoutBearer = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

        // Verify and decode the token
        const decoded = jwt.verify(tokenWithoutBearer, JWT_SECRET);

        // Return the user ID from the token payload
        return decoded.userId || null;
    } catch (error) {
        console.error('Error extracting user ID from token:', error.message);
        return null;
    }
};

// Middleware to get user ID from token
const getUserId = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: "Authorization header is required"
        });
    }

    const userId = getUserIdFromToken(authHeader);
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token"
        });
    }

    req.userId = userId;
    next();
};

module.exports = {
    getUserIdFromToken,
    getUserId
};
