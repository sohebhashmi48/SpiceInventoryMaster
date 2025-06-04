import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine the upload directory based on the file type or route
    let uploadDir;

    if (req.path.includes('/receipts')) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'receipts');
    } else if (req.path.includes('/caterers')) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'caterers');
    } else if (req.path.includes('/suppliers')) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'suppliers');
    } else {
      // Default to spices directory
      uploadDir = path.join(__dirname, 'public', 'uploads', 'spices');
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);

    // Prefix based on the file type or route
    let prefix = 'file';
    if (req.path.includes('/receipts')) {
      prefix = 'receipt';
    } else if (req.path.includes('/caterers')) {
      prefix = 'caterer';
    } else if (req.path.includes('/suppliers')) {
      prefix = 'supplier';
    } else if (req.path.includes('/spices') || req.path.includes('/products')) {
      prefix = 'spice';
    }

    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow image files
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Create the multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Helper function to get the URL for a file
export const getFileUrl = (filename: string | null, type: 'receipt' | 'spice' | 'caterer' | 'supplier' = 'spice'): string | null => {
  if (!filename) return null;

  let folder = 'spices';
  if (type === 'receipt') {
    folder = 'receipts';
  } else if (type === 'caterer') {
    folder = 'caterers';
  } else if (type === 'supplier') {
    folder = 'suppliers';
  }

  return `/api/uploads/${folder}/${filename}`;
};

// Helper function specifically for receipt images
export const getReceiptUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'receipt');
};

// Helper function specifically for caterer images
export const getCatererImageUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'caterer');
};

// Helper function specifically for supplier images
export const getSupplierImageUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'supplier');
};

export default upload;
