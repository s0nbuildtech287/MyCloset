import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import sharp from 'sharp';
import { prisma } from '../db';

let model: mobilenet.MobileNet | null = null;
let isModelLoading = false;

/**
 * Initialize and load the pre-trained MobileNet model
 */
export async function loadSimilarityModel() {
  if (model) return model;
  if (isModelLoading) {
    // Wait for the model to finish loading if already in progress
    while (isModelLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return model;
  }

  isModelLoading = true;
  try {
    console.log('Starting to load MobileNet model for similarity checks...');
    // We load MobileNet V2 with alpha 1.0 which yields a 1280-dimensional feature vector
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log('MobileNet model loaded successfully!');
  } catch (error) {
    console.error('Failed to load MobileNet model. Similarity check will be skipped.', error);
  } finally {
    isModelLoading = false;
  }
  return model;
}

/**
 * Extract feature embedding vector from an image buffer
 */
export async function getEmbedding(imageBuffer: Buffer): Promise<number[] | null> {
  try {
    const loadedModel = await loadSimilarityModel();
    if (!loadedModel) return null;

    // 1. Decode and resize image using sharp to raw RGB pixel buffer [224, 224, 3]
    const rawPixelBuffer = await sharp(imageBuffer)
      .resize(224, 224, { fit: 'fill' })
      .ensureAlpha(1) // Ensure 4 channels or format to extract
      .raw()
      .toBuffer();

    // The raw pixel buffer has 4 channels (RGBA) due to ensureAlpha
    // Let's convert it to 3 channels (RGB) for MobileNet
    const rgbPixels = new Uint8Array(224 * 224 * 3);
    for (let i = 0; i < 224 * 224; i++) {
      rgbPixels[i * 3] = rawPixelBuffer[i * 4];     // R
      rgbPixels[i * 3 + 1] = rawPixelBuffer[i * 4 + 1]; // G
      rgbPixels[i * 3 + 2] = rawPixelBuffer[i * 4 + 2]; // B
    }

    return tf.tidy(() => {
      // Create 3D tensor of shape [224, 224, 3]
      const tensor = tf.tensor3d(rgbPixels, [224, 224, 3]);
      
      // Get the 1280-dimensional embedding vector (activations from intermediate layer)
      const activation = loadedModel.infer(tensor, true);
      const data = activation.dataSync();
      
      return Array.from(data);
    });
  } catch (error) {
    console.error('Failed to extract image embedding:', error);
    return null;
  }
}

/**
 * Calculate Cosine Similarity between two numeric vectors
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Check if the uploaded item matches any existing active item in the user's closet
 * Returns duplicate warning object if match found above the similarity threshold
 */
export async function checkDuplicateItem(
  userId: string,
  itemId: string,
  newEmbedding: number[],
  threshold = 0.92
): Promise<{ isDuplicate: boolean; matchedItemName?: string; similarity?: number } | null> {
  try {
    // Get all other active clothing items for this user that have embeddings
    const items = await prisma.clothingItem.findMany({
      where: {
        userId,
        id: { not: itemId },
        embedding: { not: null }
      },
      select: {
        id: true,
        name: true,
        embedding: true
      }
    });

    for (const item of items) {
      if (!item.embedding) continue;
      const existingEmbedding = JSON.parse(item.embedding) as number[];
      const similarity = calculateCosineSimilarity(newEmbedding, existingEmbedding);

      if (similarity >= threshold) {
        console.log(`Duplicate detected! Item "${item.name}" matches new upload with similarity: ${similarity.toFixed(4)}`);
        return {
          isDuplicate: true,
          matchedItemName: item.name,
          similarity: Math.round(similarity * 100) / 100 // Round to 2 decimals
        };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error during duplicate item check:', error);
    return null;
  }
}
