import { Router } from 'express';
import { getTrips, createTrip, deleteTrip, addTripItem, removeTripItem, toggleTripItemPacked } from '../controllers/tripsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getTrips);
router.post('/', createTrip);
router.delete('/:id', deleteTrip);
router.post('/items', addTripItem);
router.delete('/items/:id', removeTripItem);
router.patch('/items/:id/toggle-packed', toggleTripItemPacked);

export default router;
