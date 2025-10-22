const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Instagram Clone API',
            version: '1.0.0',
            description: 'A simple Instagram clone backend API with user authentication and post management',
            contact: {
                name: 'API Support',
                email: 'support@instagram-clone.com'
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Auto-generated unique identifier',
                            example: '60d5ecb74b24a6001f647c8a'
                        },
                        name: {
                            type: 'string',
                            description: 'User\'s full name',
                            example: 'John Doe'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User\'s email address',
                            example: 'john.doe@example.com'
                        },
                        password: {
                            type: 'string',
                            description: 'User\'s hashed password',
                            example: '$2a$12$xyz...'
                        }
                    }
                },
                UserResponse: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: '60d5ecb74b24a6001f647c8a'
                        },
                        name: {
                            type: 'string',
                            example: 'John Doe'
                        },
                        email: {
                            type: 'string',
                            example: 'john.doe@example.com'
                        }
                    }
                },
                Post: {
                    type: 'object',
                    required: ['title', 'body'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Auto-generated unique identifier',
                            example: '60d5ecb74b24a6001f647c8b'
                        },
                        title: {
                            type: 'string',
                            description: 'Post title',
                            example: 'My first post'
                        },
                        body: {
                            type: 'string',
                            description: 'Post content',
                            example: 'This is the content of my first post'
                        },
                        photo: {
                            type: 'string',
                            description: 'Photo URL or path',
                            default: 'no photo',
                            example: 'https://example.com/photo.jpg'
                        },
                        postBy: {
                            type: 'string',
                            description: 'User ID who created the post',
                            example: '60d5ecb74b24a6001f647c8a'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Post creation timestamp',
                            example: '2021-06-25T10:30:00.000Z'
                        }
                    }
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                        name: {
                            type: 'string',
                            example: 'John Doe'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'john.doe@example.com'
                        },
                        password: {
                            type: 'string',
                            minLength: 6,
                            example: 'password123'
                        }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'john.doe@example.com'
                        },
                        password: {
                            type: 'string',
                            example: 'password123'
                        }
                    }
                },
                CreatePostRequest: {
                    type: 'object',
                    required: ['title', 'body'],
                    properties: {
                        title: {
                            type: 'string',
                            example: 'My first post'
                        },
                        body: {
                            type: 'string',
                            example: 'This is the content of my first post'
                        }
                    }
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Operation completed successfully'
                        }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'string',
                            example: 'Error message'
                        },
                        fields: {
                            type: 'object',
                            description: 'Field-specific validation errors'
                        },
                        details: {
                            type: 'string',
                            description: 'Additional error details (development mode only)'
                        }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Login successful'
                        },
                        token: {
                            type: 'string',
                            description: 'JWT token for authentication',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                        }
                    }
                },
                RegisterResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'User registered successfully'
                        },
                        user: {
                            $ref: '#/components/schemas/UserResponse'
                        }
                    }
                },
                PostsResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        posts: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Post'
                            }
                        }
                    }
                },
                CreatePostResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Post created successfully'
                        },
                        post: {
                            $ref: '#/components/schemas/Post'
                        }
                    }
                },
                UserProfileResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        user: {
                            type: 'object',
                            properties: {
                                _id: {
                                    type: 'string',
                                    example: '60d5ecb74b24a6001f647c8a'
                                },
                                name: {
                                    type: 'string',
                                    example: 'John Doe'
                                },
                                email: {
                                    type: 'string',
                                    example: 'john.doe@example.com'
                                }
                            }
                        },
                        posts: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: {
                                        type: 'string',
                                        example: '60d5ecb74b24a6001f647c8b'
                                    },
                                    title: {
                                        type: 'string',
                                        example: 'My first post'
                                    },
                                    body: {
                                        type: 'string',
                                        example: 'This is the content of my first post'
                                    },
                                    photo: {
                                        type: 'string',
                                        description: 'MinIO object key for the photo',
                                        example: '1761102954154_2022-02-14-Indonesia_Indah.jpg'
                                    },
                                    imageUrl: {
                                        type: 'string',
                                        description: 'Full public URL to access the image',
                                        example: 'http://localhost:9000/instagram-clone/1761102954154_2022-02-14-Indonesia_Indah.jpg'
                                    },
                                    postBy: {
                                        type: 'object',
                                        properties: {
                                            _id: {
                                                type: 'string',
                                                example: '60d5ecb74b24a6001f647c8a'
                                            },
                                            name: {
                                                type: 'string',
                                                example: 'John Doe'
                                            }
                                        }
                                    },
                                    likes: {
                                        type: 'array',
                                        items: {
                                            type: 'string'
                                        },
                                        description: 'Array of user IDs who liked the post',
                                        example: ['60d5ecb74b24a6001f647c8a']
                                    },
                                    comments: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                text: {
                                                    type: 'string',
                                                    example: 'Great post!'
                                                },
                                                postedBy: {
                                                    type: 'object',
                                                    properties: {
                                                        _id: {
                                                            type: 'string',
                                                            example: '60d5ecb74b24a6001f647c8a'
                                                        },
                                                        name: {
                                                            type: 'string',
                                                            example: 'John Doe'
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        description: 'Array of comments on the post'
                                    },
                                    createdAt: {
                                        type: 'string',
                                        format: 'date-time',
                                        example: '2021-06-25T10:30:00.000Z'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./routes/*.js'], // Path to the API files
};

const specs = swaggerJsdoc(options);

module.exports = {
    specs,
    swaggerUi
};