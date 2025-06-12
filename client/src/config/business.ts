/**
 * Business configuration for RoyalSpicyMasala
 * Update these values with actual business information
 */

export const BUSINESS_CONFIG = {
  // Company Information
  name: 'RoyalSpicyMasala',
  tagline: 'Premium Spices & Masalas',
  description: 'Premium quality spices and masalas sourced directly from the finest farms. Bringing authentic flavors to your kitchen since 1995.',

  // Contact Information
  phone: '+91 97027 13157',
  email: 'royalspicymasala786@gmail.com',
  address: {
    street: '',
    area: 'Andheri(W)',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400053',
    country: 'India'
  },

  // WhatsApp Configuration
  whatsapp: {
    // IMPORTANT: Replace with actual WhatsApp Business number (without + sign)
    // This number MUST be registered on WhatsApp Business
    number: '919702713157', // Replace XXXXXXXXXX with actual 10-digit mobile number
    // Display number (with + sign for display purposes)
    displayNumber: '+91 97027 13157' // Replace with actual number for display
  },

  // Business Hours
  businessHours: {
    weekdays: {
      open: '9:00 AM',
      close: '8:00 PM'
    },
    sunday: {
      open: '10:00 AM',
      close: '6:00 PM'
    }
  },

  // Delivery Configuration
  delivery: {
    freeDeliveryThreshold: 500,
    deliveryFee: 50,
    currency: 'INR',
    currencySymbol: '₹'
  },

  // Social Media (for future use)
  social: {
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: ''
  },

  // Company Details
  company: {
    establishedYear: 1995,
    gst: '', // Add GST number if needed
    pan: '', // Add PAN number if needed
    license: '' // Add FSSAI license if needed
  }
} as const;

// Helper function to get formatted address
export function getFormattedAddress(): string {
  const addr = BUSINESS_CONFIG.address;
  const parts = [
    addr.street,
    addr.area,
    `${addr.city} ${addr.pincode}`,
    addr.state,
    addr.country
  ].filter(part => part && part.trim() !== '');

  return parts.join(', ');
}

// Helper function to get business WhatsApp number
export function getBusinessWhatsAppNumber(): string {
  return BUSINESS_CONFIG.whatsapp.number;
}

// Helper function to get display phone number
export function getDisplayPhoneNumber(): string {
  return BUSINESS_CONFIG.whatsapp.displayNumber;
}

// Helper function to get business email
export function getBusinessEmail(): string {
  return BUSINESS_CONFIG.email;
}
