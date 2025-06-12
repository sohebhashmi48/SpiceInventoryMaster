// Simple script to test the balance fix migration
async function runMigration() {
  try {
    console.log('🔧 Running distribution balance fix migration...');
    
    const response = await fetch('http://localhost:5000/api/admin/fix-distribution-balances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Migration completed successfully!');
    console.log('Results:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
runMigration();
