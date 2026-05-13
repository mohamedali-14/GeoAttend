// src/app.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const routes = require("./routes");

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// CORS configuration
app.use(cors({ 
    origin: true,  // Allow all origins (configure as needed for production)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsers with increased limits for file uploads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============================================
// MULTIPART/FILE UPLOAD CONFIGURATION
// ============================================

// Configure multer for memory storage (used in quiz controller)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files per request
    },
    fileFilter: (req, file, cb) => {
        // Accept only PDF files for lecture uploads
        if (file.fieldname === 'pdf') {
            if (file.mimetype === 'application/pdf') {
                cb(null, true);
            } else {
                cb(new Error('Only PDF files are allowed for lecture uploads'), false);
            }
        } else {
            // For selfie images, accept common image formats
            const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
            if (allowedImageTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Invalid file type. Please upload an image file.'), false);
            }
        }
    }
});

// Make upload available to routes
app.locals.upload = upload;

// ============================================
// REQUEST LOGGING MIDDLEWARE (Optional)
// ============================================

// Log all requests in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

// ============================================
// API ROUTES
// ============================================

// Mount all routes under /api prefix
app.use("/api", routes);

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

// Root health check
app.get("/", (req, res) => {
    res.json({ 
        status: "OK", 
        message: "GeoAttend API is running",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        endpoints: {
            health: "GET /",
            api: "GET /api/*",
            docs: "See README for full API documentation"
        }
    });
});

// Detailed health check for monitoring
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ============================================
// 404 HANDLER - Route Not Found
// ============================================

app.use("*", (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: `Route ${req.originalUrl} not found`,
        message: "Please check the API documentation for available endpoints",
        timestamp: new Date().toISOString()
    });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
    console.error("Unhandled error:", {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        timestamp: new Date().toISOString()
    });

    // Handle multer specific errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                error: "File too large. Maximum file size is 10MB.",
                code: err.code
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                success: false, 
                error: "Too many files uploaded.",
                code: err.code
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                success: false, 
                error: "Unexpected field name for file upload.",
                code: err.code
            });
        }
        return res.status(400).json({ 
            success: false, 
            error: err.message,
            code: err.code
        });
    }

    // Handle file filter errors
    if (err.message && err.message.includes('Only PDF files')) {
        return res.status(400).json({ 
            success: false, 
            error: err.message
        });
    }

    // Handle Firebase specific errors
    if (err.code && err.code.startsWith('auth/')) {
        return res.status(401).json({ 
            success: false, 
            error: "Authentication error",
            code: err.code
        });
    }

    // Default error response
    const statusCode = err.status || 500;
    res.status(statusCode).json({ 
        success: false, 
        error: statusCode === 500 ? "Internal server error" : err.message,
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// EXPORT APP
// ============================================

module.exports = app;