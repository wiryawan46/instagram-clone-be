const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {JWT_SECRET} = require("../keys")
const verifyLogin = require("../middleware/verifyLogin")
require('dotenv').config();


router.post("/register", async (req, res) => {
    const {name, email, password} = req.body
    if (!name || !email || !password) {
        return res.status(422).json({
            success: false,
            error: "All fields are required",
            fields: {
                name: !name ? "Name is required" : null,
                email: !email ? "Email is required" : null,
                password: !password ? "Password is required" : null,
            }
        })
    }
    try {
        // Check if user already exists
        const existingUser = await User.findOne({email: email});
        if (existingUser) {
            return res.status(422).json({
                success: false,
                error: "User with this email already exists"
            });
        }
        bcrypt.hash(password, 12).then(async (hashedpassword) => {
            // Create new user
            const user = new User({name, email, password: hashedpassword});
            await user.save();

            // Return success response
            res.status(201).json({
                success: true,
                message: "User registered successfully",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
        })
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            success: false,
            error: "Error registering user",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
})

router.post("/login", async (req, res) => {
    const {email, password} = req.body
    if (!email || !password) {
        return res.status(422).json({
            success: false,
            error: "All fields are required",
            fields: {
                email: !email ? "Email is required" : null,
                password: !password ? "Password is required" : null,
            }
        })
    }
    User.findOne({email: email})
        .then(savedUser => {
            if (!savedUser) {
                return res.status(422).json({
                    success: false,
                    error: "Invalid Email or Password"
                })
            }
            bcrypt.compare(password, savedUser.password)
                .then(isMatch => {
                    if (isMatch) {
                        const token = jwt.sign({userId: savedUser._id}, JWT_SECRET)
                        return res.json({
                            success: true,
                            message: "Login successful",
                            token: token,
                        })
                    } else {
                        return res.status(422).json({
                            success: false,
                            error: "Invalid Email or Password"
                        })
                    }
                })
                .catch(err => {
                    console.error('Login error:', err);
                })
        })
        .catch(err => {
            console.error('Login error:', err);
            res.status(500).json({
                success: false,
                error: "Error logging in",
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            })
        })
})

router.get("/protected", verifyLogin, async (req, res) => {
    res.send("Protected route")
})

module.exports = router
