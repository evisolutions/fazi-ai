require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'crystal-deprive-freedom-inside-proper-negative-indication',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  login: {
    username: process.env.LOGIN_USERNAME || 'fazi-admin',
    password: process.env.LOGIN_PASSWORD || '#demo-transfer-uniform-collar!'
  }
};
