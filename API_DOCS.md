# Instagram Clone API Documentation

This project now includes comprehensive Swagger/OpenAPI documentation for all API endpoints.

## Accessing the Documentation

Once the server is running, you can access the interactive API documentation at:

**http://localhost:3000/api-docs**

## API Overview

### Authentication Endpoints
- `POST /register` - Register a new user account
- `POST /login` - Login and receive JWT token  
- `GET /protected` - Test endpoint for token validation

### Post Endpoints (Require Authentication)
- `GET /posts` - Get all posts from all users
- `POST /create-post` - Create a new post
- `GET /myposts` - Get posts from the current user

## Authentication

Most endpoints require JWT token authentication. After logging in, include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Getting Started

1. Start the server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/api-docs
   ```

3. Use the interactive documentation to:
   - View endpoint details
   - Test API calls directly from the browser
   - See request/response schemas
   - Copy curl commands for external testing

## Example Usage

### 1. Register a new user
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com", 
    "password": "password123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 3. Create a post (with token)
```bash
curl -X POST http://localhost:3000/create-post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "My First Post",
    "body": "This is my first post content!"
  }'
```

## Schema Information

The API uses the following main data models:

- **User**: Contains name, email, and hashed password
- **Post**: Contains title, body, optional photo, creator reference, and timestamp
- **JWT Token**: Used for authentication on protected routes

All request/response schemas are fully documented in the Swagger UI with examples and validation rules.