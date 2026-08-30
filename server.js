require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const connectDB = require('./src/config/database');

const { apiLimiter } = require('./src/middleware/rateLimit.middleware');

const {
  notFound,
  errorHandler,
} = require('./src/middleware/error.middleware');

const authRoutes = require('./src/routes/auth.routes');
const challengeRoutes = require('./src/routes/challenge.routes');
const playerRoutes = require('./src/routes/player.routes');

const app = express();

// ==========================================
// VERCEL / REVERSE PROXY
// ==========================================

app.set('trust proxy', 1);

// ==========================================
// SECURITY
// ==========================================

app.use(helmet());

// ==========================================
// CORS
// ==========================================

// CLIENT_URL example:
//
// Local:
// CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173
//
// Production:
// CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173,https://your-frontend.vercel.app

// Normalize a URL string to its bare hostname (lowercase, no scheme, no path,
// no trailing slash). Handles origins that include "https://" or not.
const toHostname = (url) => {
  try {
    return new URL(url.includes('://') ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return String(url).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
};

const allowedHostnames = (process.env.CLIENT_URL
  ? process.env.CLIENT_URL
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean)
  : []).map(toHostname);

console.log('Allowed CORS hostnames:', allowedHostnames);

// Check whether an incoming origin matches one of the allowed hosts.
// Accepts an exact hostname match OR any subdomain of an allowed hostname.
// The subdomain rule lets Vercel preview deploy URLs (e.g.
// <hash>-<user>-projects.vercel.app) work without listing each one.
const isOriginAllowed = (origin, allowedHosts) => {
  const hostname = toHostname(origin);
  if (!hostname) return false;

  return allowedHosts.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    // Requests without Origin
    // Example: Postman, server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (isOriginAllowed(origin, allowedHostnames)) {
      return callback(null, true);
    }

    console.log(`CORS blocked origin: ${origin}`);

    return callback(
      new Error(`CORS blocked origin: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-player-token',
  ],

  optionsSuccessStatus: 204,
};

// CORS middleware
app.use(cors(corsOptions));

// Explicitly handle preflight requests
app.options('*', cors(corsOptions));

// ==========================================
// BODY PARSER
// ==========================================

app.use(express.json({ limit: '1mb' }));

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Challenge API is running',
  });
});

// ==========================================
// RATE LIMITING
// ==========================================

app.use('/api', apiLimiter);

// ==========================================
// DATABASE CONNECTION GATE
// ==========================================
// Waits until MongoDB is ready before handling each request. The connection
// is cached (src/config/database.js), so once warm this is a near-instant
// no-op. On a cold serverless instance it prevents Mongoose's buffering
// from giving up (or hanging) before the connection finishes establishing.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ROUTES
// ==========================================

app.use('/api/auth', authRoutes);

app.use('/api/challenges', challengeRoutes);

app.use('/api', playerRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

app.use(notFound);

app.use(errorHandler);

// ==========================================
// SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `Challenge server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      `Failed to start server: ${error.message}`
    );

    process.exit(1);
  }
};

// ==========================================
// LOCAL / VERCEL
// ==========================================

if (require.main === module) {
  // Local development
  start();
} else {
  // Vercel serverless
  connectDB().catch((error) => {
    console.error(
      `MongoDB connection error: ${error.message}`
    );
  });
}

// ==========================================
// EXPORT
// ==========================================

module.exports = app;