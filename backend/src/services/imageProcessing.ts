import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db';

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

    // 2. Read file to a Blob to send via FormData
    const fileBuffer = fs.readFileSync(originalFilePath);
    const fileBlob = new Blob([fileBuffer], { type: 'image/jpeg' });

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

    // 3. Save the returned processed buffer as PNG (rembg returns transparent PNG)
    const processedFilename = `processed-${path.parse(filename).name}.png`;
    const processedFilePath = path.join(__dirname, '../../uploads', processedFilename);

    fs.writeFileSync(processedFilePath, Buffer.from(response.data));
    const processedImageUrl = `/uploads/${processedFilename}`;

    // 4. Update item in DB
    await prisma.clothingItem.update({
      where: { id: itemId },
      data: {
        processedImageUrl,
        processingStatus: 'done',
      },
    });

    console.log(`Successfully completed background removal for item: ${item.name}`);

  } catch (error: any) {
    console.error(`Failed background removal for item ${itemId}:`, error);

    // Update status to failed
    await prisma.clothingItem.update({
      where: { id: itemId },
      data: { processingStatus: 'failed' },
    }).catch((err: any) => console.error('Failed to update item status to failed', err));
  }
};
