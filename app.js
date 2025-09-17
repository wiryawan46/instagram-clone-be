const express = require("express");
const app = express();
require('dotenv').config();
const mongoose = require("mongoose");
const {request} = require("express");
const { specs, swaggerUi } = require('./swagger');
// Ensure PORT is set in .env file
const PORT = process.env.PORT || 3000;
const {MONGODB_URI} = require("./keys")

require("./models/user")
require("./models/post")

app.use(express.json())

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }'
}));

// API routes
app.use(require("./routes/auth"))
app.use(require("./routes/post"))


mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
mongoose.connection.on('connected', ()=>{
    console.log("Connected to MongoDB")
})
mongoose.connection.on('error', (err)=>{
    console.log("Error connecting to MongoDB", err)
})

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})