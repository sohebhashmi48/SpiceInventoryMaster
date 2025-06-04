import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';

const router = express.Router();

// Get today's customer bills
router.get('/today', async (req, res) => {
  try {
    console.log('Fetching today\'s customer bills...');

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    console.log('Date range:', { startOfDay, endOfDay });

    const conn = await storage.getConnection();
    try {
      // Check if customer_bills table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'customer_bills'`);
      if ((tables as any[]).length === 0) {
        console.log("Customer bills table doesn't exist yet");
        return res.json([]);
      }

      // Get bills for today
      const [billRows] = await conn.execute(`
        SELECT * FROM customer_bills cb
        WHERE DATE(cb.created_at) = DATE(?)
        ORDER BY cb.created_at DESC
      `, [today]);

      const bills = billRows as any[];
      console.log(`Found ${bills.length} bills for today`);

      // Get items for each bill
      const billsWithItems = await Promise.all(
        bills.map(async (bill) => {
          const [itemRows] = await conn.execute(`
            SELECT * FROM customer_bill_items
            WHERE bill_id = ?
            ORDER BY id
          `, [bill.id]);

          // Map database column names to expected property names
          const mappedItems = (itemRows as any[]).map(item => ({
            id: item.id,
            productName: item.product_name,
            quantity: item.quantity,
            unit: item.unit,
            pricePerKg: item.price_per_kg,
            marketPricePerKg: item.market_price_per_kg,
            total: item.total,
          }));

          // Map database column names to expected property names
          return {
            id: bill.id,
            billNo: bill.bill_no,
            billDate: bill.bill_date,
            clientName: bill.client_name,
            clientMobile: bill.client_mobile,
            clientEmail: bill.client_email,
            clientAddress: bill.client_address,
            totalAmount: bill.total_amount,
            marketTotal: bill.market_total,
            savings: bill.savings,
            itemCount: bill.item_count,
            paymentMethod: bill.payment_method,
            status: bill.status,
            createdAt: bill.created_at,
            items: mappedItems,
          };
        })
      );

      return res.json(billsWithItems);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error fetching today\'s customer bills:', error);
    return res.status(500).json({
      message: 'Failed to fetch today\'s customer bills',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get customer transaction history by mobile or name
router.get('/history', async (req, res) => {
  try {
    const querySchema = z.object({
      mobile: z.string().optional(),
      name: z.string().optional(),
    });

    const { mobile, name } = querySchema.parse(req.query);

    if (!mobile && !name) {
      return res.status(400).json({ error: 'Either mobile or name parameter is required' });
    }

    const conn = await storage.getConnection();
    try {
      // Check if customer_bills table exists, create if not
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'customer_bills'`);
      if ((tables as any[]).length === 0) {
        console.log("Customer bills table doesn't exist, creating it...");
        await conn.execute(`
          CREATE TABLE customer_bills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bill_no VARCHAR(255) NOT NULL UNIQUE,
            bill_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            client_name VARCHAR(255) NOT NULL,
            client_mobile VARCHAR(20) NOT NULL,
            client_email VARCHAR(255),
            client_address TEXT,
            total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            market_total DECIMAL(10,2) NOT NULL DEFAULT 0,
            savings DECIMAL(10,2) NOT NULL DEFAULT 0,
            item_count INT NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'completed',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);

        await conn.execute(`
          CREATE TABLE customer_bill_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bill_id INT NOT NULL,
            product_id INT NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            quantity DECIMAL(10,3) NOT NULL,
            unit VARCHAR(10) NOT NULL,
            price_per_kg DECIMAL(10,2) NOT NULL,
            market_price_per_kg DECIMAL(10,2) NOT NULL,
            total DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bill_id) REFERENCES customer_bills(id) ON DELETE CASCADE
          )
        `);

        // Create indexes
        await conn.execute(`CREATE INDEX idx_customer_bills_bill_no ON customer_bills(bill_no)`);
        await conn.execute(`CREATE INDEX idx_customer_bills_client_mobile ON customer_bills(client_mobile)`);
        await conn.execute(`CREATE INDEX idx_customer_bill_items_bill_id ON customer_bill_items(bill_id)`);

        // Return empty result since no data exists yet
        return res.json([]);
      }

      // Build where conditions
      let whereClause = '';
      const params: any[] = [];

      if (mobile && name) {
        whereClause = 'WHERE cb.client_mobile LIKE ? AND cb.client_name LIKE ?';
        params.push(`%${mobile}%`, `%${name}%`);
      } else if (mobile) {
        whereClause = 'WHERE cb.client_mobile LIKE ?';
        params.push(`%${mobile}%`);
      } else if (name) {
        whereClause = 'WHERE cb.client_name LIKE ?';
        params.push(`%${name}%`);
      }

      // Get bills
      const [billRows] = await conn.execute(`
        SELECT * FROM customer_bills cb
        ${whereClause}
        ORDER BY cb.bill_date DESC
      `, params);

      const bills = billRows as any[];

      // Get items for each bill
      const billsWithItems = await Promise.all(
        bills.map(async (bill) => {
          const [itemRows] = await conn.execute(`
            SELECT * FROM customer_bill_items
            WHERE bill_id = ?
            ORDER BY id
          `, [bill.id]);

          // Map database column names to expected property names
          const mappedItems = (itemRows as any[]).map(item => ({
            id: item.id,
            productName: item.product_name,
            quantity: item.quantity,
            unit: item.unit,
            pricePerKg: item.price_per_kg,
            marketPricePerKg: item.market_price_per_kg,
            total: item.total,
          }));

          // Map database column names to expected property names
          return {
            id: bill.id,
            billNo: bill.bill_no,
            billDate: bill.bill_date,
            clientName: bill.client_name,
            clientMobile: bill.client_mobile,
            clientEmail: bill.client_email,
            clientAddress: bill.client_address,
            totalAmount: bill.total_amount,
            marketTotal: bill.market_total,
            savings: bill.savings,
            itemCount: bill.item_count,
            paymentMethod: bill.payment_method,
            status: bill.status,
            createdAt: bill.created_at,
            items: mappedItems,
          };
        })
      );

      return res.json(billsWithItems);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error fetching customer transaction history:', error);
    return res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

export default router;
