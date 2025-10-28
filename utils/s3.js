const {
    S3Client,
    PutObjectCommand,
    PutBucketPolicyCommand,
    DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const multer = require("multer");
require("dotenv").config();

/* ----------------------------- S3 Client Setup ---------------------------- */

/**
 * Configured S3 client for MinIO
 * @type {S3Client}
 */
const s3 = new S3Client({
    region: process.env.MINIO_REGION,
    endpoint: process.env.MINIO_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
});

/* ----------------------------- Multer Setup ------------------------------ */

/**
 * Multer upload middleware configured for memory storage
 */
const upload = multer({ storage: multer.memoryStorage() });

/* ----------------------------- Helper Functions --------------------------- */

/**
 * Async handler wrapper for Express routes
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Builds the public URL for an image stored in MinIO
 * @param {string} key - The object key in MinIO
 * @returns {string} The full public URL
 */
const buildImageUrl = (key) =>
    `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${key}`;

/**
 * Sends a standardized server error response
 * @param {Object} res - Express response object
 * @param {string} label - Error label/message
 * @param {Error} err - The error object
 * @returns {Object} JSON response
 */
const sendServerError = (res, label, err) => {
    console.error(`${label}:`, err);
    return res.status(500).json({
        success: false,
        error: label,
        details:
            process.env.NODE_ENV === "development" ? err?.message || String(err) : undefined,
    });
};

/**
 * Sets the bucket policy to allow public read access
 * @returns {Promise<void>}
 */
async function setPublicBucketPolicy() {
    const policy = {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: { AWS: "*" },
                Action: ["s3:GetObject"],
                Resource: [`arn:aws:s3:::${process.env.MINIO_BUCKET}/*`],
            },
        ],
    };

    try {
        await s3.send(
            new PutBucketPolicyCommand({
                Bucket: process.env.MINIO_BUCKET,
                Policy: JSON.stringify(policy),
            })
        );
        console.log("✅ Bucket policy set to public");
    } catch (error) {
        console.error("❌ Error setting bucket policy:", error.message);
        if (error.name !== "NoSuchBucket") {
            console.error(
                "Please check if the bucket exists and your MinIO credentials have sufficient permissions"
            );
        }
    }
}

/* ----------------------------- Initialization ----------------------------- */

// Set policy on server start (best effort)
setPublicBucketPolicy().catch(console.error);

/* --------------------------------- Exports -------------------------------- */

module.exports = {
    // S3 Client and Commands
    s3,
    S3Client,
    PutObjectCommand,
    PutBucketPolicyCommand,
    DeleteObjectCommand,

    // Multer
    upload,

    // Helper Functions
    asyncHandler,
    buildImageUrl,
    sendServerError,
    setPublicBucketPolicy,
};