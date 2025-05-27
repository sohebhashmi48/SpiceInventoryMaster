import express from "express";
import { z } from "zod";
import { storage } from "../storage";

const router = express.Router();

// Define payment schema
const paymentSchema = z.object({
  amount: z.string().or(z.number()).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  paymentDate: z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid date format"
    }).transform(val => new Date(val)),
    z.date()
  ]).optional().default(() => new Date()),
  paymentMethod: z.string().default("Cash"),
  notes: z.string().optional(),
  purchaseId: z.number().optional(),
});

// Record a payment for a supplier
router.post("/vendors/:id/payment", async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);
    if (isNaN(supplierId)) {
      return res.status(400).json({ error: "Invalid supplier ID" });
    }

    // Validate payment data
    const paymentData = paymentSchema.parse(req.body);

    // Get the supplier to update their balance
    const supplier = await storage.getSupplier(supplierId);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Calculate new balances
    const currentBalanceDue = parseFloat(supplier.balanceDue?.toString() || "0");
    const currentTotalPaid = parseFloat(supplier.totalPaid?.toString() || "0");
    const paymentAmount = paymentData.amount;

    // Allow payments even when there's no balance due
    // This can happen when making advance payments or when paying for a purchase directly
    console.log(`Processing payment of ${paymentAmount} for supplier ${supplierId} with current balance due: ${currentBalanceDue}`);

    // Update vendor balances
    const newBalanceDue = Math.max(0, currentBalanceDue - paymentAmount);
    const newTotalPaid = currentTotalPaid + paymentAmount;

    // Update the supplier record
    await storage.updateSupplier(supplierId, {
      balanceDue: newBalanceDue.toString(),
      totalPaid: newTotalPaid.toString()
    });

    // Record the payment transaction
    const transaction = await storage.createTransaction({
      supplierId,
      amount: paymentAmount.toString(),
      transactionDate: paymentData.paymentDate,
      type: "payment",
      notes: paymentData.notes || `Payment for supplier ${supplierId}`
      // Remove invoiceId as it's causing foreign key constraint errors
    });

    res.status(200).json({
      success: true,
      transaction,
      supplier: {
        id: supplierId,
        balanceDue: newBalanceDue,
        totalPaid: newTotalPaid
      }
    });
  } catch (error) {
    console.error("Error processing supplier payment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to process payment" });
  }
});

// Get payment history for a supplier
router.get("/vendors/:id/payments", async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);
    if (isNaN(supplierId)) {
      return res.status(400).json({ error: "Invalid supplier ID" });
    }

    const payments = await storage.getTransactionsBySupplier(supplierId, "payment");
    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching supplier payments:", error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

export default router;
