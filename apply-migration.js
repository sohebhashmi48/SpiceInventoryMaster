// Script to apply the migration to add the unit column to purchase_items table
import mysql from 'mysql2/promise';
import fs from 'fs';

async function applyMigration() {
  // Create a connection to the database
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Sudo',
    database: 'spice_inventory'
  });

  try {
    console.log('Connected to the database');
    
    // Read the migration SQL
    const sql = fs.readFileSync('./migrations/add_unit_to_purchase_items.sql', 'utf8');
    
    // Execute the migration
    console.log('Executing migration:');
    console.log(sql);
    
    await connection.query(sql);
    
    console.log('Migration applied successfully');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

applyMigration();
