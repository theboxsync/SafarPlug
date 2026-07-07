import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';

// Import Route handlers
import authRoutes from './routes/authRoutes';
import stationRoutes from './routes/stationRoutes';
import chargerRoutes from './routes/chargerRoutes';
import sessionRoutes from './routes/sessionRoutes';
import tripRoutes from './routes/tripRoutes';
import reviewRoutes from './routes/reviewRoutes';
import paymentRoutes from './routes/paymentRoutes';

// Import Custom Middlewares
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

const app: Application = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Rate Limiting on /api/auth/* to prevent brute-force attacks (20 requests / 15 min per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
});

// Logging & Parsing
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes Mount Points
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/chargers', chargerRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);

// Catch all fallback route
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint route not found' });
});

// Global Error Handler
app.use(errorHandler);

export default app;
