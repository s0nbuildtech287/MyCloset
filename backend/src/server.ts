import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import authRoutes from './routes/auth';
import itemsRoutes from './routes/items';
import outfitsRoutes from './routes/outfits';
import diaryRoutes from './routes/diary';
import aiRoutes from './routes/ai';
import closetRoutes from './routes/closets';
import tripRoutes from './routes/trips';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isVercel = origin.endsWith('.vercel.app');
    const isAllowed = allowedOrigins.includes(origin) || isVercel;
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Base API routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/outfits', outfitsRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/closets', closetRoutes);
app.use('/api/trips', tripRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Seed default user for testing
async function seedDefaultUser() {
  try {
    const email = 'xu4ns0n@drobe.com';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash('123456', 10);
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: 'Xuân Sơn',
        },
      });
      console.log('Successfully seeded default user: xu4ns0n@drobe.com');
    }
  } catch (error) {
    console.error('Error seeding default user:', error);
  }
}

seedDefaultUser().then(() => {
  const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

  const cleanExit = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      console.log('Server closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);
});

