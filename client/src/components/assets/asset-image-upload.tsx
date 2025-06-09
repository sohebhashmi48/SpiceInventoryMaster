import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Building2 } from "lucide-react";
import { getAssetImageUrl } from "@/lib/image-utils";

interface AssetImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (imageUrl: string | null) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const AssetImageUpload: React.FC<AssetImageUploadProps> = ({
  currentImageUrl,
  onImageChange,
  disabled = false,
  label = "Asset Image",
  className = ""
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      uploadImage(file);
    }
  };

  const uploadImage = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('assetImage', file);

      const response = await fetch('/api/assets/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      setPreviewUrl(data.url);
      onImageChange(data.url);

      toast({
        title: "Image uploaded successfully",
        description: "Asset image has been uploaded.",
      });
    } catch (error) {
      console.error('Asset image upload error:', error);
      toast({
        title: "Failed to upload image",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardContent className="p-6">
          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative group">
                <img
                  src={getAssetImageUrl(previewUrl) || previewUrl}
                  alt="Asset preview"
                  className="w-full h-48 object-cover rounded-lg border"
                  onError={(e) => {
                    console.error('Failed to load asset preview image:', previewUrl);
                    console.error('Attempted URL:', getAssetImageUrl(previewUrl));
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <div class="text-center text-gray-400">
                            <Building2 class="h-12 w-12 mx-auto mb-2" />
                            <p class="text-sm">Failed to load image</p>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleRemoveImage}
                  disabled={disabled || isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleUploadClick}
                disabled={disabled || isUploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Change Image'}
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click to upload an asset image
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, JPEG up to 5MB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleUploadClick}
                disabled={disabled || isUploading}
                className="mt-4"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetImageUpload;
