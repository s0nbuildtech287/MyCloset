import { createClient } from '@supabase/supabase-js';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET = 'mycloset';

/**
 * Upload a buffer to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export const uploadToStorage = async (
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> => {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
};

/**
 * Delete a file from Supabase Storage by its public URL or storage path.
 */
export const deleteFromStorage = async (fileUrl: string): Promise<void> => {
  try {
    // Extract path from full URL or use as-is if already a path
    let filePath = fileUrl;
    const bucketPrefix = `/storage/v1/object/public/${BUCKET}/`;
    if (fileUrl.includes(bucketPrefix)) {
      filePath = fileUrl.split(bucketPrefix)[1];
    } else if (fileUrl.startsWith('/uploads/')) {
      // Legacy local path — nothing to delete from storage
      return;
    }

    const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (error) {
      console.error(`Failed to delete from storage: ${error.message}`);
    }
  } catch (err) {
    console.error('deleteFromStorage error:', err);
  }
};

/**
 * Check if a URL is a Supabase Storage URL (vs legacy local /uploads/ path)
 */
export const isStorageUrl = (url: string): boolean => {
  return url.startsWith('https://') && url.includes('supabase.co');
};
