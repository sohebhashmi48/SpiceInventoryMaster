import express from 'express';
import { storage } from '../storage';
import { distributionWithItemsSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

// Get all distributions
router.get('/', async (req, res) => {
  try {
    const distributions = await storage.getDistributions();
    res.json(distributions);
  } catch (error) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({ error: 'Failed to fetch distributions' });
  }
});

// Get a single distribution by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid distribution ID' });
    }

    const distribution = await storage.getDistribution(id);
    if (!distribution) {
      return res.status(404).json({ error: 'Distribution not found' });
    }

    // Get the distribution items
    const items = await storage.getDistributionItems(id);
    
    // Combine distribution and items
    const result = {
      ...distribution,
      items
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching distribution:', error);
    res.status(500).json({ error: 'Failed to fetch distribution' });
  }
});

// Get distributions by caterer ID
router.get('/caterer/:id', async (req, res) => {
  try {
    const catererId = parseInt(req.params.id);
    if (isNaN(catererId)) {
      return res.status(400).json({ error: 'Invalid caterer ID' });
    }

    const distributions = await storage.getDistributionsByCaterer(catererId);
    res.json(distributions);
  } catch (error) {
    console.error('Error fetching distributions by caterer:', error);
    res.status(500).json({ error: 'Failed to fetch distributions' });
  }
});

// Create a new distribution
router.post('/', async (req, res) => {
  try {
    const validatedData = distributionWithItemsSchema.parse(req.body);
    const newDistribution = await storage.createDistribution(validatedData);
    res.status(201).json(newDistribution);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating distribution:', error);
    res.status(500).json({ error: 'Failed to create distribution' });
  }
});

// Update a distribution status
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid distribution ID' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const distribution = await storage.getDistribution(id);
    if (!distribution) {
      return res.status(404).json({ error: 'Distribution not found' });
    }

    const updatedDistribution = await storage.updateDistributionStatus(id, status);
    res.json(updatedDistribution);
  } catch (error) {
    console.error('Error updating distribution status:', error);
    res.status(500).json({ error: 'Failed to update distribution status' });
  }
});

// Delete a distribution
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid distribution ID' });
    }

    const distribution = await storage.getDistribution(id);
    if (!distribution) {
      return res.status(404).json({ error: 'Distribution not found' });
    }

    const success = await storage.deleteDistribution(id);
    if (success) {
      res.status(204).end();
    } else {
      res.status(500).json({ error: 'Failed to delete distribution' });
    }
  } catch (error) {
    console.error('Error deleting distribution:', error);
    res.status(500).json({ error: 'Failed to delete distribution' });
  }
});

export default router;
