import express, {
  type NextFunction,
  type Response,
  type Request,
} from "express"
import cors from "cors"
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from "swagger-jsdoc"
import bodyParser from "body-parser"
import { ValidationError } from "express-validation"
import helmet from "helmet"
import rateLimit from "express-rate-limit"

import Transaction from "../transaction"
import apiRoutes from "./routes"
import catch404Error from "./middleware/catch404"
import handleError from "./middleware/errorHandler"
import { swaggerSpec } from "../config"
import { requestLogger, errorLogger } from "../middleware/requestLogger"

import type { ChainInfo, ConnectedNode } from "../types"

import ProductRoute from "./routes/ProductRoute"
import BlockchainRoute from "./routes/BlockchainRoute"
import UserRoute from "./routes/UserRoute"
import StateRoute from "./routes/StateRoute"
import BlockRoute from "./routes/BlockRoute"
import TransactionRoute from "./routes/TransactionRoute"
import RoleRoute from "./routes/RoleRoute"
import NotificationRoute from "./routes/NotificationRoute"
import TransactionHistoryRoute from "./routes/TransactionHistoryRoute"

// Import new routes
import ProductSearchRoute from "./routes/ProductSearchRoute"
import ProductBatchRoute from "./routes/ProductBatchRoute"
import ProductVersionRoute from "./routes/ProductVersionRoute"
import WebhookRoute from "./routes/WebhookRoute"
import AuthRoute from "./routes/AuthRoute"
import SynchronizationRoute from "./routes/SynchronizationRoute"

// Import ProductSynchronizationService for auto-sync feature
import ProductSynchronizationService from "../core/ProductSynchronizationService"

// Import global error handler
import { globalErrorHandler } from "../utils/errorHandler"

const app = express()

const api = (
  port: number,
  client: {
    publicKey: string
    mining: boolean
    chainInfo: ChainInfo
    connectedNodes: Map<string, ConnectedNode>
  },
  transactionHandler: (transaction: Transaction) => void
) => {
  const { chainInfo, publicKey, mining, connectedNodes } = client

  const localsMiddleware = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    res.locals = {
      chainInfo,
      mining,
      getConnectedNode: () => {
        return [...connectedNodes.values()].map((node) => node.publicKey)
      },
      transactionHandler,
    }
    next()
  }

  process.on("uncaughtException", (err) =>
    console.log(
      `\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Uncaught Exception`,
      err
    )
  )

  // Security middleware
  app.use(helmet())
  app.use(cors())

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 1000 requests per windowMs
  })
  app.use(limiter)

  // Body parsing middleware
  app.use(bodyParser.json({ limit: '10mb' }))
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }))

  // setup middleware
  app.use(requestLogger)

  // Setup Swagger documentation
  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "AgriChain API",
        version: "1.0.0",
        description: "API documentation for AgriChain blockchain application",
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
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    apis: ["./src/api/routes/*.ts"],
  }

  const swaggerDocs = swaggerJsdoc(swaggerOptions)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

  // API JSON docs endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // setup routes
  app.use("/api", localsMiddleware, apiRoutes)

  app.get("/api/node/address", (req, res) => {
    res.json({
      data: { publicKey },
    })
  })

  // API routes
  app.use("/product", ProductRoute)
  app.use("/blockchain", BlockchainRoute)
  app.use("/user", UserRoute)
  app.use("/state", StateRoute)
  app.use("/block", BlockRoute)
  app.use("/transaction", TransactionRoute)
  app.use("/role", RoleRoute)
  app.use("/notification", NotificationRoute)
  app.use("/transaction-history", TransactionHistoryRoute)

  // Register new routes
  app.use("/product-search", ProductSearchRoute)
  app.use("/product-batch", ProductBatchRoute)
  app.use("/product-version", ProductVersionRoute)
  app.use("/webhook", WebhookRoute)
  app.use("/sync", SynchronizationRoute)
  
  // Specific route handler for Google OAuth
  // Penting: Daftarkan rute tertentu sebelum router umum
  app.get("/api/auth/google/callback", (req, res, next) => {
    console.log("Google OAuth callback received at /api/auth/google/callback");
    console.log("Request query:", req.query);
    next();
  });

  // Kemudian daftarkan router umum
  app.use("/auth", AuthRoute)
  app.use("/api/auth", AuthRoute)

  app.use(errorLogger)
  app.use(catch404Error)
  app.use(handleError)

  // Register global error handler
  app.use(globalErrorHandler)

  // Handle validation errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ValidationError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation error",
          details: err.details,
          timestamp: Date.now()
        }
      });
    }
    next(err);
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: Date.now()
      }
    });
  });

  app.listen(port, () => {
    console.log(`Server up on port ${port}`)
    console.log(`API Documentation available at http://localhost:${port}/api-docs`)
    
    // Jalankan sinkronisasi produk otomatis setiap 60 menit
    console.log("Setting up automatic product synchronization...")
    ProductSynchronizationService.schedulePeriodicSync(60);
    
    // Jalankan sinkronisasi awal saat aplikasi dimulai
    setTimeout(async () => {
      try {
        console.log("Running initial product synchronization...")
        const result = await ProductSynchronizationService.synchronizeProducts();
        console.log(`Initial synchronization completed: ${result.syncedProducts} products synchronized.`);
      } catch (error) {
        console.error("Error during initial product synchronization:", error);
      }
    }, 10000); // Tunggu 10 detik setelah server startup untuk memastikan semua komponen sudah siap
  })
}

export default api
