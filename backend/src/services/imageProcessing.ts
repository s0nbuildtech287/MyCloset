import axios from 'axios';
import path from 'path';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { prisma } from '../db';
import { getEmbedding, checkDuplicateItem } from './similarityService';
import { uploadToStorage, deleteFromStorage } from './storageService';

/**
 * Gọi trực tiếp thư viện rembg qua Python subprocess (stdin → stdout).
 * Không cần HTTP server, không cần cổng 5000 — hoạt động ổn định 100% trên Docker.
 */
export const removeBackgroundViaPython = (inputBuffer: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const pyCommand = process.platform === 'win32' ? 'python' : 'python3';
    const py = spawn(pyCommand, [
      '-u',
      '-c',
      [
        'import sys, os',
        'os.environ["U2NET_HOME"] = "/app/.u2net"',
        'try:',
        '    from rembg import remove',
        '    data = sys.stdin.buffer.read()',
        '    result = remove(data)',
        '    sys.stdout.buffer.write(result)',
        '    sys.stdout.buffer.flush()',
        'except Exception as e:',
        '    sys.stderr.write(f"PYTHON_CRASH: {str(e)}\\n")',
        '    sys.stderr.flush()',
        '    sys.exit(1)'
      ].join('\n')
    ]);

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    py.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    py.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk));
    py.on('close', (code) => {
      if (code !== 0) {
        const stderrStr = Buffer.concat(errChunks).toString().trim();
        return reject(new Error(`rembg python subprocess exited with code ${code}. Python Error: ${stderrStr}`));
      }
      resolve(Buffer.concat(chunks));
    });
    py.on('error', (err) => reject(new Error(`Failed to spawn python3: ${err.message}`)));

    // Bắt lỗi trên stream stdin để tránh crash tiến trình Node khi EPIPE xảy ra
    py.stdin.on('error', (err) => {
      console.error('[rembg stdin error]', err.message);
    });

    py.stdin.write(inputBuffer);
    py.stdin.end();
  });
};


export const processImageBackground = async (itemId: string, removeBg = true) => {
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

    // 2. Download original image from Supabase Storage
    console.log(`Downloading original image for processing: ${item.name}...`);
    const originalResponse = await axios.get(item.originalImageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    const fileBuffer = Buffer.from(originalResponse.data);

    // 3. Compress and resize original image to max 1000px, JPEG 70%
    console.log(`Compressing original raw image for item: ${item.name}...`);
    const compressedOriginalBuffer = await sharp(fileBuffer)
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    // Overwrite original in storage with compressed version
    const originalFilename = item.originalImageUrl.split('/').pop()!;
    await uploadToStorage(compressedOriginalBuffer, originalFilename, 'image/jpeg');

    // 4. Process: remove background or just convert to WebP
    let processedWebPBuffer: Buffer;
    const processedFilename = `processed-${path.parse(originalFilename).name}.webp`;

    if (removeBg) {
      console.log(`Calling rembg Python subprocess to remove background for item: ${item.name} (${itemId})...`);
      const removedBuffer = await removeBackgroundViaPython(compressedOriginalBuffer);

      console.log(`Converting background-removed image to transparent WebP for item: ${item.name}...`);
      processedWebPBuffer = await sharp(removedBuffer)
        .webp({ quality: 80 })
        .toBuffer();
    } else {
      console.log(`Skipping background removal for item: ${item.name}. Converting to WebP...`);
      processedWebPBuffer = await sharp(compressedOriginalBuffer)
        .webp({ quality: 80 })
        .toBuffer();
    }

    // 5. Upload processed image to Supabase Storage
    const processedImageUrl = await uploadToStorage(
      processedWebPBuffer,
      processedFilename,
      'image/webp'
    );
    console.log(`Uploaded processed image to storage: ${processedImageUrl}`);

    // 6. Extract visual embedding and check for duplicates
    let embeddingStr: string | null = null;
    let duplicateWarningStr: string | null = null;

    try {
      console.log(`Extracting visual embedding for item: ${item.name} (${itemId})...`);
      const embedding = await getEmbedding(processedWebPBuffer);

      if (embedding) {
        embeddingStr = JSON.stringify(embedding);

        console.log(`Running similarity checking for duplicates for item: ${item.name}...`);
        const dupCheck = await checkDuplicateItem(item.userId, item.id, embedding);
        if (dupCheck && dupCheck.isDuplicate) {
          duplicateWarningStr = JSON.stringify(dupCheck);
          console.warn(`[AI DUPLICATE DETECTED] ${item.name} matches existing item with similarity: ${dupCheck.similarity}`);
        }
      }
    } catch (embErr) {
      console.error(`Failed to process visual similarity for item ${itemId}:`, embErr);
    }

    // 7. Update DB & optimize storage by deleting the raw original JPEG when removeBg is true
    if (removeBg && item.originalImageUrl) {
      console.log(`Optimizing storage: deleting original raw JPEG from storage: ${item.originalImageUrl}`);
      await deleteFromStorage(item.originalImageUrl).catch((err: any) => 
        console.error('Failed to delete original image during storage optimization:', err)
      );

      await prisma.clothingItem.update({
        where: { id: itemId },
        data: {
          originalImageUrl: processedImageUrl, // point originalImageUrl to WebP to prevent broken links
          processedImageUrl,
          processingStatus: 'done',
          embedding: embeddingStr,
          duplicateWarning: duplicateWarningStr,
        },
      });
    } else {
      await prisma.clothingItem.update({
        where: { id: itemId },
        data: {
          processedImageUrl,
          processingStatus: 'done',
          embedding: embeddingStr,
          duplicateWarning: duplicateWarningStr,
        },
      });
    }


    console.log(`Successfully completed processing for item: ${item.name}`);

  } catch (error: any) {
    console.error(`Failed background removal for item ${itemId}:`, error);

    await prisma.clothingItem.update({
      where: { id: itemId },
      data: { processingStatus: 'failed' },
    }).catch((err: any) => console.error('Failed to update item status to failed', err));
  }
};
