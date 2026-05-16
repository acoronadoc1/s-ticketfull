// config/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// 📧 CONFIGURACIÓN DE NODEMAILER
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

module.exports = transporter;