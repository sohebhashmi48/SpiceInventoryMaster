-- Create payment_reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
    id VARCHAR(36) PRIMARY KEY,
    caterer_id INT NOT NULL,
    distribution_id INT,
    amount DECIMAL(10,2) NOT NULL,
    original_due_date DATE NOT NULL,
    reminder_date DATE NOT NULL,
    next_reminder_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    is_read BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (caterer_id) REFERENCES caterers(id) ON DELETE CASCADE,
    FOREIGN KEY (distribution_id) REFERENCES distributions(id) ON DELETE SET NULL
);

-- Add indexes for better query performance
CREATE INDEX idx_payment_reminders_caterer ON payment_reminders(caterer_id);
CREATE INDEX idx_payment_reminders_distribution ON payment_reminders(distribution_id);
CREATE INDEX idx_payment_reminders_status ON payment_reminders(status);
CREATE INDEX idx_payment_reminders_reminder_date ON payment_reminders(reminder_date); 