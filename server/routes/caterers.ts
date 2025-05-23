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

    const success = await storage.deleteCaterer(id);
    if (success) {
      res.status(204).end();
    } else {
      // Check if the caterer has any related distributions or payments
      const hasRelatedRecords = await storage.catererHasRelatedRecords(id);

      if (hasRelatedRecords) {
        res.status(400).json({
          error: 'Cannot delete caterer with related distributions or payments. Please delete those records first.'
        });
      } else {
        res.status(500).json({ error: 'Failed to delete caterer' });
      }
    }
  } catch (error) {
    console.error('Error deleting caterer:', error);
    res.status(500).json({ error: 'Failed to delete caterer' });
  }
});

export default router;
