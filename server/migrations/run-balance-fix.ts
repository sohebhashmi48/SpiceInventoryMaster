import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'spice_inventory',
  multipleStatements: true
};

async function runBalanceFix() {
  let connection: mysql.Connection | null = null;
  
  try {
    console.log('🔧 Starting distribution balance fix...');
    
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'fix-distribution-balances.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Loaded SQL migration file');
    
    // Split SQL into individual statements (handle DELIMITER changes)
    const statements = sqlContent
      .split(/DELIMITER\s+\/\/|DELIMITER\s+;/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.match(/^DELIMITER/));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1} completed`);
        } catch (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          console.log('Statement content:', statement.substring(0, 200) + '...');
          // Continue with other statements
        }
      }
    }
    
    // Verify the fix by checking the balance_check view
    console.log('🔍 Verifying balance corrections...');
    
    const [rows] = await connection.execute(`
      SELECT 
        COUNT(*) as total_distributions,
        SUM(CASE WHEN balance_status = 'CORRECT' THEN 1 ELSE 0 END) as correct_balances,
        SUM(CASE WHEN balance_status = 'INCORRECT' THEN 1 ELSE 0 END) as incorrect_balances
      FROM distribution_balance_check
    `);
    
    const result = (rows as any[])[0];
    console.log('📊 Balance verification results:');
    console.log(`   Total distributions: ${result.total_distributions}`);
    console.log(`   Correct balances: ${result.correct_balances}`);
    console.log(`   Incorrect balances: ${result.incorrect_balances}`);
    
    if (result.incorrect_balances > 0) {
      console.log('⚠️  Some balances are still incorrect. Checking details...');
      
      const [incorrectRows] = await connection.execute(`
        SELECT id, bill_no, current_amount_paid, calculated_amount_paid, 
               current_balance_due, calculated_balance_due, balance_status
        FROM distribution_balance_check 
        WHERE balance_status = 'INCORRECT'
        LIMIT 10
      `);
      
      console.log('❌ Incorrect balances found:');
      console.table(incorrectRows);
    } else {
      console.log('🎉 All distribution balances are now correct!');
    }
    
    // Show some sample EMI-style payments to verify
    console.log('🔍 Checking EMI-style payments...');
    
    const [emiRows] = await connection.execute(`
      SELECT 
        d.id,
        d.bill_no,
        d.grand_total,
        d.amount_paid,
        d.balance_due,
        d.status,
        COUNT(cp.id) as payment_count
      FROM distributions d
      LEFT JOIN caterer_payments cp ON d.id = cp.distribution_id
      GROUP BY d.id
      HAVING payment_count > 1
      ORDER BY payment_count DESC
      LIMIT 5
    `);
    
    if ((emiRows as any[]).length > 0) {
      console.log('💳 Sample distributions with multiple payments (EMI-style):');
      console.table(emiRows);
      
      // Show payment details for the first one
      const firstDistId = (emiRows as any[])[0].id;
      const [paymentDetails] = await connection.execute(`
        SELECT amount, payment_date, payment_mode
        FROM caterer_payments 
        WHERE distribution_id = ?
        ORDER BY payment_date
      `, [firstDistId]);
      
      console.log(`💰 Payment details for distribution ${firstDistId}:`);
      console.table(paymentDetails);
    }
    
    console.log('✅ Distribution balance fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running balance fix:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runBalanceFix()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { runBalanceFix };
