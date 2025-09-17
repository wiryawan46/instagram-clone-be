# Instagram Clone - Backend

A Node.js and Express.js backend for an Instagram clone application. This project provides the API endpoints for user authentication and post management.

## Features

- User registration and authentication with JWT
- Create, read, and manage posts
- Protected routes with JWT verification
- RESTful API design with Swagger documentation
- Input validation
- Error handling

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)
- **Development**: Nodemon for hot-reloading
- **API Documentation**: Swagger UI with OpenAPI 3.0 specification

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MongoDB (local or cloud instance)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd instagram-clone-be
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory and add the following variables (or copy from `.env.example`):
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   PORT=5000
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The server will start on `http://localhost:5000` by default.

## API Documentation (Swagger)

This API is fully documented using Swagger/OpenAPI 3.0 specification. You can access the interactive API documentation in the following ways:

### Online Documentation

1. Start the development server (if not already running):
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000/api-docs
   ```

### Available Endpoints

The API documentation includes the following main sections:

#### Authentication
- `POST /register` - Register a new user
- `POST /login` - Authenticate user and get JWT token
- `GET /protected` - Test protected route (requires authentication)

#### Posts
- `GET /posts` - Get all posts (requires authentication)
- `POST /create-post` - Create a new post (requires authentication)
- `GET /myposts` - Get current user's posts (requires authentication)

### Authentication

All protected endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

## Example API Usage

### Register a New User
```http
POST /register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login
```http
POST /login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Create a New Post
```http
POST /create-post
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "title": "My First Post",
  "body": "This is my first post content..."
}
```

## Project Structure

```
instagram-clone-be/
├── middleware/           # Custom middleware (e.g., authentication)
├── models/              # Mongoose models
├── routes/              # API routes with Swagger documentation
│   ├── auth.js          # Authentication routes
│   └── post.js          # Post-related routes
├── utils/               # Utility functions
├── .env                 # Environment variables
├── .env.example         # Example environment variables
├── .gitignore           # Git ignore file
├── app.js               # Main application file
├── keys.js              # Configuration and keys
├── package.json         # Project dependencies and scripts
└── swagger.js           # Swagger/OpenAPI configuration
```

## Available Scripts

- `npm run dev` - Start the development server with nodemon and auto-reload
- `npm start` - Start the production server
- `npm test` - Run tests (if any)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
