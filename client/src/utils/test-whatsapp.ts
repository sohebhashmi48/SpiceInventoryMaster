/**
 * WhatsApp Integration Test Utility
 * Use this to test WhatsApp integration during development
 */

import { generateWhatsAppUrl, isValidWhatsAppNumber, formatWhatsAppNumber } from '@/lib/whatsapp-utils';
import { BUSINESS_CONFIG } from '@/config/business';

/**
 * Test the WhatsApp number configuration
 */
export function testWhatsAppConfiguration(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  testUrl: string;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const businessNumber = BUSINESS_CONFIG.whatsapp.number;

  // Check for placeholder values
  if (businessNumber.includes('XXXXXXXXXX')) {
    errors.push('WhatsApp number contains placeholder values (XXXXXXXXXX)');
  }

  // Validate number format
  if (!isValidWhatsAppNumber(businessNumber)) {
    errors.push('WhatsApp number format is invalid');
  }

  // Check if number looks like Indian mobile number
  const formattedNumber = formatWhatsAppNumber(businessNumber);
  if (!formattedNumber.startsWith('91') || formattedNumber.length !== 12) {
    warnings.push('Number does not appear to be a valid Indian mobile number');
  }

  // Generate test URL
  const testMessage = 'Test message from RoyalSpicyMasala website';
  const testUrl = generateWhatsAppUrl(businessNumber, testMessage);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    testUrl
  };
}

/**
 * Log WhatsApp configuration status to console
 */
export function logWhatsAppStatus(): void {
  console.log('🔍 WhatsApp Configuration Test');
  console.log('================================');

  const result = testWhatsAppConfiguration();

  console.log('Business Number:', BUSINESS_CONFIG.whatsapp.number);
  console.log('Display Number:', BUSINESS_CONFIG.whatsapp.displayNumber);
  console.log('Test URL:', result.testUrl);
  console.log('');

  if (result.isValid) {
    console.log('✅ Configuration appears valid');
  } else {
    console.log('❌ Configuration has errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  console.log('');
  console.log('📋 Next Steps:');
  if (!result.isValid) {
    console.log('1. Update client/src/config/business.ts with your actual WhatsApp Business number');
    console.log('2. Ensure the number is registered on WhatsApp Business');
    console.log('3. Test the URL manually: ' + result.testUrl);
  } else {
    console.log('1. Test the URL manually: ' + result.testUrl);
    console.log('2. Verify that WhatsApp opens with the correct number');
    console.log('3. Try placing a test order through the showcase');
  }
}

/**
 * Generate a test WhatsApp URL for manual testing
 */
export function generateTestWhatsAppUrl(customMessage?: string): string {
  const message = customMessage || `🧪 Test message from RoyalSpicyMasala

This is a test message to verify WhatsApp integration is working correctly.

Business: ${BUSINESS_CONFIG.name}
Time: ${new Date().toLocaleString('en-IN')}

If you receive this message, the integration is working! 🎉`;

  return generateWhatsAppUrl(BUSINESS_CONFIG.whatsapp.number, message);
}

/**
 * Open a test WhatsApp message (for development testing)
 */
export function openTestWhatsApp(): void {
  const testUrl = generateTestWhatsAppUrl();
  console.log('Opening test WhatsApp URL:', testUrl);
  window.open(testUrl, '_blank');
}

// Auto-run configuration test in development
if (process.env.NODE_ENV === 'development') {
  // Run test after a short delay to ensure console is ready
  setTimeout(() => {
    logWhatsAppStatus();
  }, 1000);
}
