const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Trust proxy if running behind nginx or similar
app.set('trust proxy', 1);

// Global API Rate Limiter
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const theoremsRouter = require('./routes/theorems');
const authRouter = require('./routes/auth');
const leaderboardRouter = require('./routes/leaderboard');
const bookmarksRouter = require('./routes/bookmarks');
const notificationsRouter = require('./routes/notifications');

app.use('/api/', globalApiLimiter);
app.use('/api/theorems', theoremsRouter);
app.use('/api/auth', authRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/notifications', notificationsRouter);

app.get('/', (req, res) => {
  res.send('Lean-Claw Platform API is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
