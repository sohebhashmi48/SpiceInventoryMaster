CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role VARCHAR(255) NOT NULL DEFAULT 'user'
);

CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  location TEXT,
  payment_terms TEXT NOT NULL,
  money_owed NUMERIC NOT NULL DEFAULT 0,
  money_paid NUMERIC NOT NULL DEFAULT 0,
  rating INTEGER,
  notes TEXT,
  delivery_person_name TEXT,
  delivery_person_contact TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE spices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER NOT NULL,
  origin TEXT,
  description TEXT,
  price NUMERIC DEFAULT 0,
  unit VARCHAR(255) DEFAULT 'kg',
  stocks_qty INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  spice_id INTEGER NOT NULL,
  vendor_id INTEGER NOT NULL,
  batch_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  purchase_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  barcode TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  vendor_id INTEGER NOT NULL,
  issue_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  delivery_person_name TEXT,
  delivery_person_contact TEXT
);

CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  spice_id INTEGER NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total NUMERIC NOT NULL
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL,
  invoice_id INTEGER,
  amount NUMERIC NOT NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  type TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
