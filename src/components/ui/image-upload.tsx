import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadImage, deleteImage, validateImageFile } from '@/lib/imageUpload';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  className?: string;
}

export function ImageUpload({ images, onImagesChange, maxImages = 10, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    // Validate files
    const invalidFiles = files.filter(file => {
      const error = validateImageFile(file);
      return error !== null;
    });

    if (invalidFiles.length > 0) {
      alert('Some files are invalid. Please ensure all files are valid images under 5MB.');
      return;
    }

    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images.`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const fileName = file.name;
        setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));

        try {
          const result = await uploadImage(file, 'properties');
          setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
          return result.url;
        } catch (error) {
          console.error(`Failed to upload ${fileName}:`, error);
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
          });
          return null;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null) as string[];

      onImagesChange([...images, ...validUrls]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress({});
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (imageUrl: string, index: number) => {
    try {
      // Extract filename from URL for deletion
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Try to delete from storage (don't fail if it doesn't exist)
      try {
        await deleteImage(`properties/${fileName}`);
      } catch (error) {
        console.warn('Could not delete image from storage:', error);
      }

      // Remove from local state
      const newImages = images.filter((_, i) => i !== index);
      onImagesChange(newImages);
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Failed to remove image. Please try again.');
    }
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Button */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !canAddMore}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Add Images'}
        </Button>

        {images.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {images.length} / {maxImages} images
          </span>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border bg-secondary">
                <img
                  src={imageUrl}
                  alt={`Property image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Remove button */}
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveImage(imageUrl, index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}

          {/* Add more placeholder */}
          {canAddMore && !uploading && (
            <div
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Add more</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">No images uploaded</p>
          <p className="text-xs text-muted-foreground">Click "Add Images" to upload property photos</p>
        </div>
      )}

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Uploading images...</p>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
