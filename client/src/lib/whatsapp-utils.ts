/**
 * WhatsApp utility functions for generating proper WhatsApp URLs and messages
 */

import { getBusinessWhatsAppNumber } from '@/config/business';

/**
 * Formats a phone number for WhatsApp URL
 * Removes any non-digit characters and ensures proper format
 * @param phoneNumber - Phone number in any format
 * @returns Formatted phone number for WhatsApp URL (without + sign)
 */
export function formatWhatsAppNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // If number doesn't start with country code, assume it's Indian number
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }

  // If it already has country code, return as is
  return digitsOnly;
}

/**
 * Generates a WhatsApp URL with proper formatting
 * @param phoneNumber - Phone number (can include + or other characters)
 * @param message - Message to send
 * @returns Properly formatted WhatsApp URL
 */
export function generateWhatsAppUrl(phoneNumber: string, message: string): string {
  const formattedNumber = formatWhatsAppNumber(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
}

/**
 * Opens WhatsApp with a message
 * @param phoneNumber - Phone number to send message to
 * @param message - Message content
 * @param openInNewTab - Whether to open in new tab (default: true)
 * @throws Error if phone number is invalid or contains placeholder values
 */
export function openWhatsApp(phoneNumber: string, message: string, openInNewTab: boolean = true): void {
  try {
    // Check for placeholder/test numbers
    if (phoneNumber.includes('XXXXXXXXXX') || phoneNumber === '919876543210') {
      throw new Error(
        'WhatsApp number not configured! Please update the business phone number in client/src/config/business.ts with your actual WhatsApp Business number. See WHATSAPP_SETUP.md for detailed instructions.'
      );
    }

    // Validate phone number format
    if (!isValidWhatsAppNumber(phoneNumber)) {
      throw new Error(
        `Invalid WhatsApp number format: ${phoneNumber}. Please ensure the number is registered on WhatsApp Business.`
      );
    }

    const whatsappUrl = generateWhatsAppUrl(phoneNumber, message);

    // Log for debugging (remove in production)
    console.log('Opening WhatsApp URL:', whatsappUrl);

    if (openInNewTab) {
      const newWindow = window.open(whatsappUrl, '_blank');
      if (!newWindow) {
        // Fallback if popup is blocked
        console.warn('Popup blocked, redirecting to WhatsApp...');
        window.location.href = whatsappUrl;
      }
    } else {
      window.location.href = whatsappUrl;
    }
  } catch (error) {
    console.error('WhatsApp Error:', error);
    // Re-throw the error so it can be handled by the calling code
    throw error;
  }
}

/**
 * Validates if a phone number is valid for WhatsApp
 * @param phoneNumber - Phone number to validate
 * @returns True if valid, false otherwise
 */
export function isValidWhatsAppNumber(phoneNumber: string): boolean {
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // Should be at least 10 digits (without country code) or 12+ digits (with country code)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Business WhatsApp number for RoyalSpicyMasala
 * Gets the number from business configuration
 */
export const BUSINESS_WHATSAPP_NUMBER = getBusinessWhatsAppNumber();

/**
 * Generates a formatted order message for WhatsApp
 * @param orderData - Order details
 * @returns Formatted message string
 */
export function generateOrderMessage(orderData: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  notes?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
}): string {
  const orderDetails = orderData.items.map((item, index) =>
    `${index + 1}. ${item.name} - ${item.quantity} ${item.unit} @ ₹${item.price.toFixed(2)} = ₹${item.total.toFixed(2)}`
  ).join('\n');

  const message = `🛒 *New Order from RoyalSpicyMasala*

👤 *Customer Details:*
Name: ${orderData.customerName}
Phone: ${orderData.customerPhone}
${orderData.customerEmail ? `Email: ${orderData.customerEmail}` : ''}
Address: ${orderData.customerAddress}
${orderData.notes ? `Notes: ${orderData.notes}` : ''}

📦 *Order Details:*
${orderDetails}

💰 *Order Summary:*
Subtotal: ₹${orderData.subtotal.toFixed(2)}
Delivery: ${orderData.deliveryFee === 0 ? 'FREE' : `₹${orderData.deliveryFee.toFixed(2)}`}
*Total: ₹${orderData.total.toFixed(2)}*

📅 Order Date: ${new Date().toLocaleDateString('en-IN')}
🕐 Order Time: ${new Date().toLocaleTimeString('en-IN')}

Please confirm this order and let me know the estimated delivery time. Thank you! 🙏`;

  return message;
}

/**
 * Generates a formatted contact message for WhatsApp
 * @param contactData - Contact form data
 * @returns Formatted message string
 */
export function generateContactMessage(contactData: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): string {
  const message = `📞 *Contact Request from RoyalSpicyMasala Website*

👤 *Contact Details:*
Name: ${contactData.name}
Email: ${contactData.email}
Phone: ${contactData.phone}

📋 *Subject:* ${contactData.subject}

💬 *Message:*
${contactData.message}

📅 Date: ${new Date().toLocaleDateString('en-IN')}
🕐 Time: ${new Date().toLocaleTimeString('en-IN')}

Please respond to this inquiry. Thank you!`;

  return message;
}
