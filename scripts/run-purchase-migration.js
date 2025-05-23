// Script to run the purchase tables migration
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('Running purchase tables migration...');

  // Create a connection to the database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'spice_inventory',
    multipleStatements: true // Important for running multiple SQL statements
  });

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_purchase_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    console.log('Executing SQL migration...');
    await connection.query(migrationSQL);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await connection.end();
  }
}

// Run the migration
runMigration();
