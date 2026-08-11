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

// Important for Vercel / reverse proxy
app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',')
      : '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Tachelhit Challenge API is running',
  });
});

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api', playerRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Tachelhit Challenge server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Local development
if (require.main === module) {
  start();
} else {
  // Vercel serverless
  connectDB().catch((error) => {
    console.error(`MongoDB connection error: ${error.message}`);
  });
}

module.exports = app;