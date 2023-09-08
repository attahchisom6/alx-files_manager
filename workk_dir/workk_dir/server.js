import express from 'express';
import routes from './routes/index.js';

const app = express();
app.use(express.json());
app.use('/', routes);
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`server running and listening on port ${port}`);
});

