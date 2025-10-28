const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Post = mongoose.model("Post");
const User = mongoose.model("User");
const verifyLogin = require("../middleware/verifyLogin");
const {
    buildImageUrl,
} = require("../utils/s3");

/**
 * @swagger
 * /user/{id}:
 *   get:
 *     tags: [User]
 *     summary: Get user profile with their posts
 *     description: Retrieve a user's profile information and all posts created by that user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: 60d5ecb74b24a6001f647c8a
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       404:
 *         description: User or posts not found
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
 */
router.get('/user/:id', verifyLogin, (req, res) => {
    User.findById(req.params.id)
        .select("-password")
        .then(user => {
            Post.find({postBy: req.params.id})
                .populate("postBy", "_id name")
                .lean()
                .then(posts => {
                    const postsWithImageUrls = posts.map((post) =>
                        post?.photo ? { ...post, imageUrl: buildImageUrl(post.photo) } : post
                    );
                    return res.status(200).json({
                        success: true,
                        user,
                        posts: postsWithImageUrls
                    })
                }).catch(err => {
                console.log(err)
                return res.status(422).json({
                    success: false,
                    error: "Posts not found"
                })
            })
        }).catch(err => {
        console.log(err)
        return res.status(422).json({
            success: false,
            error: "User not found"
        })
    })
})

/**
 * @swagger
 * /follow:
 *   put:
 *     tags: [User]
 *     summary: Follow a user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - followId
 *             properties:
 *               followId:
 *                 type: string
 *                 description: ID of the user to follow
 *     responses:
 *       200:
 *         description: Successfully followed user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       422:
 *         description: Failed to follow user
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/follow', verifyLogin, async (req, res) => {
    try {
        const { followId } = req.body;
        const meId = req.user._id;

        if (!followId) {
            return res.status(422).json({
                success: false,
                error: "followId is required"
            });
        }

        if (String(followId) === String(meId)) {
            return res.status(400).json({
                success: false,
                error: "You cannot follow yourself"
            });
        }

        // Add me to target user's followers (no duplicates)
        const followedUser = await User.findByIdAndUpdate(
            followId,
            { $addToSet: { followers: meId } },
            { new: true }
        );

        if (!followedUser) {
            return res.status(404).json({
                success: false,
                error: "Target user not found"
            });
        }

        // Add target user to my following list (no duplicates)
        const updatedMe = await User.findByIdAndUpdate(
            meId,
            { $addToSet: { following: followId } },
            { new: true }
        ).select('-password');

        return res.status(200).json({
            success: true,
            user: updatedMe
        });
    } catch (err) {
        console.error("PUT /follow error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to follow user",
            details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
});


/**
 * @swagger
 * /unfollow:
 *   put:
 *     tags: [User]
 *     summary: Unfollow a user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - followId
 *             properties:
 *               followId:
 *                 type: string
 *                 description: ID of the user to unfollow
 *     responses:
 *       200:
 *         description: Successfully unfollowed user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       422:
 *         description: Failed to unfollow user
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/unfollow', verifyLogin, async (req, res) => {
    try {
        const { followId } = req.body; // swagger says "followId", so we stick to that
        const meId = req.user._id;

        if (!followId) {
            return res.status(422).json({
                success: false,
                error: "followId is required"
            });
        }

        if (String(followId) === String(meId)) {
            return res.status(400).json({
                success: false,
                error: "You cannot unfollow yourself"
            });
        }

        // Remove me from their followers
        const unfollowedUser = await User.findByIdAndUpdate(
            followId,
            { $pull: { followers: meId } },
            { new: true }
        );

        if (!unfollowedUser) {
            return res.status(404).json({
                success: false,
                error: "Target user not found"
            });
        }

        // Remove them from my following
        const updatedMe = await User.findByIdAndUpdate(
            meId,
            { $pull: { following: followId } },
            { new: true }
        ).select('-password');

        return res.status(200).json({
            success: true,
            user: updatedMe
        });
    } catch (err) {
        console.error("PUT /unfollow error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to unfollow user",
            details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
});


/**
 * @swagger
 * /user/{id}/followers:
 *   get:
 *     tags: [User]
 *     summary: Get user's followers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved followers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 followers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/user/:id/followers', verifyLogin, async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select('-password')
            .populate('followers', '_id name')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            followers: user.followers || []
        });
    } catch (err) {
        console.error("GET /user/:id/followers error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to retrieve followers",
            details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
});


module.exports = router;
