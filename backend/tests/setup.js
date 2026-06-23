const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const { generateAccessToken } = require('../middleware/auth');

let mongoServer;

/**
 * Connect to a new in-memory MongoDB instance for testing.
 */
const setupTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

/**
 * Close connection and stop MongoMemoryServer.
 */
const teardownTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
};

/**
 * Clear all collections between tests.
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Create a test admin user and return { user, token }.
 */
const createTestUser = async (overrides = {}) => {
  const userData = {
    name: 'Test Admin',
    email: `admin${Date.now()}@test.com`,
    password: 'TestPass123!',
    role: 'admin',
    ...overrides
  };
  
  const user = await User.create(userData);
  const token = generateAccessToken(user._id);
  
  return { user, token };
};

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearDatabase,
  createTestUser
};
