const env = require('./env');
const { init } = require('./db');
const app = require('./app');

init()
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`Backend server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
