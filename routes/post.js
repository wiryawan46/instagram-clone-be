const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Post = mongoose.model("Post")
const verifyLogin = require("../middleware/verifyLogin")
const { S3Client, PutObjectCommand, PutBucketPolicyCommand} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");
require('dotenv').config();
const upload = multer({ storage: multer.memoryStorage() });

async function setPublicBucketPolicy() {
    const policy = {
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: { AWS: "*" },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${process.env.MINIO_BUCKET}/*`]
        }]
    };

    try {
        await s3.send(new PutBucketPolicyCommand({
            Bucket: process.env.MINIO_BUCKET,
            Policy: JSON.stringify(policy)
        }));
        console.log("✅ Bucket policy set to public");
    } catch (error) {
        console.error("❌ Error setting bucket policy:", error.message);
        if (error.name !== 'NoSuchBucket') {
            console.error("Please check if the bucket exists and your MinIO credentials have sufficient permissions");
        }
    }
}

const s3 = new S3Client({
    region: process.env.MINIO_REGION,
    endpoint: process.env.MINIO_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
});

// Call the function to set the policy when the server starts
setPublicBucketPolicy().catch(console.error);

/**
 * @swagger
 * /posts:
 *   get:
 *     tags: [Posts]
 *     summary: Get all posts
 *     description: Retrieve all posts from all users with image URLs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostsResponse'
 *       404:
 *         description: No posts found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/posts", verifyLogin, async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("postBy", "_id name")
            .lean();

        if (!posts || posts.length === 0) {
            return res.status(404).json({
                success: false,
                error: "No posts found"
            });
        }

        const postsWithImageUrls = posts.map(post => {
            if (post.photo) {
                return {
                    ...post,
                    imageUrl: `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${post.photo}`
                };
            }
            return post;
        });

        res.status(200).json({
            success: true,
            posts: postsWithImageUrls
        });
    } catch (err) {
        console.error("Error fetching posts:", err);
        res.status(500).json({
            success: false,
            error: "Error fetching posts",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

/**
 * @swagger
 * /create-post:
 *   post:
 *     tags: [Posts]
 *     summary: Create a new post
 *     description: Create a new post with title and body content
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostRequest'
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreatePostResponse'
 *       422:
 *         description: Validation error - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/create-post", verifyLogin, (req, res) => {
    const {title, body, photo} = req.body
    if (!title || !body || !photo) {
        return res.status(422).json({
            success: false,
            error: "All fields are required",
            fields: {
                title: !title ? "Title is required" : null,
                body: !body ? "Body is required" : null,
                photo: !photo ? "Photo is required" : null,
            }
        })
    }
    req.user.password = undefined
    const post = new Post({
        title,
        body,
        photo,
        postBy: req.user
    })
    post.save().then((post) => {
        res.status(201).json({
            success: true,
            message: "Post created successfully",
            post
        })
    })
        .catch((err) => {
            console.error("Error creating post:", err)
            res.status(500).json({
                success: false,
                error: "Error creating post",
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            })
        })
})

/**
 * @swagger
 * /myposts:like and unli
 *   get:
 *     tags: [Posts]
 *     summary: Get current user's posts
 *     description: Retrieve all posts created by the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostsResponse'
 *       404:
 *         description: No posts found for this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/myposts", verifyLogin, (req, res) => {
    Post.find(
        {
            postBy: req.user._id
        }
    )
        .populate("postBy", "_id name")
        .then(posts => {
            if (!posts) {
                return res.status(404).json({
                    success: false,
                    error: "No posts found"
                })
            }
            const postsWithImageUrls = posts.map(post => {
                if (post.photo) {
                    return {
                        ...post,
                        imageUrl: `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${post.photo}`
                    };
                }
                return post;
            });

            res.status(200).json({
                success: true,
                posts: postsWithImageUrls
            });
        })
        .catch(err => {
            console.error("Error getting posts:", err)
        })
})

/**
 * @swagger
 * /upload:
 *   post:
 *     tags: [Posts]
 *     summary: Upload a file to MinIO storage
 *     description: Uploads a file to MinIO storage and returns the file URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "✅ File Upload Success!"
 *                 fileName:
 *                   type: string
 *                   example: "1632567890123_example.jpg"
 *                 url:
 *                   type: string
 *                   example: "http://minio:9000/bucket-name/1632567890123_example.jpg"
 *       400:
 *         description: No file was uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error during file upload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "File not found" });
        }

        const params = {
            Bucket: process.env.MINIO_BUCKET,
            Key: `${Date.now()}_${req.file.originalname}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        await s3.send(new PutObjectCommand(params));

        return res.json({
            message: "✅ File Upload Success!",
            fileName: params.Key,
            url: `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${params.Key}`,
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Failed upload file" });
    }
});

/**
 * @swagger
 * /image/{filename}:
 *   get:
 *     tags: [Posts]
 *     summary: Get an image from MinIO storage
 *     description: Streams an image file from MinIO storage
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the image file to retrieve
 *     responses:
 *       200:
 *         description: Image file streamed successfully
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error retrieving image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/image/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const imageUrl = `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${filename}`;
        res.redirect(imageUrl);
    } catch (err) {
        console.error('Error generating image URL:', err);
        res.status(500).json({
            success: false,
            error: 'Error generating image URL',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

/**
 * @swagger
 * /like-post:
 *   put:
 *     summary: Like a post
 *     description: Adds the authenticated user's ID to the post's `likes` array.
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *             properties:
 *               postId:
 *                 type: string
 *                 description: The ID of the post to like (Mongo ObjectId).
 *           example:
 *             postId: "652f3f6b8f2a9d0012ab34cd"
 *     responses:
 *       200:
 *         description: Post liked successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Post liked successfully
 *                 post:
 *                   type: object
 *                   description: The updated post document.
 *       401:
 *         description: Unauthorized (missing or invalid token).
 *       404:
 *         description: Post not found.
 *       500:
 *         description: Server error while liking the post.
 */

router.put("/like-post", verifyLogin, (req, res) => {
    Post.findByIdAndUpdate(req.body.postId, {
        $push: {likes: req.user._id}
    }, {
        new: true
    })
        .then(post => {
            if (!post) {
                return res.status(404).json({
                    success: false,
                    error: "Post not found"
                })
            }
            res.status(200).json({
                success: true,
                message: "Post liked successfully",
                post
            })
        })
        .catch(err => {
            console.error("Error liking post:", err)
            res.status(500).json({
                success: false,
                error: "Error liking post",
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            })
        })
})


/**
 * @swagger
 * /unlike-post:
 *   put:
 *     summary: Unlike a post
 *     description: Removes the authenticated user's ID from the post's `likes` array.
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *             properties:
 *               postId:
 *                 type: string
 *                 description: The ID of the post to unlike (Mongo ObjectId).
 *           example:
 *             postId: "652f3f6b8f2a9d0012ab34cd"
 *     responses:
 *       200:
 *         description: Post unliked successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Post unliked successfully
 *                 post:
 *                   type: object
 *                   description: The updated post document.
 *       401:
 *         description: Unauthorized (missing or invalid token).
 *       404:
 *         description: Post not found.
 *       500:
 *         description: Server error while unliking the post.
 */
router.put("/unlike-post", verifyLogin, (req, res) => {
    Post.findByIdAndUpdate(req.body.postId, {
        $pull: {likes: req.user._id}
    }, {
        new: true
    })
        .then(post => {
            if (!post) {
                return res.status(404).json({
                    success: false,
                    error: "Post not found"
                })
            }
            res.status(200).json({
                success: true,
                message: "Post unliked successfully",
                post
            })
        })
        .catch(err => {
            console.error("Error liking post:", err)
            res.status(500).json({
                success: false,
                error: "Error unliking post",
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            })
        })
})

module.exports = router;