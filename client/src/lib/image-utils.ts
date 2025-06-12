/**
 * Utility functions for handling image URLs in the application
 */

/**
 * Ensures the correct image URL format for display
 * @param imagePath - The image path from the database or API
 * @param entityType - The type of entity (suppliers, caterers, spices, etc.)
 * @returns The properly formatted URL for the image or null if no image
 */
export const getImageUrl = (
  imagePath: string | null | undefined,
  entityType: 'suppliers' | 'caterers' | 'spices' | 'receipts' | 'expenseimg' | 'assets' | 'categories' = 'suppliers'
): string | null => {
  if (!imagePath) return null;

  // If the path already starts with /api, return as is
  if (imagePath.startsWith('/api/')) {
    return imagePath;
  }

  // If the path starts with /uploads, add /api prefix
  if (imagePath.startsWith('/uploads/')) {
    return `/api${imagePath}`;
  }

  // If it's just a filename, construct the full path
  if (!imagePath.includes('/')) {
    return `/api/uploads/${entityType}/${imagePath}`;
  }

  return imagePath;
};

/**
 * Helper function specifically for supplier images
 */
export const getSupplierImageUrl = (imagePath: string | null | undefined): string | null => {
  return getImageUrl(imagePath, 'suppliers');
};

/**
 * Helper function specifically for caterer images
 */
export const getCatererImageUrl = (imagePath: string | null | undefined): string | null => {
  return getImageUrl(imagePath, 'caterers');
};

/**
 * Helper function specifically for spice images
 */
export const getSpiceImageUrl = (imagePath: string | null | undefined): string | null => {
  return getImageUrl(imagePath, 'spices');
};

/**
 * Helper function specifically for receipt images (for expenses)
 */
export const getReceiptImageUrl = (imagePath: string | null | undefined): string | null => {
  return getImageUrl(imagePath, 'expenseimg');
};

/**
 * Helper function specifically for expense images (alias for receipt images)
 */
export const getExpenseImageUrl = (imagePath: string | null | undefined): string | null => {
  return getImageUrl(imagePath, 'expenseimg');
};

/**
 * Helper function specifically for asset images
 */
export const getAssetImageUrl = (imagePath: string | null | undefined): string | null => {
  return getImageUrl(imagePath, 'assets');
};

/**
 * Helper function specifically for category images
 */
export const getCategoryImageUrl = (imagePath: string | null | undefined): string | null => {
  return getImageUrl(imagePath, 'categories');
};
