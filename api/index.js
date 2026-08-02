const app = require('../server/app');
const { init } = require('../server/db');

let isInitialized = false;

module.exports = async (req, res) => {
  if (!isInitialized) {
    try {
      await init();
      isInitialized = true;
    } catch (err) {
      console.error('Failed to initialize database on Vercel:', err);
      return res.status(500).json({ error: 'Database initialization failed' });
    }
  }
  return app(req, res);
};
