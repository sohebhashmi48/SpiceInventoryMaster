import express from 'express';
import { storage } from '../storage';
import { insertCatererSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

// Get all caterers
router.get('/', async (req, res) => {
  try {
    const caterers = await storage.getCaterers();
    res.json(caterers);
  } catch (error) {
    console.error('Error fetching caterers:', error);
    res.status(500).json({ error: 'Failed to fetch caterers' });
  }
});

// Get a single caterer by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid caterer ID' });
    }

    const caterer = await storage.getCaterer(id);
    if (!caterer) {
      return res.status(404).json({ error: 'Caterer not found' });
    }

    res.json(caterer);
  } catch (error) {
    console.error('Error fetching caterer:', error);
    res.status(500).json({ error: 'Failed to fetch caterer' });
  }
});

// Create a new caterer
router.post('/', async (req, res) => {
  try {
    const validatedData = insertCatererSchema.parse(req.body);
    const newCaterer = await storage.createCaterer(validatedData);
    res.status(201).json(newCaterer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating caterer:', error);
    res.status(500).json({ error: 'Failed to create caterer' });
  }
});

// Update a caterer
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid caterer ID' });
    }

    const caterer = await storage.getCaterer(id);
    if (!caterer) {
      return res.status(404).json({ error: 'Caterer not found' });
    }

    const updatedCaterer = await storage.updateCaterer(id, req.body);
    res.json(updatedCaterer);
  } catch (error) {
    console.error('Error updating caterer:', error);
    res.status(500).json({ error: 'Failed to update caterer' });
  }
});

// Delete a caterer
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid caterer ID' });
    }

    const caterer = await storage.getCaterer(id);
    if (!caterer) {
      return res.status(404).json({ error: 'Caterer not found' });
    }

    // Check for deletion options
    const forceDelete = req.query.force === 'true';
    const cascadeDelete = req.query.cascade === 'true';

    if (forceDelete) {
      console.log(`Force delete requested for caterer ID: ${id}`);
    }

    if (cascadeDelete) {
      console.log(`Cascade delete requested for caterer ID: ${id}`);
    }

    // If no special options, check if the caterer has related records
    if (!forceDelete && !cascadeDelete) {
      const relatedRecords = await storage.getCatererRelatedRecordsCounts(id);
      if (relatedRecords.totalCount > 0) {
        console.log(`Caterer ${id} has related records:`, relatedRecords);
        return res.status(400).json({
          error: `Cannot delete caterer with related records: ${relatedRecords.totalCount} related records found`,
          relatedRecords: {
            bills: relatedRecords.distributionsCount,
            payments: relatedRecords.paymentsCount,
            total: relatedRecords.totalCount
          }
        });
      }
    }

    // Delete the caterer with appropriate options
    const success = await storage.deleteCaterer(id, {
      force: forceDelete,
      cascade: cascadeDelete
    });

    if (success) {
      res.status(204).end();
    } else {
      res.status(500).json({ error: 'Failed to delete caterer' });
    }
  } catch (error) {
    console.error('Error deleting caterer:', error);
    res.status(500).json({ error: 'Failed to delete caterer' });
  }
});

// Get caterer balance
router.get('/:id/balance', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid caterer ID' });
    }

    const caterer = await storage.getCaterer(id);
    if (!caterer) {
      return res.status(404).json({ error: 'Caterer not found' });
    }

    // Get the latest balance data
    const balanceData = {
      balanceDue: caterer.balanceDue || 0,
      totalBilled: caterer.totalBilled || 0,
      totalOrders: caterer.totalOrders || 0,
      totalPaid: caterer.totalPaid || 0,
      lastPaymentDate: undefined // We can add this later if needed
    };

    res.json(balanceData);
  } catch (error) {
    console.error('Error fetching caterer balance:', error);
    res.status(500).json({ error: 'Failed to fetch caterer balance' });
  }
});

export default router;
