/**
 * Utility functions specifically for handling asset images
 */

/**
 * Ensures the correct asset image URL format for display
 * @param imagePath - The image path from the database or API
 * @returns The properly formatted URL for the asset image or null if no image
 */
export const getAssetImageUrl = (
  imagePath: string | null | undefined
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
    return `/api/uploads/assets/${imagePath}`;
  }

  return imagePath;
};

/**
 * Helper function specifically for asset receipt images
 * @param imagePath - The receipt image path from the database or API
 * @returns The properly formatted URL for the asset receipt image or null if no image
 */
export const getAssetReceiptImageUrl = (
  imagePath: string | null | undefined
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
    return `/api/uploads/assets/${imagePath}`;
  }

  return imagePath;
};

/**
 * Validates if an image file is acceptable for asset upload
 * @param file - The file to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateAssetImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'Please select an image file (PNG, JPG, JPEG, etc.)'
    };
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image file must be smaller than 5MB'
    };
  }

  // Check for common image formats
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please select a valid image format (PNG, JPG, JPEG, WebP, or GIF)'
    };
  }

  return { isValid: true };
};

/**
 * Creates a preview URL for a selected image file
 * @param file - The image file to create preview for
 * @returns Promise that resolves to the preview URL
 */
export const createAssetImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to create image preview'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads an asset image to the server
 * @param file - The image file to upload
 * @param type - The type of asset image ('main' or 'receipt')
 * @returns Promise that resolves to the uploaded image URL
 */
export const uploadAssetImage = async (
  file: File, 
  type: 'main' | 'receipt' = 'main'
): Promise<string> => {
  const formData = new FormData();
  const fieldName = type === 'main' ? 'assetImage' : 'receiptImage';
  const endpoint = type === 'main' ? '/api/assets/upload-image' : '/api/assets/upload-receipt';
  
  formData.append(fieldName, file);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Upload failed with status: ${response.status}`);
  }

  const data = await response.json();
  return data.url;
};

/**
 * Generates a fallback display for when asset images fail to load
 * @param assetTitle - The title of the asset for alt text
 * @returns JSX element for fallback display
 */
export const getAssetImageFallback = (assetTitle?: string) => {
  return `
    <div class="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
      <div class="text-center text-gray-500">
        <svg class="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h6m-6 4h6"></path>
        </svg>
        <p class="text-sm">${assetTitle || 'Asset'}</p>
      </div>
    </div>
  `;
};

/**
 * Checks if an asset image URL is accessible
 * @param imageUrl - The image URL to check
 * @returns Promise that resolves to boolean indicating if image is accessible
 */
export const checkAssetImageAccessibility = async (imageUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking asset image accessibility:', error);
    return false;
  }
};
