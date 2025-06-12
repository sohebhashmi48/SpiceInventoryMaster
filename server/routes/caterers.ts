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

    // Calculate real-time balance from distributions and payments
    const distributions = await storage.getDistributionsByCaterer(id);
    const payments = await storage.getCatererPaymentsByCaterer(id);

    console.log(`Balance calculation for caterer ${id}:`);
    console.log(`Distributions:`, distributions.map(d => ({ id: d.id, billNo: d.billNo, grandTotal: d.grandTotal, balanceDue: d.balanceDue, status: d.status })));
    console.log(`Payments:`, payments.map(p => ({ id: p.id, amount: p.amount, distributionId: p.distributionId })));

    const totalBilled = distributions.reduce((sum, dist) => {
      const amount = parseFloat(dist.grandTotal || '0');
      console.log(`Distribution ${dist.id}: grandTotal="${dist.grandTotal}" -> parsed=${amount}`);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Use distribution-based balance calculation for accuracy
    const balanceDue = distributions.reduce((sum, dist) => {
      const balance = parseFloat(dist.balanceDue || '0');
      console.log(`Distribution ${dist.id}: balanceDue="${dist.balanceDue}" -> parsed=${balance}`);
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);

    const totalPaid = payments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount || '0');
      console.log(`Payment ${payment.id}: amount="${payment.amount}" -> parsed=${amount}`);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    const totalOrders = distributions.length;

    console.log(`Calculated values: totalBilled=${totalBilled}, totalPaid=${totalPaid}, balanceDue=${balanceDue}`);

    // Get the latest balance data with real-time calculations
    const balanceData = {
      balanceDue: balanceDue,
      totalBilled: totalBilled,
      totalOrders: totalOrders,
      totalPaid: totalPaid,
      lastPaymentDate: payments.length > 0 ? payments[0].paymentDate : undefined
    };

    res.json(balanceData);
  } catch (error) {
    console.error('Error fetching caterer balance:', error);
    res.status(500).json({ error: 'Failed to fetch caterer balance' });
  }
});

// Sync caterer balance (fix discrepancies)
router.post('/:id/sync-balance', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid caterer ID' });
    }

    const caterer = await storage.getCaterer(id);
    if (!caterer) {
      return res.status(404).json({ error: 'Caterer not found' });
    }

    // Calculate real-time balance from distributions and payments
    const distributions = await storage.getDistributionsByCaterer(id);
    const payments = await storage.getCatererPaymentsByCaterer(id);

    const totalBilled = distributions.reduce((sum, dist) => {
      const amount = parseFloat(dist.grandTotal || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Use distribution-based balance calculation for accuracy
    const balanceDue = distributions.reduce((sum, dist) => {
      const balance = parseFloat(dist.balanceDue || '0');
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);

    const totalPaid = payments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    const totalOrders = distributions.length;

    // Update the caterer record with correct values
    const updatedCaterer = await storage.updateCaterer(id, {
      totalBilled: totalBilled.toString(),
      totalPaid: totalPaid.toString(),
      balanceDue: balanceDue.toString(),
      totalOrders: totalOrders
    });

    console.log(`Synced balance for caterer ${id}: totalBilled=${totalBilled}, totalPaid=${totalPaid}, balanceDue=${balanceDue}`);

    res.json({
      success: true,
      message: 'Balance synced successfully',
      oldBalance: {
        totalBilled: caterer.totalBilled,
        totalPaid: caterer.totalPaid,
        balanceDue: caterer.balanceDue,
        totalOrders: caterer.totalOrders
      },
      newBalance: {
        totalBilled: totalBilled,
        totalPaid: totalPaid,
        balanceDue: balanceDue,
        totalOrders: totalOrders
      },
      caterer: updatedCaterer
    });
  } catch (error) {
    console.error('Error syncing caterer balance:', error);
    res.status(500).json({ error: 'Failed to sync caterer balance' });
  }
});

// Sync all caterer balances (fix discrepancies for all caterers)
router.post('/sync-all-balances', async (req, res) => {
  try {
    const caterers = await storage.getCaterers();
    const results = [];

    for (const caterer of caterers) {
      try {
        // Calculate real-time balance from distributions and payments
        const distributions = await storage.getDistributionsByCaterer(caterer.id);
        const payments = await storage.getCatererPaymentsByCaterer(caterer.id);

        const totalBilled = distributions.reduce((sum, dist) => {
          const amount = parseFloat(dist.grandTotal || '0');
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        // Use distribution-based balance calculation for accuracy
        const balanceDue = distributions.reduce((sum, dist) => {
          const balance = parseFloat(dist.balanceDue || '0');
          return sum + (isNaN(balance) ? 0 : balance);
        }, 0);

        const totalPaid = payments.reduce((sum, payment) => {
          const amount = parseFloat(payment.amount || '0');
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        const totalOrders = distributions.length;

        // Check if sync is needed
        const oldTotalBilled = parseFloat(caterer.totalBilled?.toString() || '0');
        const oldTotalPaid = parseFloat(caterer.totalPaid?.toString() || '0');
        const oldBalanceDue = parseFloat(caterer.balanceDue?.toString() || '0');
        const oldTotalOrders = caterer.totalOrders || 0;

        const needsSync =
          Math.abs(oldTotalBilled - totalBilled) > 0.01 ||
          Math.abs(oldTotalPaid - totalPaid) > 0.01 ||
          Math.abs(oldBalanceDue - balanceDue) > 0.01 ||
          oldTotalOrders !== totalOrders;

        if (needsSync) {
          // Update the caterer record with correct values
          await storage.updateCaterer(caterer.id, {
            totalBilled: totalBilled.toString(),
            totalPaid: totalPaid.toString(),
            balanceDue: balanceDue.toString(),
            totalOrders: totalOrders
          });

          results.push({
            catererId: caterer.id,
            catererName: caterer.name,
            synced: true,
            changes: {
              totalBilled: { old: oldTotalBilled, new: totalBilled },
              totalPaid: { old: oldTotalPaid, new: totalPaid },
              balanceDue: { old: oldBalanceDue, new: balanceDue },
              totalOrders: { old: oldTotalOrders, new: totalOrders }
            }
          });
        } else {
          results.push({
            catererId: caterer.id,
            catererName: caterer.name,
            synced: false,
            message: 'No sync needed'
          });
        }
      } catch (error) {
        results.push({
          catererId: caterer.id,
          catererName: caterer.name,
          synced: false,
          error: error.message
        });
      }
    }

    const syncedCount = results.filter(r => r.synced).length;
    const totalCount = results.length;

    res.json({
      success: true,
      message: `Synced ${syncedCount} out of ${totalCount} caterers`,
      results: results
    });
  } catch (error) {
    console.error('Error syncing all caterer balances:', error);
    res.status(500).json({ error: 'Failed to sync all caterer balances' });
  }
});

export default router;
