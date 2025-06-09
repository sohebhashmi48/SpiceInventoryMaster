import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";

interface ImagePopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  alt?: string;
}

export default function ImagePopupModal({
  isOpen,
  onClose,
  imageUrl,
  title = "Image",
  alt = "Image"
}: ImagePopupModalProps) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetZoom = () => {
    setZoom(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              {/* Reset Zoom */}
              {zoom !== 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetZoom}
                >
                  Reset
                </Button>
              )}
              
              {/* Download Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              
              {/* Close Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        {/* Image Container */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-center min-h-[400px]">
            <img
              src={imageUrl}
              alt={alt}
              className="max-w-full h-auto rounded-lg shadow-lg transition-transform duration-200 cursor-grab active:cursor-grabbing"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center'
              }}
              onError={(e) => {
                console.error('Failed to load image in popup modal:', imageUrl);
                console.error('Image URL attempted:', imageUrl);
                // Try to show a better error message
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                      <div class="text-6xl mb-4">📷</div>
                      <h3 class="text-lg font-semibold mb-2">Image Not Found</h3>
                      <p class="text-sm text-muted-foreground mb-4">The receipt image could not be loaded.</p>
                      <p class="text-xs text-muted-foreground font-mono bg-gray-100 p-2 rounded">${imageUrl}</p>
                    </div>
                  `;
                }
              }}
              onLoad={() => {
                console.log('Successfully loaded image in popup modal:', imageUrl);
              }}
            />
          </div>
        </div>
        
        {/* Image Info */}
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Click and drag to pan • Use zoom controls to resize</span>
            <span>Press ESC to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
