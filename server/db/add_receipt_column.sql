-- Add receipt_image column to purchases table
ALTER TABLE purchases ADD COLUMN receipt_image VARCHAR(255) NULL AFTER notes;
