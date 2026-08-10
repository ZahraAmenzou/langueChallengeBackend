require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/database');
const { apiLimiter } = require('./src/middleware/rateLimit.middleware');
const { notFound, errorHandler } = require('./src/middleware/error.middleware');
const authRoutes = require('./src/routes/auth.routes');
const challengeRoutes = require('./src/routes/challenge.routes');
const playerRoutes = require('./src/routes/player.routes');

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Tachelhit Challenge API is running' });
});

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api', playerRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
} else {
  // Vercel (serverless): connect to MongoDB on module load. Mongoose buffers
  // operations until the connection is ready, so early requests are safe.
  connectDB().catch((error) => {
    console.error(`MongoDB connection error: ${error.message}`);
  });
}

module.exports = app;
