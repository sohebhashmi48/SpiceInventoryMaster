import express from 'express';
import { storage } from '../storage';
import { insertCatererPaymentSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

// Get all caterer payments
router.get('/', async (req, res) => {
  try {
    const payments = await storage.getCatererPayments();
    res.json(payments);
  } catch (error) {
    console.error('Error fetching caterer payments:', error);
    res.status(500).json({ error: 'Failed to fetch caterer payments' });
  }
});

// Get a single caterer payment by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    const payment = await storage.getCatererPayment(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching caterer payment:', error);
    res.status(500).json({ error: 'Failed to fetch caterer payment' });
  }
});

// Get payments by caterer ID
router.get('/caterer/:id', async (req, res) => {
  try {
    const catererId = parseInt(req.params.id);
    if (isNaN(catererId)) {
      return res.status(400).json({ error: 'Invalid caterer ID' });
    }

    const payments = await storage.getCatererPaymentsByCaterer(catererId);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments by caterer:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get payments by distribution ID
router.get('/distribution/:id', async (req, res) => {
  try {
    const distributionId = parseInt(req.params.id);
    if (isNaN(distributionId)) {
      return res.status(400).json({ error: 'Invalid distribution ID' });
    }

    const payments = await storage.getCatererPaymentsByDistribution(distributionId);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments by distribution:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Create a new caterer payment
router.post('/', async (req, res) => {
  try {
    const validatedData = insertCatererPaymentSchema.parse(req.body);
    const newPayment = await storage.createCatererPayment(validatedData);
    res.status(201).json(newPayment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating caterer payment:', error);
    res.status(500).json({ error: 'Failed to create caterer payment' });
  }
});

export default router;
