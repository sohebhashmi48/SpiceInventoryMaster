-- Add next_reminder_date column to payment_reminders table
ALTER TABLE payment_reminders
ADD COLUMN next_reminder_date DATETIME DEFAULT NULL,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP; 