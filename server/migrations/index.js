import addProductPriceColumns from './add-product-price-columns.js';

/**
 * List of all migrations to run in order
 */
const migrations = [
  addProductPriceColumns
];

/**
 * Run all migrations in sequence
 */
export async function runMigrations() {
  console.log('Starting database migrations...');
  
  for (const migration of migrations) {
    try {
      await migration.migrate();
    } catch (error) {
      console.error(`Migration failed: ${error.message}`);
      throw error;
    }
  }
  
  console.log('All migrations completed successfully');
}

export default { runMigrations };
