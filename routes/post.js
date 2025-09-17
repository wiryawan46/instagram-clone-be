const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Post = mongoose.model("Post")
const verifyLogin = require("../middleware/verifyLogin")
require('dotenv').config();


router.get("/posts", verifyLogin, (req, res) => {
    Post.find()
        .populate("postBy", "_id")
        .then(posts => {
            if (!posts) {
                return res.status(404).json({
                    success: false,
                    error: "No posts found"
                })
            }
            res.status(200).json({
                success: true,
                posts
            })
        })
        .catch(err => {
            console.error("Error fetching posts:", err)
            res.status(500).json({
                success: false,
                error: "Error fetching posts",
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            })
        })
})

router.post("/create-post", verifyLogin, (req, res) => {
    const {title, body} = req.body
    if (!title || !body) {
        return res.status(422).json({
            success: false,
            error: "All fields are required",
            fields: {
                title: !title ? "Title is required" : null,
                body: !body ? "Body is required" : null,
            }
        })
    }
    req.user.password = undefined
    const post = new Post({
        title,
        body,
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
            res.status(200).json({
                success: true,
                posts
            })
        })
        .catch(err => {
            console.error("Error getting posts:", err)
        })
})

module.exports = router;