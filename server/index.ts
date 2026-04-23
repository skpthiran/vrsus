import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import analyzeRouter from './routes/analyze';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '20mb' }));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api', analyzeRouter);

app.listen(PORT, () => console.log(`VRSUS server running on port ${PORT}`));
