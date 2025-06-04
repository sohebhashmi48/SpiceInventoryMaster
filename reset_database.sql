-- Reset and recreate the entire database
DROP DATABASE IF EXISTS spice_inventory;
CREATE DATABASE spice_inventory;
USE spice_inventory;

-- Create users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'user'
);

-- Create categories table
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

-- Create products (formerly spices) table
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category_id INT NOT NULL,
  origin VARCHAR(100),
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'kg',
  stocks_qty INT DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  image_path VARCHAR(255),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Create suppliers (formerly vendors) table
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  payment_terms VARCHAR(100),
  credit_limit DECIMAL(10,2) DEFAULT 0.00,
  balance_due DECIMAL(10,2) DEFAULT 0.00,
  total_paid DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  rating INT,
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create inventory table
CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  supplier_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_value DECIMAL(10,2) NOT NULL,
  expiry_date DATE NOT NULL,
  purchase_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  barcode VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Create invoices table
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  supplier_id INT NOT NULL,
  issue_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  delivery_person_name VARCHAR(100),
  delivery_person_contact VARCHAR(100),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Create invoice items table
CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create transactions table
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  invoice_id INT,
  amount DECIMAL(10,2) NOT NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR(50) NOT NULL, -- payment or receipt
  notes TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Create alerts table
CREATE TABLE alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- low_stock, expiry, etc.
  message TEXT NOT NULL,
  related_id INT, -- ID of related entity (inventory, etc)
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create purchases table
CREATE TABLE purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  company_address TEXT NOT NULL,
  bill_no VARCHAR(100) NOT NULL,
  page_no VARCHAR(100) NOT NULL,
  supplier_id INT,
  purchase_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Create purchase items table
CREATE TABLE purchase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  rate DECIMAL(10,2) NOT NULL,
  gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);

-- Create caterers table
CREATE TABLE caterers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  gst_number VARCHAR(50),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) DEFAULT 0,
  total_paid DECIMAL(10,2) DEFAULT 0,
  total_billed DECIMAL(10,2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create distributions table (caterer billing)
CREATE TABLE distributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_no VARCHAR(100) NOT NULL,
  caterer_id INT NOT NULL,
  distribution_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_mode VARCHAR(50),
  payment_date TIMESTAMP,
  balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caterer_id) REFERENCES caterers(id)
);

-- Create distribution items table
CREATE TABLE distribution_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  distribution_id INT NOT NULL,
  product_id INT NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  rate DECIMAL(10,2) NOT NULL,
  gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (distribution_id) REFERENCES distributions(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create caterer payments table
CREATE TABLE caterer_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caterer_id INT NOT NULL,
  distribution_id INT,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_mode VARCHAR(50) NOT NULL,
  reference_no VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caterer_id) REFERENCES caterers(id),
  FOREIGN KEY (distribution_id) REFERENCES distributions(id)
);

-- Create payment reminders table
CREATE TABLE payment_reminders (
  id VARCHAR(36) PRIMARY KEY,
  caterer_id INT NOT NULL,
  distribution_id INT,
  amount DECIMAL(10,2) NOT NULL,
  original_due_date DATE NOT NULL,
  reminder_date DATE NOT NULL,
  next_reminder_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  is_acknowledged TINYINT(1) NOT NULL DEFAULT 0,
  acknowledged_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (caterer_id) REFERENCES caterers(id),
  FOREIGN KEY (distribution_id) REFERENCES distributions(id)
);

-- Create purchase price history table
CREATE TABLE purchase_price_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  product_id INT NOT NULL,
  purchase_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create trigger to set default value for tags column in suppliers table
CREATE TRIGGER set_default_tags_on_insert
BEFORE INSERT ON suppliers
FOR EACH ROW
SET NEW.tags = IFNULL(NEW.tags, JSON_ARRAY());

-- Insert default admin user (password: admin)
INSERT INTO users (username, password, full_name, email, role)
VALUES ('admin', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MbGcD.wIUYcK4l5EFBDCJYLQiJLMXm', 'Administrator', 'admin@example.com', 'admin');
