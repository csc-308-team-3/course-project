require('dotenv').config();

const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`ChoreMate API running at http://localhost:${port}`);
});