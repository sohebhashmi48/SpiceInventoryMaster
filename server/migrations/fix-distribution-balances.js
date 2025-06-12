import { pool } from '../storage.js';

const migration = {
  name: 'fix-distribution-balances',

  async migrate() {
    console.log('Running migration: fix-distribution-balances');

    let connection = null;

    try {
      // Get connection from existing pool
      connection = await pool.getConnection();
      
      // Step 1: Create UpdateDistributionBalance procedure
      console.log('Creating UpdateDistributionBalance procedure...');
      
      await connection.execute(`DROP PROCEDURE IF EXISTS UpdateDistributionBalance`);
      
      await connection.execute(`
        CREATE PROCEDURE UpdateDistributionBalance(IN dist_id INT)
        BEGIN
            DECLARE grand_total_val DECIMAL(10,2);
            DECLARE calculated_paid DECIMAL(10,2);
            DECLARE calculated_balance DECIMAL(10,2);
            DECLARE new_status VARCHAR(20);
            
            -- Get the grand total for this distribution
            SELECT COALESCE(grand_total, 0) INTO grand_total_val
            FROM distributions 
            WHERE id = dist_id;
            
            -- Calculate total payments for this distribution
            SELECT COALESCE(SUM(amount), 0) INTO calculated_paid
            FROM caterer_payments 
            WHERE distribution_id = dist_id;
            
            -- Calculate balance due
            SET calculated_balance = GREATEST(0, grand_total_val - calculated_paid);
            
            -- Determine status
            IF calculated_balance <= 0 THEN
                SET new_status = 'paid';
            ELSEIF calculated_paid > 0 THEN
                SET new_status = 'partial';
            ELSE
                SET new_status = 'active';
            END IF;
            
            -- Update the distribution
            UPDATE distributions 
            SET 
                amount_paid = calculated_paid,
                balance_due = calculated_balance,
                status = new_status
            WHERE id = dist_id;
        END
      `);
      
      console.log('✅ Created UpdateDistributionBalance procedure');
      
      // Step 2: Fix all existing distribution balances
      console.log('Fixing all existing distribution balances...');
      
      const [distributions] = await connection.execute(`SELECT id FROM distributions`);
      const distIds = distributions.map(d => d.id);
      
      console.log(`🔄 Fixing balances for ${distIds.length} distributions...`);
      
      for (const distId of distIds) {
        await connection.execute(`CALL UpdateDistributionBalance(?)`, [distId]);
      }
      
      console.log('✅ Fixed all distribution balances');
      
      // Step 3: Create triggers for automatic balance updates
      console.log('Creating automatic balance update triggers...');
      
      // Drop existing triggers if they exist
      await connection.execute(`DROP TRIGGER IF EXISTS update_distribution_balance_after_payment_insert`);
      await connection.execute(`DROP TRIGGER IF EXISTS update_distribution_balance_after_payment_update`);
      await connection.execute(`DROP TRIGGER IF EXISTS update_distribution_balance_after_payment_delete`);
      
      // Create INSERT trigger
      await connection.execute(`
        CREATE TRIGGER update_distribution_balance_after_payment_insert
        AFTER INSERT ON caterer_payments
        FOR EACH ROW
        BEGIN
            IF NEW.distribution_id IS NOT NULL THEN
                CALL UpdateDistributionBalance(NEW.distribution_id);
            END IF;
        END
      `);
      
      // Create UPDATE trigger
      await connection.execute(`
        CREATE TRIGGER update_distribution_balance_after_payment_update
        AFTER UPDATE ON caterer_payments
        FOR EACH ROW
        BEGIN
            IF NEW.distribution_id IS NOT NULL THEN
                CALL UpdateDistributionBalance(NEW.distribution_id);
            END IF;
            IF OLD.distribution_id IS NOT NULL AND OLD.distribution_id != NEW.distribution_id THEN
                CALL UpdateDistributionBalance(OLD.distribution_id);
            END IF;
        END
      `);
      
      // Create DELETE trigger
      await connection.execute(`
        CREATE TRIGGER update_distribution_balance_after_payment_delete
        AFTER DELETE ON caterer_payments
        FOR EACH ROW
        BEGIN
            IF OLD.distribution_id IS NOT NULL THEN
                CALL UpdateDistributionBalance(OLD.distribution_id);
            END IF;
        END
      `);
      
      console.log('✅ Created automatic balance update triggers');
      
      // Step 4: Verify the fix
      console.log('Verifying balance corrections...');
      
      const [verification] = await connection.execute(`
        SELECT 
          COUNT(*) as total_distributions,
          SUM(CASE WHEN ABS(balance_due - GREATEST(0, grand_total - amount_paid)) < 0.01 THEN 1 ELSE 0 END) as correct_balances
        FROM distributions
      `);
      
      const result = verification[0];
      console.log(`📊 Verification: ${result.correct_balances}/${result.total_distributions} distributions have correct balances`);
      
      // Show some examples of EMI-style payments
      const [emiExamples] = await connection.execute(`
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
        LIMIT 3
      `);
      
      if (emiExamples.length > 0) {
        console.log('💳 Sample distributions with multiple payments (EMI-style):');
        emiExamples.forEach(dist => {
          console.log(`   Bill ${dist.bill_no}: ₹${dist.grand_total} total, ₹${dist.amount_paid} paid, ₹${dist.balance_due} due (${dist.payment_count} payments)`);
        });
      }
      
      console.log('🎉 Distribution balance fix migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Error in fix-distribution-balances migration:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
};

export default migration;
