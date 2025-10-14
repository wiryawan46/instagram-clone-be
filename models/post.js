const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    title: {type: String, required: true},
    body: {type: String, required: true},
    photo: {type: String, default: "no photo"},
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    postBy: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    createdAt: {type: Date, default: Date.now}
})

mongoose.model("Post", postSchema)