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
    } else if (req.path.includes('/expenses')) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'expenseimg');
    } else if (req.path.includes('/assets')) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'assets');
    } else if (req.path.includes('/caterers')) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'caterers');
    } else if (req.path.includes('/suppliers')) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'suppliers');
    } else if (req.path.includes('/categories')) {
      uploadDir = path.join(__dirname, 'public', 'uploads', 'categories');
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
    } else if (req.path.includes('/expenses')) {
      prefix = 'expense';
    } else if (req.path.includes('/assets')) {
      prefix = 'asset';
    } else if (req.path.includes('/caterers')) {
      prefix = 'caterer';
    } else if (req.path.includes('/suppliers')) {
      prefix = 'supplier';
    } else if (req.path.includes('/categories')) {
      prefix = 'category';
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
export const getFileUrl = (filename: string | null, type: 'receipt' | 'expense' | 'asset' | 'spice' | 'caterer' | 'supplier' | 'category' = 'spice'): string | null => {
  if (!filename) return null;

  let folder = 'spices';
  if (type === 'receipt') {
    folder = 'receipts';
  } else if (type === 'expense') {
    folder = 'expenseimg';
  } else if (type === 'asset') {
    folder = 'assets';
  } else if (type === 'caterer') {
    folder = 'caterers';
  } else if (type === 'supplier') {
    folder = 'suppliers';
  } else if (type === 'category') {
    folder = 'categories';
  }

  return `/api/uploads/${folder}/${filename}`;
};

// Helper function specifically for receipt images
export const getReceiptUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'receipt');
};

// Helper function specifically for expense images
export const getExpenseImageUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'expense');
};

// Helper function specifically for asset images
export const getAssetImageUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'asset');
};

// Helper function specifically for caterer images
export const getCatererImageUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'caterer');
};

// Helper function specifically for supplier images
export const getSupplierImageUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'supplier');
};

// Helper function specifically for product/spice images
export const getProductImageUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'spice');
};

// Helper function specifically for category images
export const getCategoryImageUrl = (filename: string | null): string | null => {
  return getFileUrl(filename, 'category');
};

export default upload;
