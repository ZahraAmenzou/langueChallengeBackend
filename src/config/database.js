const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      })
      .then((mongooseInstance) => {
        console.log(`MongoDB connected: ${mongooseInstance.connection.host}`);
        cached.conn = mongooseInstance;
        return mongooseInstance;
      })
      .catch((error) => {
        console.error(`MongoDB connection error: ${error.message}`);
        cached.promise = null;
        throw error;
      });
  }

  return cached.promise;
};

module.exports = connectDB;
