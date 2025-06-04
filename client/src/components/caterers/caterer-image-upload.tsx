import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCatererImageUrl } from "@/lib/image-utils";

interface CatererImageUploadProps {
  currentImage?: string | null;
  onImageChange: (imageUrl: string | null) => void;
  disabled?: boolean;
}

export default function CatererImageUpload({
  currentImage,
  onImageChange,
  disabled = false
}: CatererImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(getCatererImageUrl(currentImage) || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadImage(file);
  };

  const uploadImage = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('shopCard', file);

      const response = await fetch('/api/caterers/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      onImageChange(data.url);

      toast({
        title: "Image uploaded successfully",
        description: "Shop card image has been uploaded.",
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Failed to upload image",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      // Reset preview on error
      setPreviewUrl(getCatererImageUrl(currentImage) || null);
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
    <div className="space-y-4">
      <Label htmlFor="shopCardImage">Shop Card Image</Label>

      <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardContent className="p-6">
          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative group">
                <img
                  src={getCatererImageUrl(previewUrl) || previewUrl}
                  alt="Shop card preview"
                  className="w-full h-48 object-cover rounded-lg border"
                  onError={(e) => {
                    console.error('Failed to load caterer preview image:', previewUrl);
                    console.error('Attempted URL:', getCatererImageUrl(previewUrl));
                  }}
                />
                {!disabled && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {!disabled && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Change Image
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveImage}
                    className="px-3"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>

              <div>
                <h3 className="font-medium text-sm">Upload Shop Card Image</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Add an image of your shop card or business logo
                </p>
              </div>

              {!disabled && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Select Image
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <p className="text-xs text-muted-foreground">
        Supported formats: JPEG, PNG, GIF, WebP. Maximum size: 5MB.
      </p>
    </div>
  );
}
