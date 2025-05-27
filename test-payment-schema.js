// Test script to validate payment schema
import { insertCatererPaymentSchema } from './shared/schema.js';

// Test data that should match what the client sends
const testPaymentData = {
  catererId: 5,
  distributionId: 9,
  amount: "2294.25",
  paymentDate: "2025-05-22T18:30:00.000Z",
  paymentMode: "cash",
  referenceNo: undefined,
  notes: undefined,
  receiptImage: undefined
};

console.log("Testing payment data:", JSON.stringify(testPaymentData, null, 2));

try {
  const validatedData = insertCatererPaymentSchema.parse(testPaymentData);
  console.log("✅ Validation successful!");
  console.log("Validated data:", JSON.stringify(validatedData, null, 2));
} catch (error) {
  console.log("❌ Validation failed!");
  console.log("Error:", JSON.stringify(error.errors, null, 2));
}
