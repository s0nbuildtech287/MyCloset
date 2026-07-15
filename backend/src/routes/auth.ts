import { Router } from 'express';
import { register, login, refresh, logout, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/change-password', authenticate, changePassword);

export default router;

