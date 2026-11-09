const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/fitplate';
const DEFAULT_JWT_SECRET = 'fitplate_super_secret_jwt_key_2026';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = DEFAULT_JWT_SECRET;
}

if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = DEFAULT_MONGO_URI;
}

async function connectDB(uri) {
  const targetUri = uri || process.env.MONGO_URI || DEFAULT_MONGO_URI;
  await mongoose.connect(targetUri);
  return mongoose.connection;
}

module.exports = {
  connectDB,
  DEFAULT_MONGO_URI,
  DEFAULT_JWT_SECRET,
};
