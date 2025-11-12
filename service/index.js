const cors = require('cors');
const express = require('express');
const app = express();

const port = process.argv.length > 2 ? process.argv[2] : 4000;

const authRouter = require('./routes/auth');
const spotifyRouter = require('./routes/spotify');
const songsRouter = require('./routes/songs');
const reviewsRouter = require('./routes/reviews');
const profilesRouter = require('./routes/profiles')

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRouter);
app.use('/api/spotify', spotifyRouter);
app.use('/api/songs', songsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/profiles', profilesRouter);

app.use((req, res) => {
  res.status(404).send({ msg: 'Not found' });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});