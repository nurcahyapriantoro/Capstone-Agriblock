import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'AgriChain API Documentation',
    version: '1.0.0',
    description: 'API documentation for the AgriChain blockchain application',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'AgriChain Team',
      email: 'support@agrichain.example.com',
    },
  },
  servers: [
    {
      url: "http://localhost:5010/api",
      description: "Development server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // User Schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { 
            type: 'string',
            enum: ['FARMER', 'COLLECTOR', 'TRADER', 'RETAILER', 'CONSUMER', 'ADMIN', 'PRODUCER', 'INSPECTOR', 'MEDIATOR']
          },
          publicKey: { type: 'string' },
          createdAt: { type: 'number' },
          updatedAt: { type: 'number' }
        }
      },
      // Product Schemas
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          ownerId: { type: 'string' },
          category: { type: 'string' },
          initialQuantity: { type: 'number' },
          unit: { type: 'string' },
          price: { type: 'number' },
          locationGrown: { type: 'string' },
          harvestDate: { type: 'string', format: 'date' },
          certifications: { 
            type: 'array',
            items: { type: 'string' }
          },
          createdAt: { type: 'number' },
          updatedAt: { type: 'number' }
        }
      },
      // Transaction Schemas
      Transaction: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          data: { type: 'object' },
          signature: { type: 'string' },
          lastTransactionHash: { type: 'string' }
        }
      },
      // Blockchain Schemas
      Block: {
        type: 'object',
        properties: {
          hash: { type: 'string' },
          lastHash: { type: 'string' },
          number: { type: 'number' },
          timestamp: { type: 'number' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Transaction' }
          },
          nonce: { type: 'number' },
          difficulty: { type: 'number' }
        }
      },
      // Dispute Schema
      Dispute: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          productId: { type: 'string' },
          transactionId: { type: 'string' },
          complainantId: { type: 'string' },
          complainantRole: { 
            type: 'string',
            enum: ['FARMER', 'COLLECTOR', 'TRADER', 'RETAILER', 'CONSUMER', 'ADMIN', 'PRODUCER', 'INSPECTOR', 'MEDIATOR']
          },
          respondentId: { type: 'string' },
          respondentRole: { 
            type: 'string',
            enum: ['FARMER', 'COLLECTOR', 'TRADER', 'RETAILER', 'CONSUMER', 'ADMIN', 'PRODUCER', 'INSPECTOR', 'MEDIATOR']
          },
          type: { 
            type: 'string',
            enum: ['QUALITY', 'QUANTITY', 'DELIVERY', 'PAYMENT', 'PRICE', 'OTHER']
          },
          status: { 
            type: 'string',
            enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CANCELLED']
          },
          description: { type: 'string' },
          evidence: { 
            type: 'array',
            items: { type: 'string' }
          },
          createdAt: { type: 'number' },
          updatedAt: { type: 'number' },
          mediatorId: { 
            type: 'string',
            nullable: true
          },
          resolution: {
            type: 'object',
            nullable: true,
            properties: {
              type: { 
                type: 'string',
                enum: ['REFUND', 'REPLACEMENT', 'PARTIAL_REFUND', 'CREDIT', 'COMPENSATION', 'NO_ACTION']
              },
              description: { type: 'string' },
              resolvedAt: { type: 'number' },
              resolvedBy: { type: 'string' },
              compensation: { 
                type: 'number',
                nullable: true
              }
            }
          }
        }
      },
      // DisputeResponse Schema
      DisputeResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          dispute: { $ref: '#/components/schemas/Dispute' },
          message: { type: 'string' }
        }
      },
      // DisputeListResponse Schema
      DisputeListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          disputes: { 
            type: 'array',
            items: { $ref: '#/components/schemas/Dispute' }
          }
        }
      },
      // CreateDisputeRequest Schema
      CreateDisputeRequest: {
        type: 'object',
        required: ['productId', 'transactionId', 'complainantId', 'respondentId', 'type', 'description'],
        properties: {
          productId: { 
            type: 'string',
            description: 'ID of the product in dispute'
          },
          transactionId: { 
            type: 'string',
            description: 'ID of the transaction related to the dispute'
          },
          complainantId: { 
            type: 'string',
            description: 'ID of the user filing the complaint'
          },
          respondentId: { 
            type: 'string',
            description: 'ID of the user being complained about'
          },
          type: { 
            type: 'string',
            enum: ['QUALITY', 'QUANTITY', 'DELIVERY', 'PAYMENT', 'PRICE', 'OTHER'],
            description: 'Type of dispute'
          },
          description: { 
            type: 'string',
            description: 'Detailed description of the dispute'
          },
          evidence: { 
            type: 'array',
            items: { type: 'string' },
            description: 'List of evidence (could be file paths or URLs)'
          }
        }
      },
      // AssignMediatorRequest Schema
      AssignMediatorRequest: {
        type: 'object',
        required: ['disputeId', 'mediatorId'],
        properties: {
          disputeId: { 
            type: 'string',
            description: 'ID of the dispute'
          },
          mediatorId: { 
            type: 'string',
            description: 'ID of the mediator user'
          }
        }
      },
      // ResolveDisputeRequest Schema
      ResolveDisputeRequest: {
        type: 'object',
        required: ['disputeId', 'resolverId', 'resolutionType', 'description'],
        properties: {
          disputeId: { 
            type: 'string',
            description: 'ID of the dispute'
          },
          resolverId: { 
            type: 'string',
            description: 'ID of the user resolving the dispute'
          },
          resolutionType: { 
            type: 'string',
            enum: ['REFUND', 'REPLACEMENT', 'PARTIAL_REFUND', 'CREDIT', 'COMPENSATION', 'NO_ACTION'],
            description: 'Type of resolution'
          },
          description: { 
            type: 'string',
            description: 'Detailed description of the resolution'
          },
          compensation: { 
            type: 'number',
            description: 'Optional compensation amount'
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication is required to access the resource',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false
                },
                message: {
                  type: 'string',
                  example: 'Authentication required'
                }
              }
            }
          }
        }
      },
      BadRequestError: {
        description: 'Invalid input data',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data'
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
      BearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication and user management endpoints',
    },
    {
      name: 'Products',
      description: 'Product management endpoints',
    },
    {
      name: 'Transactions',
      description: 'Transaction management endpoints',
    },
    {
      name: 'Stock',
      description: 'Stock management endpoints',
    },
    {
      name: 'Blockchain',
      description: 'Blockchain information endpoints',
    },
    {
      name: 'Payments',
      description: 'Payment management endpoints',
    },
    {
      name: 'Disputes',
      description: 'Dispute resolution endpoints',
    },
  ],
  paths: {
    '/disputes': {
      post: {
        tags: ['Disputes'],
        summary: 'Create a new dispute',
        description: 'Create a new dispute between users regarding a product or transaction',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDisputeRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Dispute created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    disputeId: { type: 'string' },
                    message: { type: 'string', example: 'Dispute created successfully' }
                  }
                }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequestError' },
          401: { $ref: '#/components/responses/UnauthorizedError' }
        }
      }
    },
    '/disputes/{disputeId}': {
      get: {
        tags: ['Disputes'],
        summary: 'Get dispute by ID',
        description: 'Retrieve detailed information about a specific dispute',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'disputeId',
            schema: { type: 'string' },
            required: true,
            description: 'ID of the dispute to retrieve'
          }
        ],
        responses: {
          200: {
            description: 'Dispute details retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DisputeResponse' }
              }
            }
          },
          404: {
            description: 'Dispute not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Dispute not found' }
                  }
                }
              }
            }
          },
          401: { $ref: '#/components/responses/UnauthorizedError' }
        }
      }
    },
    '/disputes/product/{productId}': {
      get: {
        tags: ['Disputes'],
        summary: 'Get disputes by product ID',
        description: 'Retrieve all disputes related to a specific product',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'productId',
            schema: { type: 'string' },
            required: true,
            description: 'ID of the product to get disputes for'
          }
        ],
        responses: {
          200: {
            description: 'Product disputes retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DisputeListResponse' }
              }
            }
          },
          401: { $ref: '#/components/responses/UnauthorizedError' }
        }
      }
    },
    '/disputes/user/{userId}': {
      get: {
        tags: ['Disputes'],
        summary: 'Get disputes by user ID',
        description: 'Retrieve all disputes involving a specific user (either as complainant or respondent)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: { type: 'string' },
            required: true,
            description: 'ID of the user to get disputes for'
          }
        ],
        responses: {
          200: {
            description: 'User disputes retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DisputeListResponse' }
              }
            }
          },
          401: { $ref: '#/components/responses/UnauthorizedError' }
        }
      }
    },
    '/disputes/assign-mediator': {
      post: {
        tags: ['Disputes'],
        summary: 'Assign mediator to a dispute',
        description: 'Assign a mediator to handle and resolve a dispute. Only users with MEDIATOR or ADMIN role can be assigned.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AssignMediatorRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Mediator assigned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Mediator assigned successfully' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Invalid input or unauthorized mediator',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: {
            description: 'Dispute not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Dispute not found' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/disputes/resolve': {
      post: {
        tags: ['Disputes'],
        summary: 'Resolve a dispute',
        description: 'Provide a resolution for a dispute. Only the assigned mediator or an admin can resolve a dispute.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResolveDisputeRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Dispute resolved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Dispute resolved successfully' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Invalid input data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: {
            description: 'Dispute not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Dispute not found' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/api/routes/*.ts', './src/api/controller/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options); 