-- Fix Distribution Balance Calculation Issues
-- This migration recalculates all distribution balances from actual payments

-- Step 1: Add computed columns for better balance tracking
ALTER TABLE distributions 
ADD COLUMN IF NOT EXISTS calculated_amount_paid DECIMAL(10,2) GENERATED ALWAYS AS (
  COALESCE((
    SELECT SUM(amount) 
    FROM caterer_payments 
    WHERE distribution_id = distributions.id
  ), 0)
) STORED;

ALTER TABLE distributions 
ADD COLUMN IF NOT EXISTS calculated_balance_due DECIMAL(10,2) GENERATED ALWAYS AS (
  GREATEST(0, COALESCE(grand_total, 0) - COALESCE((
    SELECT SUM(amount) 
    FROM caterer_payments 
    WHERE distribution_id = distributions.id
  ), 0))
) STORED;

-- Step 2: Create a procedure to fix all distribution balances
DELIMITER //
CREATE OR REPLACE PROCEDURE FixDistributionBalances()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE dist_id INT;
    DECLARE grand_total_val DECIMAL(10,2);
    DECLARE calculated_paid DECIMAL(10,2);
    DECLARE calculated_balance DECIMAL(10,2);
    DECLARE new_status VARCHAR(20);
    
    -- Cursor to iterate through all distributions
    DECLARE dist_cursor CURSOR FOR 
        SELECT id, COALESCE(grand_total, 0) as gt
        FROM distributions;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN dist_cursor;
    
    read_loop: LOOP
        FETCH dist_cursor INTO dist_id, grand_total_val;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
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
        
    END LOOP;
    
    CLOSE dist_cursor;
END//
DELIMITER ;

-- Step 3: Create a trigger to automatically update balances when payments are made
DELIMITER //
CREATE OR REPLACE TRIGGER update_distribution_balance_after_payment_insert
AFTER INSERT ON caterer_payments
FOR EACH ROW
BEGIN
    IF NEW.distribution_id IS NOT NULL THEN
        CALL UpdateDistributionBalance(NEW.distribution_id);
    END IF;
END//

CREATE OR REPLACE TRIGGER update_distribution_balance_after_payment_update
AFTER UPDATE ON caterer_payments
FOR EACH ROW
BEGIN
    IF NEW.distribution_id IS NOT NULL THEN
        CALL UpdateDistributionBalance(NEW.distribution_id);
    END IF;
    IF OLD.distribution_id IS NOT NULL AND OLD.distribution_id != NEW.distribution_id THEN
        CALL UpdateDistributionBalance(OLD.distribution_id);
    END IF;
END//

CREATE OR REPLACE TRIGGER update_distribution_balance_after_payment_delete
AFTER DELETE ON caterer_payments
FOR EACH ROW
BEGIN
    IF OLD.distribution_id IS NOT NULL THEN
        CALL UpdateDistributionBalance(OLD.distribution_id);
    END IF;
END//
DELIMITER ;

-- Step 4: Create the UpdateDistributionBalance procedure used by triggers
DELIMITER //
CREATE OR REPLACE PROCEDURE UpdateDistributionBalance(IN dist_id INT)
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
END//
DELIMITER ;

-- Step 5: Run the fix procedure to correct all existing data
CALL FixDistributionBalances();

-- Step 6: Create a view for easy balance verification
CREATE OR REPLACE VIEW distribution_balance_check AS
SELECT 
    d.id,
    d.bill_no,
    d.grand_total,
    d.amount_paid as current_amount_paid,
    d.balance_due as current_balance_due,
    d.status as current_status,
    COALESCE(p.total_payments, 0) as calculated_amount_paid,
    GREATEST(0, d.grand_total - COALESCE(p.total_payments, 0)) as calculated_balance_due,
    CASE 
        WHEN GREATEST(0, d.grand_total - COALESCE(p.total_payments, 0)) <= 0 THEN 'paid'
        WHEN COALESCE(p.total_payments, 0) > 0 THEN 'partial'
        ELSE 'active'
    END as calculated_status,
    ABS(d.amount_paid - COALESCE(p.total_payments, 0)) as amount_paid_diff,
    ABS(d.balance_due - GREATEST(0, d.grand_total - COALESCE(p.total_payments, 0))) as balance_due_diff,
    CASE 
        WHEN ABS(d.amount_paid - COALESCE(p.total_payments, 0)) > 0.01 
             OR ABS(d.balance_due - GREATEST(0, d.grand_total - COALESCE(p.total_payments, 0))) > 0.01
             OR d.status != CASE 
                 WHEN GREATEST(0, d.grand_total - COALESCE(p.total_payments, 0)) <= 0 THEN 'paid'
                 WHEN COALESCE(p.total_payments, 0) > 0 THEN 'partial'
                 ELSE 'active'
             END
        THEN 'INCORRECT'
        ELSE 'CORRECT'
    END as balance_status
FROM distributions d
LEFT JOIN (
    SELECT 
        distribution_id,
        SUM(amount) as total_payments,
        COUNT(*) as payment_count
    FROM caterer_payments 
    WHERE distribution_id IS NOT NULL
    GROUP BY distribution_id
) p ON d.id = p.distribution_id;
