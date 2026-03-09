const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const theoremsRouter = require('./routes/theorems');
const authRouter = require('./routes/auth');
const leaderboardRouter = require('./routes/leaderboard');

app.use('/api/theorems', theoremsRouter);
app.use('/api/auth', authRouter);
app.use('/api/leaderboard', leaderboardRouter);

app.get('/', (req, res) => {
  res.send('Lean-Claw Platform API is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
