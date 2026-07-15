import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { prisma } from '../db';
import { getEmbedding, checkDuplicateItem } from './similarityService';

export const processImageBackground = async (itemId: string) => {
  try {
    // 1. Fetch item details
    const item = await prisma.clothingItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      console.error(`Item not found for processing: ${itemId}`);
      return;
    }

    // Update status to processing
    await prisma.clothingItem.update({
      where: { id: itemId },
      data: { processingStatus: 'processing' },
    });

    // Resolve physical path of the original image
    const filename = path.basename(item.originalImageUrl);
    const originalFilePath = path.join(__dirname, '../../uploads', filename);

    if (!fs.existsSync(originalFilePath)) {
      throw new Error(`Original image file does not exist: ${originalFilePath}`);
    }

    // Read original file buffer
    const fileBuffer = fs.readFileSync(originalFilePath);

    // Compress and resize original image to max 1000px width/height and JPEG 70% quality
    // This reduces storage space from ~5MB down to ~50KB while retaining editor capabilities
    console.log(`Compressing original raw image for item: ${item.name}...`);
    const compressedOriginalBuffer = await sharp(fileBuffer)
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    // Overwrite original file with lightweight compressed JPEG
    fs.writeFileSync(originalFilePath, compressedOriginalBuffer);

    // 2. Read file to a Blob to send via FormData
    const fileBlob = new Blob([compressedOriginalBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', fileBlob, filename);

    console.log(`Sending image to rembg local server for item: ${item.name} (${itemId})...`);

    // Call rembg s local server (running on port 5000)
    // Timeout is set to 120 seconds to allow model downloads on first request
    const response = await axios.post('http://127.0.0.1:5000/api/remove', formData, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, 
    });

    // 3. Save the returned processed buffer as transparent WebP (extremely light weight)
    const processedFilename = `processed-${path.parse(filename).name}.webp`;
    const processedFilePath = path.join(__dirname, '../../uploads', processedFilename);

    console.log(`Converting background-removed image to transparent WebP for item: ${item.name}...`);
    const processedWebPBuffer = await sharp(Buffer.from(response.data))
      .webp({ quality: 80 })
      .toBuffer();

    fs.writeFileSync(processedFilePath, processedWebPBuffer);
    const processedImageUrl = `/uploads/${processedFilename}`;


    // 4. Extract visual embedding and check for duplicate uploads using MobileNet
    let embeddingStr: string | null = null;
    let duplicateWarningStr: string | null = null;

    try {
      console.log(`Extracting visual embedding for item: ${item.name} (${itemId})...`);
      const embedding = await getEmbedding(processedWebPBuffer);

      if (embedding) {
        embeddingStr = JSON.stringify(embedding);
        
        console.log(`Running similarity checking for duplicates in closet for item: ${item.name}...`);
        const dupCheck = await checkDuplicateItem(item.userId, item.id, embedding);
        if (dupCheck && dupCheck.isDuplicate) {
          duplicateWarningStr = JSON.stringify(dupCheck);
          console.warn(`[AI DUPLICATE DETECTED] New upload ${item.name} matches existing item with similarity: ${dupCheck.similarity}`);
        }
      }
    } catch (embErr) {
      console.error(`Failed to process visual similarity for item ${itemId}:`, embErr);
    }

    // 5. Update item in DB with processed image url, embedding, and potential duplicate warnings
    await prisma.clothingItem.update({
      where: { id: itemId },
      data: {
        processedImageUrl,
        processingStatus: 'done',
        embedding: embeddingStr,
        duplicateWarning: duplicateWarningStr,
      },
    });

    console.log(`Successfully completed background removal and duplicate detection for item: ${item.name}`);


  } catch (error: any) {
    console.error(`Failed background removal for item ${itemId}:`, error);

    // Update status to failed
    await prisma.clothingItem.update({
      where: { id: itemId },
      data: { processingStatus: 'failed' },
    }).catch((err: any) => console.error('Failed to update item status to failed', err));
  }
};
