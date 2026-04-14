/**
 * myVote Kenya USSD Handler
 * 
 * Africa's Talking USSD integration for feature phones.
 * Provides access to key features without internet/smartphone.
 * 
 * Menu Structure:
 * *123#
 * ├── 1. Check My Polling Station
 * ├── 2. Follow Candidate
 * │   ├── 1. President
 * │   ├── 2. Governor
 * │   ├── 3. Senator
 * │   ├── 4. Women Rep
 * │   ├── 5. MP
 * │   └── 6. MCA
 * ├── 3. Opinion Polls
 * ├── 4. Election Results
 * ├── 5. My Wallet
 * │   ├── 1. Check Balance
 * │   ├── 2. Top Up
 * │   └── 3. Transaction History
 * ├── 6. My Profile
 * │   ├── 1. View Profile
 * │   ├── 2. Update Location
 * │   └── 3. Notification Settings
 * └── 0. Help
 */

import 'dotenv/config';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { ussdRouter } from './routes/ussd';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'myvote-ussd' });
});

// USSD routes
app.use('/ussd', ussdRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('USSD Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🗳️  myVote USSD Service running on port ${PORT}`);
});

export default app;
