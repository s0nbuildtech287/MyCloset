import { Router } from 'express';
import { getDiaryEntries, upsertDiaryEntry, deleteDiaryEntry } from '../controllers/diaryController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getDiaryEntries);
router.post('/', upsertDiaryEntry);
router.delete('/:id', deleteDiaryEntry);

export default router;
