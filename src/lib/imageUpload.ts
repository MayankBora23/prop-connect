import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  url: string;
  fileName: string;
}

export const uploadImage = async (file: File, folder: string = 'properties'): Promise<UploadResult> => {
  // Generate a unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  // Upload the file to Supabase storage
  const { data, error } = await supabase.storage
    .from('property-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('property-images')
    .getPublicUrl(fileName);

  return {
    url: publicUrl,
    fileName
  };
};

export const deleteImage = async (fileName: string): Promise<void> => {
  const { error } = await supabase.storage
    .from('property-images')
    .remove([fileName]);

  if (error) {
    throw error;
  }
};

export const validateImageFile = (file: File): string | null => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return 'Please select a valid image file';
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return 'Image size must be less than 5MB';
  }

  // Check file extension
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return 'Please select a JPG, PNG, or WebP image';
  }

  return null;
};
