/**
 * Admin Account Setup Script
 * 
 * Usage:
 *   npx tsx scripts/create-admin.ts
 * 
 * Required environment variables (set in .env.local):
 *   MONGODB_URI - MongoDB connection string
 *   ADMIN_EMAIL - Admin email address
 *   ADMIN_PASSWORD - Admin password (min 8 characters)
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function createAdmin() {
  // Validate environment
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    process.exit(1);
  }
  if (!ADMIN_EMAIL) {
    console.error('❌ ADMIN_EMAIL is not set in environment variables');
    process.exit(1);
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const collection = db.collection('users');

    // Check if admin already exists
    const existingAdmin = await collection.findOne({ 
      email: ADMIN_EMAIL.toLowerCase() 
    });

    if (existingAdmin) {
      console.log(`⚠️  User with email ${ADMIN_EMAIL} already exists.`);
      
      if (existingAdmin.role === 'ADMIN') {
        console.log('✅ Admin account already configured. No changes made.');
      } else {
        console.log('⚠️  Existing user is not an ADMIN. Please use a different email.');
      }
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // Create admin
    const result = await collection.insertOne({
      name: 'System Administrator',
      email: ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Admin account created successfully!');
    console.log(`   ID: ${result.insertedId}`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
    console.log('⚠️  Never commit real credentials to version control.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
