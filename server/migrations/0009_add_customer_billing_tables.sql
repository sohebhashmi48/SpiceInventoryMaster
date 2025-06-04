-- Migration: Add customer billing tables
-- Created: 2024-01-XX
-- Database: MySQL

-- Create customer_bills table
CREATE TABLE IF NOT EXISTS customer_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(255) NOT NULL UNIQUE,
    bill_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_name VARCHAR(255) NOT NULL,
    client_mobile VARCHAR(20) NOT NULL,
    client_email VARCHAR(255),
    client_address TEXT,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    market_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    item_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create customer_bill_items table
CREATE TABLE IF NOT EXISTS customer_bill_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    market_price_per_kg DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES customer_bills(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_customer_bills_bill_no ON customer_bills(bill_no);
CREATE INDEX idx_customer_bills_client_mobile ON customer_bills(client_mobile);
CREATE INDEX idx_customer_bills_bill_date ON customer_bills(bill_date);
CREATE INDEX idx_customer_bills_status ON customer_bills(status);
CREATE INDEX idx_customer_bill_items_bill_id ON customer_bill_items(bill_id);
CREATE INDEX idx_customer_bill_items_product_id ON customer_bill_items(product_id);
