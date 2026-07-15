import { Router } from 'express';
import { createItem, getItems, getItemById, updateItem, deleteItem, getItemsStats, getWeatherSuggestions, analyzeImageMetadata, rembgImage } from '../controllers/itemsController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate); // Protect all routes

router.post('/', upload.single('image'), createItem);
router.get('/stats', getItemsStats);
router.post('/weather-suggestions', getWeatherSuggestions);
router.post('/analyze-image', upload.single('image'), analyzeImageMetadata);
router.post('/rembg', rembgImage);
router.get('/', getItems);
router.get('/:id', getItemById);
router.patch('/:id', updateItem);
router.delete('/:id', deleteItem);

export default router;
