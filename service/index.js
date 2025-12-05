const { peerProxy } = require('./peerProxy');

const cors = require('cors');
const express = require('express');
const app = express();

const port = process.argv.length > 2 ? process.argv[2] : 4000;

// Route imports
const authRouter = require('./routes/auth');
const spotifyRouter = require('./routes/spotify');
const songsRouter = require('./routes/songs');
const albumsRouter = require('./routes/albums');
const reviewsRouter = require('./routes/reviews');
const discoveriesRouter = require('./routes/discoveries');
const profilesRouter = require('./routes/profiles');
const commentsRouter = require('./routes/comments');
const likesRouter = require('./routes/likes');
const repostsRouter = require('./routes/reposts');
const relationshipsRouter = require('./routes/relationships');
const blocksRouter = require('./routes/blocks');
const notificationsRouter = require('./routes/notifications');
const messagesRouter = require('./routes/messages');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/spotify', spotifyRouter);
app.use('/api/songs', songsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/discoveries', discoveriesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/likes', likesRouter);
app.use('/api/reposts', repostsRouter);
app.use('/api/relationships', relationshipsRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/messages', messagesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).send({ msg: 'Not found' });
});

const httpServer = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

peerProxy(httpServer);
