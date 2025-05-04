import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BarcodeProps {
  onScan: (barcode: string) => void;
}

export function Barcode({ onScan }: BarcodeProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const startScanning = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsScanning(false);
    }
  };
  
  const stopScanning = () => {
    setIsScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  const manualEntry = () => {
    if (scannedBarcode) {
      onScan(scannedBarcode);
      setScannedBarcode("");
    }
  };
  
  // This is a simplified implementation - in a real app, you'd use a library
  // like QuaggaJS or zxing-js to handle the barcode scanning
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isScanning) {
      interval = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          
          const ctx = canvas.getContext('2d');
          if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // In a real implementation, this is where barcode detection would happen
            // For this demo, let's just simulate finding a barcode after a few seconds
            if (Math.random() < 0.05) { // 5% chance each frame of "detecting" a barcode
              const randomBarcode = `SPICE${Math.floor(Math.random() * 10000).toString().padStart(6, '0')}`;
              stopScanning();
              onScan(randomBarcode);
            }
          }
        }
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
      stopScanning();
    };
  }, [isScanning, onScan]);
  
  return (
    <div className="space-y-4 border rounded-md p-4 bg-gray-50">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Barcode Scanner</h3>
        {!isScanning ? (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={startScanning}
          >
            Start Camera
          </Button>
        ) : (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={stopScanning}
          >
            Stop Camera
          </Button>
        )}
      </div>
      
      {isScanning ? (
        <div className="relative rounded-md overflow-hidden bg-black">
          <video 
            ref={videoRef} 
            className="w-full max-h-48 object-cover"
            playsInline 
          />
          <canvas 
            ref={canvasRef} 
            className="hidden"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-1/3 border-2 border-white rounded-md">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-secondary"></div>
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-secondary"></div>
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-secondary"></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-secondary"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-md h-48 flex items-center justify-center">
          <div className="text-center">
            <p className="text-neutral-600 mb-2">
              Click "Start Camera" to scan a barcode
            </p>
            <p className="text-neutral-500 text-xs">
              Position the barcode within the scanner area
            </p>
          </div>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={scannedBarcode}
          onChange={(e) => setScannedBarcode(e.target.value)}
          placeholder="Or enter barcode manually"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button 
          type="button" 
          variant="secondary" 
          size="sm"
          onClick={manualEntry}
          disabled={!scannedBarcode}
        >
          Enter
        </Button>
      </div>
    </div>
  );
}
