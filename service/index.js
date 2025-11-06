const cors = require('cors');
const express = require('express');
const app = express();

const port = process.argv.length > 2 ? process.argv[2] : 4000;

const authRouter = require('./routes/auth');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRouter);

app.use((req, res) => {
  res.status(404).send({ msg: 'Not found' });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});