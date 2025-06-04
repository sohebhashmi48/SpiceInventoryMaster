-- Add image_path column to categories table
ALTER TABLE categories ADD COLUMN image_path VARCHAR(255) DEFAULT NULL;
