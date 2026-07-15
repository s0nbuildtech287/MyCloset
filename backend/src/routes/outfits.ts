import { Router } from 'express';
import { createOutfit, getOutfits, getOutfitById, deleteOutfit } from '../controllers/outfitsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // Protect all routes

router.post('/', createOutfit);
router.get('/', getOutfits);
router.get('/:id', getOutfitById);
router.delete('/:id', deleteOutfit);

export default router;
