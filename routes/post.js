const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Post = mongoose.model("Post");
const verifyLogin = require("../middleware/verifyLogin");
const {
    s3,
    PutObjectCommand,
    DeleteObjectCommand,
    upload,
    asyncHandler,
    buildImageUrl,
    sendServerError,
} = require("../utils/s3");

/* --------------------------------- Routes -------------------------------- */

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
 *       404:
 *         description: No posts found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/posts",
    verifyLogin,
    asyncHandler(async (req, res) => {
        const posts = await Post.find().populate("postBy", "_id name").lean();

        if (!posts || posts.length === 0) {
            return res.status(404).json({
                success: false,
                error: "No posts found",
            });
        }

        const postsWithImageUrls = posts.map((post) =>
            post.photo ? { ...post, imageUrl: buildImageUrl(post.photo) } : post
        );

        return res.status(200).json({
            success: true,
            posts: postsWithImageUrls,
        });
    })
);

/**
 * @swagger
 * /create-post:
 *   post:
 *     tags: [Posts]
 *     summary: Create a new post
 *     description: Create a new post with title, body, and photo key
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body, photo]
 *             properties:
 *               title: { type: string }
 *               body: { type: string }
 *               photo: { type: string, description: "MinIO object key from /upload" }
 *     responses:
 *       201:
 *         description: Post created successfully
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
    "/create-post",
    verifyLogin,
    asyncHandler(async (req, res) => {
        const { title, body, photo } = req.body;
        if (!title || !body || !photo) {
            return res.status(422).json({
                success: false,
                error: "All fields are required",
                fields: {
                    title: !title ? "Title is required" : null,
                    body: !body ? "Body is required" : null,
                    photo: !photo ? "Photo is required" : null,
                },
            });
        }

        const post = new Post({
            title,
            body,
            photo,
            postBy: req.user._id,
        });

        const saved = await post.save();

        return res.status(201).json({
            success: true,
            message: "Post created successfully",
            post: saved,
        });
    })
);

/**
 * @swagger
 * /myposts:
 *   get:
 *     tags: [Posts]
 *     summary: Get current user's posts
 *     description: Retrieve all posts created by the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User posts retrieved successfully
 *       404:
 *         description: No posts found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/myposts",
    verifyLogin,
    asyncHandler(async (req, res) => {
        const posts = await Post.find({ postBy: req.user._id })
            .populate("postBy", "_id name")
            .lean();

        if (!posts || posts.length === 0) {
            return res.status(404).json({
                success: false,
                error: "No posts found",
            });
        }

        const postsWithImageUrls = posts.map((post) =>
            post.photo ? { ...post, imageUrl: buildImageUrl(post.photo) } : post
        );

        return res.status(200).json({
            success: true,
            posts: postsWithImageUrls,
        });
    })
);

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
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: No file was uploaded
 *       500:
 *         description: Server error during file upload
 */
router.post(
    "/upload",
    upload.single("file"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "File not found" });
        }

        const key = `${Date.now()}_${req.file.originalname}`;
        const params = {
            Bucket: process.env.MINIO_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        await s3.send(new PutObjectCommand(params));

        return res.json({
            message: "✅ File Upload Success!",
            fileName: key,
            url: buildImageUrl(key),
        });
    })
);

/**
 * @swagger
 * /image/{filename}:
 *   get:
 *     tags: [Posts]
 *     summary: Get an image from MinIO storage
 *     description: Redirects to the public image URL served by MinIO
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to image
 *       500:
 *         description: Error generating image URL
 */
router.get(
    "/image/:filename",
    asyncHandler(async (req, res) => {
        const { filename } = req.params;
        return res.redirect(buildImageUrl(filename));
    })
);

/**
 * @swagger
 * /like-post:
 *   put:
 *     tags: [Posts]
 *     summary: Like a post
 *     description: Adds the authenticated user's ID to the post's likes array
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId]
 *             properties:
 *               postId: { type: string }
 *     responses:
 *       200: { description: Post liked successfully }
 *       404: { description: Post not found }
 *       500: { description: Server error }
 */
router.put(
    "/like-post",
    verifyLogin,
    asyncHandler(async (req, res) => {
        const { postId } = req.body;
        const post = await Post.findByIdAndUpdate(
            postId,
            { $addToSet: { likes: req.user._id } },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({ success: false, error: "Post not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Post liked successfully",
            post,
        });
    })
);

/**
 * @swagger
 * /unlike-post:
 *   put:
 *     tags: [Posts]
 *     summary: Unlike a post
 *     description: Removes the authenticated user's ID from the post's likes array
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId]
 *             properties:
 *               postId: { type: string }
 *     responses:
 *       200: { description: Post unliked successfully }
 *       404: { description: Post not found }
 *       500: { description: Server error }
 */
router.put(
    "/unlike-post",
    verifyLogin,
    asyncHandler(async (req, res) => {
        const { postId } = req.body;
        const post = await Post.findByIdAndUpdate(
            postId,
            { $pull: { likes: req.user._id } },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({ success: false, error: "Post not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Post unliked successfully",
            post,
        });
    })
);

/**
 * @swagger
 * /comment-post:
 *   put:
 *     tags: [Posts]
 *     summary: Add a comment to a post
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, text]
 *             properties:
 *               id: { type: string }
 *               text: { type: string }
 *     responses:
 *       200: { description: Comment added successfully }
 *       404: { description: Post not found }
 *       500: { description: Server error }
 */
router.put(
    "/comment-post",
    verifyLogin,
    asyncHandler(async (req, res) => {
        const comment = {
            text: req.body.text,
            postedBy: req.user._id,
        };

        const comm = await Post.findByIdAndUpdate(
            req.body.id,
            { $push: { comments: comment } },
            { new: true }
        )
            .populate("comments.postedBy", "_id name")
            .populate("postBy", "_id name");

        if (!comm) {
            return res.status(404).json({ success: false, error: "Post not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Post comment successfully",
            comm,
        });
    })
);

/**
 * @swagger
 * /delete-post:
 *   delete:
 *     tags: [Posts]
 *     summary: Delete a post by ID
 *     description: Deletes a post if the authenticated user is the author. Also attempts to delete the associated image from MinIO if present.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId]
 *             properties:
 *               postId:
 *                 type: string
 *                 description: The ID of the post to delete
 *           example:
 *             postId: "652f3f6b8f2a9d0012ab34cd"
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       403:
 *         description: Forbidden - Not the post owner
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error while deleting the post
 */
router.delete(
    "/delete-post",
    verifyLogin,
    asyncHandler(async (req, res) => {
        const { postId } = req.body;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, error: "Post not found" });
        }

        // Only author can delete
        if (String(post.postBy) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                error: "Forbidden: you are not the owner of this post",
            });
        }

        // Try to delete image from MinIO (best-effort)
        if (post.photo) {
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.MINIO_BUCKET,
                        Key: post.photo,
                    })
                );
            } catch (err) {
                console.error("⚠️ Failed to delete MinIO object:", err?.message || err);
                // continue anyway
            }
        }

        await post.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully",
            postId,
        });
    })
);

/* ------------------------------- Error Trap ------------------------------ */

router.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    return sendServerError(res, "Internal server error", err);
});

module.exports = router;
