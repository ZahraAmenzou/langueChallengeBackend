require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = (process.env.ADMIN_EMAIL || 'admin@tachelhit.com').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const name = process.env.ADMIN_NAME || 'Challenge Admin';

    const existing = await Admin.findOne({ email });

    if (existing) {
      console.log(`Admin already exists: ${email}`);
    } else {
      await Admin.create({ name, email, password });
      console.log(`Admin created successfully!`);
      console.log(`Email:    ${email}`);
      console.log(`Password: ${password}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Seed error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
