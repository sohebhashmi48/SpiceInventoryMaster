
-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user'
);

-- Vendors table
CREATE TABLE vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  location VARCHAR(255),
  payment_terms VARCHAR(255) NOT NULL,
  money_owed DECIMAL(10,2) NOT NULL DEFAULT 0,
  money_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  rating INT,
  notes TEXT,
  delivery_person_name VARCHAR(255),
  delivery_person_contact VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT
);

-- Spices table
CREATE TABLE spices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  origin VARCHAR(255),
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'kg',
  stocks_qty INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Inventory table
CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spice_id INT NOT NULL,
  vendor_id INT NOT NULL,
  batch_number VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_value DECIMAL(10,2) NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  purchase_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  barcode VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  FOREIGN KEY (spice_id) REFERENCES spices(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Invoices table
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(255) NOT NULL UNIQUE,
  vendor_id INT NOT NULL,
  issue_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  delivery_person_name VARCHAR(255),
  delivery_person_contact VARCHAR(255),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Invoice Items table
CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  spice_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (spice_id) REFERENCES spices(id)
);

-- Transactions table
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  invoice_id INT,
  amount DECIMAL(10,2) NOT NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR(50) NOT NULL,
  notes TEXT,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Alerts table
CREATE TABLE alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  related_id INT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
