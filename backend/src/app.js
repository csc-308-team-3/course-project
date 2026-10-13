const express = require('express');
const cors = require('cors');

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173',
  })
);
app.use(express.json());

app.get('/api/health', (request, response) => {
  response.status(200).json({ message: 'ChoreMate API is running' });
});

module.exports = app;