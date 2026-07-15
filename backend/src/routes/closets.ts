import { Router } from 'express';
import { getClosets, createCloset, deleteCloset } from '../controllers/closetsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getClosets);
router.post('/', createCloset);
router.delete('/:id', deleteCloset);

export default router;
