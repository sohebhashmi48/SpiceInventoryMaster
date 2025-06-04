-- Migration: Add customer billing tables
-- Created: 2024-01-XX

-- Create customer_bills table
CREATE TABLE IF NOT EXISTS customer_bills (
    id SERIAL PRIMARY KEY,
    bill_no TEXT NOT NULL UNIQUE,
    bill_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_name TEXT NOT NULL,
    client_mobile TEXT NOT NULL,
    client_email TEXT,
    client_address TEXT,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    market_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    item_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create customer_bill_items table
CREATE TABLE IF NOT EXISTS customer_bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit TEXT NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    market_price_per_kg DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES customer_bills(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_bills_bill_no ON customer_bills(bill_no);
CREATE INDEX IF NOT EXISTS idx_customer_bills_client_mobile ON customer_bills(client_mobile);
CREATE INDEX IF NOT EXISTS idx_customer_bills_bill_date ON customer_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_customer_bills_status ON customer_bills(status);
CREATE INDEX IF NOT EXISTS idx_customer_bill_items_bill_id ON customer_bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_customer_bill_items_product_id ON customer_bill_items(product_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_bills_updated_at
    BEFORE UPDATE ON customer_bills
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_bills_updated_at();

-- Add comments for documentation
COMMENT ON TABLE customer_bills IS 'Stores customer billing information for direct sales';
COMMENT ON TABLE customer_bill_items IS 'Stores individual items for each customer bill';

COMMENT ON COLUMN customer_bills.bill_no IS 'Unique bill number for the customer bill';
COMMENT ON COLUMN customer_bills.client_name IS 'Name of the customer';
COMMENT ON COLUMN customer_bills.client_mobile IS 'Mobile number of the customer';
COMMENT ON COLUMN customer_bills.total_amount IS 'Total amount of the bill';
COMMENT ON COLUMN customer_bills.market_total IS 'Total market price (for savings calculation)';
COMMENT ON COLUMN customer_bills.savings IS 'Amount saved by the customer';
COMMENT ON COLUMN customer_bills.item_count IS 'Number of items in the bill';
COMMENT ON COLUMN customer_bills.status IS 'Status of the bill (completed, draft, etc.)';

COMMENT ON COLUMN customer_bill_items.quantity IS 'Quantity of the product (in kg or pieces)';
COMMENT ON COLUMN customer_bill_items.unit IS 'Unit of measurement (kg, g, pcs)';
COMMENT ON COLUMN customer_bill_items.price_per_kg IS 'Selling price per kg';
COMMENT ON COLUMN customer_bill_items.market_price_per_kg IS 'Market price per kg (for savings calculation)';
COMMENT ON COLUMN customer_bill_items.total IS 'Total amount for this item';
