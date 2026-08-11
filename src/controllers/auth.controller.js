const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const login = async (req, res, next) => {
  try {
    console.log('LOGIN STEP 1');

    const { email, password } = req.body;

    console.log('LOGIN STEP 2 - email:', email);

    const admin = await Admin.findOne({ email });

    console.log('LOGIN STEP 3 - admin found:', !!admin);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('LOGIN STEP 4 - checking password');

    const passwordMatches = await admin.matchPassword(password);

    console.log('LOGIN STEP 5 - password matches:', passwordMatches);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('LOGIN STEP 6 - generating token');

    const token = generateToken(admin._id);

    console.log('LOGIN STEP 7 - success');

    return res.json({
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
    console.error('LOGIN CRITICAL ERROR:', error);
    return next(error);
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
