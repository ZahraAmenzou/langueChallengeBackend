const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('LOGIN: request received');
    console.log('LOGIN: email:', email);
    console.log('LOGIN: JWT_SECRET exists:', !!process.env.JWT_SECRET);

    const admin = await Admin.findOne({ email });

    console.log('LOGIN: admin found:', !!admin);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await admin.matchPassword(password);

    console.log('LOGIN: password matches:', passwordMatches);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(admin._id);

    console.log('LOGIN: token generated successfully');

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      admin: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe };
