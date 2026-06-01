import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import supplierRoutes from './routes/supplier.routes';
import referralRoutes from './routes/client.routes';

const app = express();

// CORS configuration
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/referral', referralRoutes);

// Start server
app.listen(config.PORT, () => {
  console.log(`🚀 Backend server running on port ${config.PORT}`);
  console.log(`   CORS origin: ${config.FRONTEND_URL}`);
});

export default app;
