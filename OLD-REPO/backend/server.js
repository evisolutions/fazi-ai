const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const config = require("./config/config");

// Import routes
const authRoutes = require("./routes/auth");
const calculateRoutes = require("./routes/calculate");
const chatRoutes = require("./routes/chat");

// Create Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "https://fazi.api.evi.rs",
      "https://fazi.evi.rs",
    ], // Add your frontend URLs
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Create necessary directories
const uploadsDir = path.join(__dirname, "uploads");
const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log("Created data directory");
}

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check route for integration smoke tests
app.get("/api/health", async (req, res) => {
  try {
    const healthService = require('./services/healthService');
    const health = await healthService.getHealthStatus();
    
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Python API test endpoint
app.get("/api/python/test", async (req, res) => {
  try {
    const healthService = require('./services/healthService');
    const pythonConnection = await healthService.testPythonConnection();
    const pythonEndpoint = await healthService.testPythonEndpoint();
    
    res.json({
      success: true,
      message: "Python API test completed",
      connection: pythonConnection,
      endpoint: pythonEndpoint,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Python test error:', error);
    res.status(500).json({
      success: false,
      message: "Python API test failed",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api", calculateRoutes);
app.use("/api", chatRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "File too large",
      details: "Maximum file size is 50MB",
    });
  }

  if (error.message === "Only XLSX files are allowed") {
    return res.status(400).json({
      error: "Invalid file type",
      details: "Only XLSX files are allowed",
    });
  }

  res.status(500).json({
    error: "Internal server error",
    details: error.message,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 AI-FAZI Backend Server Started");
  console.log("=".repeat(50));
  console.log(`📍 Server running on port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔑 JWT Secret configured: ${config.jwtSecret ? "Yes" : "No"}`);
  console.log("\n💡 Default credentials:");
  console.log(`   Username: ${config.login.username}`);
  console.log(`   Password: ${config.login.password}`);
  console.log("\n" + "=".repeat(50) + "\n");
});

module.exports = app;
