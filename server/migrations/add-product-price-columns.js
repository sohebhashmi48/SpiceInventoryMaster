import { storage } from '../storage.js';

/**
 * Migration to add retail_price and caterer_price columns to the products table
 */
export async function migrate() {
  console.log('Running migration: add-product-price-columns');
  
  const conn = await storage.getConnection();
  try {
    // Check if the columns already exist
    const [columns] = await conn.execute(`
      SHOW COLUMNS FROM products 
      WHERE Field IN ('retail_price', 'caterer_price')
    `);
    
    if (columns.length === 2) {
      console.log('Columns retail_price and caterer_price already exist in products table');
      return;
    }
    
    // Add retail_price column if it doesn't exist
    if (!columns.some(col => col.Field === 'retail_price')) {
      console.log('Adding retail_price column to products table');
      await conn.execute(`
        ALTER TABLE products 
        ADD COLUMN retail_price DECIMAL(10,2) DEFAULT 0 
        AFTER market_price
      `);
      console.log('retail_price column added successfully');
    }
    
    // Add caterer_price column if it doesn't exist
    if (!columns.some(col => col.Field === 'caterer_price')) {
      console.log('Adding caterer_price column to products table');
      await conn.execute(`
        ALTER TABLE products
        ADD COLUMN caterer_price DECIMAL(10,2) DEFAULT 0
        AFTER retail_price
      `);
      console.log('caterer_price column added successfully');
    }

    // Check if pending_amount column exists in caterers table
    const [catererColumns] = await conn.execute(`
      SHOW COLUMNS FROM caterers
      WHERE Field = 'pending_amount'
    `);

    if (catererColumns.length === 0) {
      console.log('Adding pending_amount column to caterers table');
      await conn.execute(`
        ALTER TABLE caterers
        ADD COLUMN pending_amount DECIMAL(10,2) DEFAULT 0
        AFTER balance_due
      `);
      console.log('pending_amount column added successfully');

      // Initialize pending_amount for existing caterers based on their current balance_due
      await conn.execute(`
        UPDATE caterers
        SET pending_amount = COALESCE(balance_due, 0)
        WHERE pending_amount = 0
      `);
      console.log('Initialized pending_amount for existing caterers');
    } else {
      console.log('Column pending_amount already exists in caterers table');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    conn.release();
  }
}

export default { migrate };
