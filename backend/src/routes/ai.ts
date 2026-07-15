import { Router } from 'express';
import { chatWithStylist } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/chat', chatWithStylist);

export default router;
