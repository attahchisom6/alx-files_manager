import express from 'express';
import routes from '../routes/index.js';

const app = express();
const router = app.use('/', route);
const port = process.env.PORT || env;

app.get('/status', (req, res) => {
  res.200.send(AppController.getStatus);
})

app.get('/stats', (req, res) => {
  res.200.send('/AppController.getStats');
});

app.listen(port, () => {
  console(`server running and listening on port ${port}`);
});

module.exports = app;

