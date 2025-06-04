-- =====================================================
-- SpiceInventoryMaster Database Export
-- Complete database structure and data export
-- Generated for MySQL 8.0+
-- =====================================================

-- Set SQL mode and disable foreign key checks for import
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- DATABASE CREATION
-- =====================================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `spice_inventory_master` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `spice_inventory_master`;

-- =====================================================
-- TABLE STRUCTURES
-- =====================================================

-- Categories table
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `image_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suppliers table
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `gst_number` varchar(15) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `image_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `gst_number` (`gst_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category_id` int DEFAULT NULL,
  `description` text,
  `unit` enum('kg','g','lb','oz','pcs','box','pack','bag','l','ml') NOT NULL DEFAULT 'kg',
  `market_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stocks_qty` decimal(10,3) NOT NULL DEFAULT '0.000',
  `min_stock_level` decimal(10,3) DEFAULT '10.000',
  `max_stock_level` decimal(10,3) DEFAULT '1000.000',
  `image_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `category_id` (`category_id`),
  KEY `idx_stocks_qty` (`stocks_qty`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory table
DROP TABLE IF EXISTS `inventory`;
CREATE TABLE `inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `supplier_id` int DEFAULT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_cost` decimal(15,2) GENERATED ALWAYS AS ((`quantity` * `unit_price`)) STORED,
  `purchase_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('active','expired','sold','damaged') DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `idx_batch_number` (`batch_number`),
  KEY `idx_purchase_date` (`purchase_date`),
  KEY `idx_expiry_date` (`expiry_date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Caterers table
DROP TABLE IF EXISTS `caterers`;
CREATE TABLE `caterers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `gst_number` varchar(15) DEFAULT NULL,
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `image_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `gst_number` (`gst_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Distributions table
DROP TABLE IF EXISTS `distributions`;
CREATE TABLE `distributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `caterer_id` int NOT NULL,
  `bill_no` varchar(50) NOT NULL,
  `distribution_date` date NOT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `tax_percentage` decimal(5,2) DEFAULT '0.00',
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `grand_total` decimal(15,2) NOT NULL,
  `payment_method` enum('Cash','Card','Bank Transfer','Credit','UPI') DEFAULT 'Cash',
  `payment_status` enum('Paid','Partial','Unpaid') DEFAULT 'Unpaid',
  `amount_paid` decimal(15,2) DEFAULT '0.00',
  `balance_due` decimal(15,2) GENERATED ALWAYS AS ((`grand_total` - `amount_paid`)) STORED,
  `status` enum('pending','completed','cancelled') DEFAULT 'pending',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bill_no` (`bill_no`),
  KEY `caterer_id` (`caterer_id`),
  KEY `idx_distribution_date` (`distribution_date`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_status` (`status`),
  CONSTRAINT `distributions_ibfk_1` FOREIGN KEY (`caterer_id`) REFERENCES `caterers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Distribution Items table
DROP TABLE IF EXISTS `distribution_items`;
CREATE TABLE `distribution_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `distribution_id` int NOT NULL,
  `product_id` int NOT NULL,
  `inventory_id` int DEFAULT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(15,2) GENERATED ALWAYS AS ((`quantity` * `unit_price`)) STORED,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `distribution_id` (`distribution_id`),
  KEY `product_id` (`product_id`),
  KEY `inventory_id` (`inventory_id`),
  CONSTRAINT `distribution_items_ibfk_1` FOREIGN KEY (`distribution_id`) REFERENCES `distributions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `distribution_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `distribution_items_ibfk_3` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer Bills table
DROP TABLE IF EXISTS `customer_bills`;
CREATE TABLE `customer_bills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bill_no` varchar(50) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `customer_address` text,
  `bill_date` date NOT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `tax_percentage` decimal(5,2) DEFAULT '0.00',
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `grand_total` decimal(15,2) NOT NULL,
  `payment_method` enum('Cash','Card','Bank Transfer','UPI') DEFAULT 'Cash',
  `amount_paid` decimal(15,2) DEFAULT '0.00',
  `balance_due` decimal(15,2) GENERATED ALWAYS AS ((`grand_total` - `amount_paid`)) STORED,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bill_no` (`bill_no`),
  KEY `idx_bill_date` (`bill_date`),
  KEY `idx_customer_name` (`customer_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer Bill Items table
DROP TABLE IF EXISTS `customer_bill_items`;
CREATE TABLE `customer_bill_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `product_id` int NOT NULL,
  `inventory_id` int DEFAULT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(15,2) GENERATED ALWAYS AS ((`quantity` * `unit_price`)) STORED,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bill_id` (`bill_id`),
  KEY `product_id` (`product_id`),
  KEY `inventory_id` (`inventory_id`),
  CONSTRAINT `customer_bill_items_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `customer_bills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_bill_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_bill_items_ibfk_3` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Caterer Payments table
DROP TABLE IF EXISTS `caterer_payments`;
CREATE TABLE `caterer_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `caterer_id` int NOT NULL,
  `distribution_id` int DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` enum('Cash','Card','Bank Transfer','Cheque','UPI') DEFAULT 'Cash',
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `caterer_id` (`caterer_id`),
  KEY `distribution_id` (`distribution_id`),
  KEY `idx_payment_date` (`payment_date`),
  CONSTRAINT `caterer_payments_ibfk_1` FOREIGN KEY (`caterer_id`) REFERENCES `caterers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `caterer_payments_ibfk_2` FOREIGN KEY (`distribution_id`) REFERENCES `distributions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supplier Payments table
DROP TABLE IF EXISTS `supplier_payments`;
CREATE TABLE `supplier_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` enum('Cash','Card','Bank Transfer','Cheque','UPI') DEFAULT 'Cash',
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `idx_payment_date` (`payment_date`),
  CONSTRAINT `supplier_payments_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory History table
DROP TABLE IF EXISTS `inventory_history`;
CREATE TABLE `inventory_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inventory_id` int NOT NULL,
  `action` enum('created','updated','deleted','stock_added','stock_reduced') NOT NULL,
  `field_name` varchar(100) DEFAULT NULL,
  `old_value` text,
  `new_value` text,
  `quantity_change` decimal(10,3) DEFAULT NULL,
  `user_id` varchar(100) DEFAULT 'system',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `inventory_id` (`inventory_id`),
  KEY `idx_action` (`action`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `inventory_history_ibfk_1` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC STOCK MANAGEMENT
-- =====================================================

-- Trigger to update product stock when inventory is added
DELIMITER $$
DROP TRIGGER IF EXISTS `update_product_stock_on_inventory_insert`$$
CREATE TRIGGER `update_product_stock_on_inventory_insert`
AFTER INSERT ON `inventory`
FOR EACH ROW
BEGIN
    UPDATE products
    SET stocks_qty = stocks_qty + NEW.quantity
    WHERE id = NEW.product_id;

    INSERT INTO inventory_history (inventory_id, action, quantity_change, notes)
    VALUES (NEW.id, 'stock_added', NEW.quantity, CONCAT('Stock added: ', NEW.quantity, ' units'));
END$$

-- Trigger to update product stock when inventory is updated
DROP TRIGGER IF EXISTS `update_product_stock_on_inventory_update`$$
CREATE TRIGGER `update_product_stock_on_inventory_update`
AFTER UPDATE ON `inventory`
FOR EACH ROW
BEGIN
    DECLARE quantity_diff DECIMAL(10,3);
    SET quantity_diff = NEW.quantity - OLD.quantity;

    UPDATE products
    SET stocks_qty = stocks_qty + quantity_diff
    WHERE id = NEW.product_id;

    IF quantity_diff != 0 THEN
        INSERT INTO inventory_history (inventory_id, action, quantity_change, notes)
        VALUES (NEW.id, 'updated', quantity_diff, CONCAT('Stock adjusted: ', quantity_diff, ' units'));
    END IF;
END$$

-- Trigger to update product stock when inventory is deleted
DROP TRIGGER IF EXISTS `update_product_stock_on_inventory_delete`$$
CREATE TRIGGER `update_product_stock_on_inventory_delete`
AFTER DELETE ON `inventory`
FOR EACH ROW
BEGIN
    UPDATE products
    SET stocks_qty = stocks_qty - OLD.quantity
    WHERE id = OLD.product_id;
END$$

-- Trigger to reduce stock when distribution items are added
DROP TRIGGER IF EXISTS `reduce_stock_on_distribution`$$
CREATE TRIGGER `reduce_stock_on_distribution`
AFTER INSERT ON `distribution_items`
FOR EACH ROW
BEGIN
    UPDATE products
    SET stocks_qty = stocks_qty - NEW.quantity
    WHERE id = NEW.product_id;

    IF NEW.inventory_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = quantity - NEW.quantity
        WHERE id = NEW.inventory_id;

        INSERT INTO inventory_history (inventory_id, action, quantity_change, notes)
        VALUES (NEW.inventory_id, 'stock_reduced', -NEW.quantity, CONCAT('Stock reduced for distribution: ', NEW.quantity, ' units'));
    END IF;
END$$

-- Trigger to reduce stock when customer bill items are added
DROP TRIGGER IF EXISTS `reduce_stock_on_customer_bill`$$
CREATE TRIGGER `reduce_stock_on_customer_bill`
AFTER INSERT ON `customer_bill_items`
FOR EACH ROW
BEGIN
    UPDATE products
    SET stocks_qty = stocks_qty - NEW.quantity
    WHERE id = NEW.product_id;

    IF NEW.inventory_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = quantity - NEW.quantity
        WHERE id = NEW.inventory_id;

        INSERT INTO inventory_history (inventory_id, action, quantity_change, notes)
        VALUES (NEW.inventory_id, 'stock_reduced', -NEW.quantity, CONCAT('Stock reduced for customer sale: ', NEW.quantity, ' units'));
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample categories
INSERT INTO `categories` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'Whole Spices', 'Complete spices in their natural form', NOW()),
(2, 'Ground Spices', 'Finely ground spice powders', NOW()),
(3, 'Spice Blends', 'Mixed spice combinations', NOW()),
(4, 'Seeds', 'Various spice seeds', NOW()),
(5, 'Herbs', 'Fresh and dried herbs', NOW()),
(6, 'Specialty Spices', 'Premium and exotic spices', NOW());

-- Insert sample suppliers
INSERT INTO `suppliers` (`id`, `name`, `contact_person`, `phone`, `email`, `address`, `city`, `state`, `pincode`, `gst_number`, `payment_terms`, `credit_limit`, `created_at`) VALUES
(1, 'Rajesh Spice Traders', 'Rajesh Kumar', '+91 98765 43210', 'rajesh@spicetraders.com', '123 Spice Market, Gandhi Road', 'Mumbai', 'Maharashtra', '400001', '27ABCDE1234F1Z5', 'Net 30', 500000.00, NOW()),
(2, 'Kerala Spices Ltd', 'Priya Nair', '+91 98765 43211', 'priya@keralaspices.com', '456 Spice Garden, MG Road', 'Kochi', 'Kerala', '682001', '32FGHIJ5678K2A6', 'Net 15', 300000.00, NOW()),
(3, 'Gujarat Masala Co', 'Amit Patel', '+91 98765 43212', 'amit@gujaratmasala.com', '789 Masala Street, CG Road', 'Ahmedabad', 'Gujarat', '380001', '24LMNOP9012L3B7', 'Net 45', 750000.00, NOW()),
(4, 'Tamil Nadu Exports', 'Lakshmi Raman', '+91 98765 43213', 'lakshmi@tnexports.com', '321 Export House, Anna Salai', 'Chennai', 'Tamil Nadu', '600001', '33QRSTUV345M4C8', 'Net 30', 400000.00, NOW()),
(5, 'Organic Spice Farm', 'Suresh Reddy', '+91 98765 43214', 'suresh@organicspices.com', '654 Farm Road, Jubilee Hills', 'Hyderabad', 'Telangana', '500001', '36WXYZ6789N5D9', 'Net 20', 250000.00, NOW());

-- Insert sample products
INSERT INTO `products` (`id`, `name`, `category_id`, `description`, `unit`, `market_price`, `stocks_qty`, `min_stock_level`, `max_stock_level`, `created_at`) VALUES
(1, 'Turmeric Powder', 2, 'Premium quality turmeric powder', 'kg', 180.00, 150.500, 20.000, 500.000, NOW()),
(2, 'Red Chili Powder', 2, 'Hot and spicy red chili powder', 'kg', 220.00, 120.750, 15.000, 400.000, NOW()),
(3, 'Coriander Seeds', 4, 'Fresh coriander seeds', 'kg', 160.00, 200.250, 25.000, 600.000, NOW()),
(4, 'Cumin Seeds', 4, 'Aromatic cumin seeds', 'kg', 280.00, 80.500, 10.000, 300.000, NOW()),
(5, 'Black Pepper', 1, 'Premium black pepper corns', 'kg', 450.00, 45.750, 5.000, 150.000, NOW()),
(6, 'Cardamom', 1, 'Green cardamom pods', 'kg', 1200.00, 25.250, 3.000, 100.000, NOW()),
(7, 'Cinnamon Sticks', 1, 'Ceylon cinnamon sticks', 'kg', 380.00, 60.500, 8.000, 200.000, NOW()),
(8, 'Garam Masala', 3, 'Traditional garam masala blend', 'kg', 320.00, 90.750, 12.000, 250.000, NOW()),
(9, 'Bay Leaves', 5, 'Dried bay leaves', 'kg', 240.00, 35.250, 5.000, 120.000, NOW()),
(10, 'Saffron', 6, 'Premium Kashmir saffron', 'g', 15.00, 500.000, 50.000, 2000.000, NOW()),
(11, 'Mustard Seeds', 4, 'Yellow mustard seeds', 'kg', 140.00, 110.500, 15.000, 350.000, NOW()),
(12, 'Fenugreek Seeds', 4, 'Methi seeds', 'kg', 120.00, 75.250, 10.000, 250.000, NOW()),
(13, 'Cloves', 1, 'Whole cloves', 'kg', 800.00, 30.750, 4.000, 100.000, NOW()),
(14, 'Star Anise', 1, 'Whole star anise', 'kg', 600.00, 20.500, 3.000, 80.000, NOW()),
(15, 'Nutmeg', 1, 'Whole nutmeg', 'kg', 900.00, 15.250, 2.000, 60.000, NOW());

-- Insert sample caterers
INSERT INTO `caterers` (`id`, `name`, `contact_person`, `phone`, `email`, `address`, `city`, `state`, `pincode`, `gst_number`, `credit_limit`, `created_at`) VALUES
(1, 'Royal Catering Services', 'Vikram Singh', '+91 98765 54321', 'vikram@royalcatering.com', '123 Catering Complex, FC Road', 'Pune', 'Maharashtra', '411001', '27CATERER123F1Z5', 100000.00, NOW()),
(2, 'Spice Palace Restaurant', 'Meera Sharma', '+91 98765 54322', 'meera@spicepalace.com', '456 Restaurant Row, Brigade Road', 'Bangalore', 'Karnataka', '560001', '29RESTAURANT456G2A6', 150000.00, NOW()),
(3, 'Golden Fork Catering', 'Arjun Reddy', '+91 98765 54323', 'arjun@goldenfork.com', '789 Banquet Hall, Banjara Hills', 'Hyderabad', 'Telangana', '500001', '36CATERING789H3B7', 120000.00, NOW()),
(4, 'Maharaja Feast', 'Priya Patel', '+91 98765 54324', 'priya@maharajafeast.com', '321 Wedding Hall, Satellite', 'Ahmedabad', 'Gujarat', '380001', '24FEAST321I4C8', 80000.00, NOW()),
(5, 'Coastal Delights', 'Ravi Nair', '+91 98765 54325', 'ravi@coastaldelights.com', '654 Beach Resort, Marine Drive', 'Kochi', 'Kerala', '682001', '32COASTAL654J5D9', 90000.00, NOW());

-- Insert sample inventory
INSERT INTO `inventory` (`id`, `product_id`, `supplier_id`, `batch_number`, `quantity`, `unit_price`, `purchase_date`, `expiry_date`, `status`, `notes`, `created_at`) VALUES
(1, 1, 1, 'TUR001', 50.000, 175.00, '2024-01-15', '2025-01-15', 'active', 'Premium quality turmeric', NOW()),
(2, 1, 2, 'TUR002', 100.500, 170.00, '2024-01-20', '2025-01-20', 'active', 'Organic turmeric powder', NOW()),
(3, 2, 1, 'CHI001', 75.000, 210.00, '2024-01-18', '2025-01-18', 'active', 'Hot red chili powder', NOW()),
(4, 2, 3, 'CHI002', 45.750, 215.00, '2024-01-22', '2025-01-22', 'active', 'Extra spicy variety', NOW()),
(5, 3, 2, 'COR001', 120.000, 155.00, '2024-01-16', '2025-01-16', 'active', 'Fresh coriander seeds', NOW()),
(6, 3, 4, 'COR002', 80.250, 158.00, '2024-01-25', '2025-01-25', 'active', 'Premium grade', NOW()),
(7, 4, 1, 'CUM001', 40.000, 275.00, '2024-01-19', '2025-01-19', 'active', 'Aromatic cumin seeds', NOW()),
(8, 4, 3, 'CUM002', 40.500, 270.00, '2024-01-23', '2025-01-23', 'active', 'Export quality', NOW()),
(9, 5, 2, 'PEP001', 25.000, 440.00, '2024-01-17', '2025-01-17', 'active', 'Black pepper corns', NOW()),
(10, 5, 4, 'PEP002', 20.750, 445.00, '2024-01-24', '2025-01-24', 'active', 'Premium grade', NOW()),
(11, 6, 5, 'CAR001', 15.000, 1180.00, '2024-01-21', '2025-01-21', 'active', 'Green cardamom', NOW()),
(12, 6, 2, 'CAR002', 10.250, 1190.00, '2024-01-26', '2025-01-26', 'active', 'Premium quality', NOW()),
(13, 7, 3, 'CIN001', 35.000, 375.00, '2024-01-20', '2025-01-20', 'active', 'Ceylon cinnamon', NOW()),
(14, 7, 1, 'CIN002', 25.500, 370.00, '2024-01-27', '2025-01-27', 'active', 'Organic variety', NOW()),
(15, 8, 4, 'GAR001', 50.000, 315.00, '2024-01-22', '2025-01-22', 'active', 'Traditional blend', NOW()),
(16, 8, 5, 'GAR002', 40.750, 310.00, '2024-01-28', '2025-01-28', 'active', 'House special', NOW()),
(17, 9, 2, 'BAY001', 20.000, 235.00, '2024-01-19', '2025-01-19', 'active', 'Dried bay leaves', NOW()),
(18, 9, 3, 'BAY002', 15.250, 230.00, '2024-01-25', '2025-01-25', 'active', 'Premium grade', NOW()),
(19, 10, 5, 'SAF001', 250.000, 14.50, '2024-01-23', '2025-01-23', 'active', 'Kashmir saffron', NOW()),
(20, 10, 2, 'SAF002', 250.000, 14.80, '2024-01-29', '2025-01-29', 'active', 'Premium quality', NOW());

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View for inventory summary
CREATE OR REPLACE VIEW `inventory_summary` AS
SELECT
    p.id as product_id,
    p.name as product_name,
    c.name as category_name,
    p.unit,
    p.stocks_qty,
    p.min_stock_level,
    p.max_stock_level,
    p.market_price,
    (p.stocks_qty * p.market_price) as total_value,
    CASE
        WHEN p.stocks_qty <= p.min_stock_level THEN 'Low Stock'
        WHEN p.stocks_qty >= p.max_stock_level THEN 'Overstock'
        ELSE 'Normal'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.name;

-- View for expiring inventory
CREATE OR REPLACE VIEW `expiring_inventory` AS
SELECT
    i.id,
    p.name as product_name,
    s.name as supplier_name,
    i.batch_number,
    i.quantity,
    i.expiry_date,
    DATEDIFF(i.expiry_date, CURDATE()) as days_to_expiry,
    CASE
        WHEN DATEDIFF(i.expiry_date, CURDATE()) <= 0 THEN 'Expired'
        WHEN DATEDIFF(i.expiry_date, CURDATE()) <= 30 THEN 'Expiring Soon'
        WHEN DATEDIFF(i.expiry_date, CURDATE()) <= 90 THEN 'Monitor'
        ELSE 'Good'
    END as expiry_status
FROM inventory i
JOIN products p ON i.product_id = p.id
LEFT JOIN suppliers s ON i.supplier_id = s.id
WHERE i.status = 'active' AND i.expiry_date IS NOT NULL
ORDER BY i.expiry_date ASC;

-- View for sales summary
CREATE OR REPLACE VIEW `sales_summary` AS
SELECT
    DATE(d.distribution_date) as sale_date,
    COUNT(d.id) as total_orders,
    SUM(d.grand_total) as total_revenue,
    SUM(d.amount_paid) as total_collected,
    SUM(d.balance_due) as total_outstanding,
    AVG(d.grand_total) as average_order_value
FROM distributions d
WHERE d.status = 'completed'
GROUP BY DATE(d.distribution_date)
ORDER BY sale_date DESC;

-- View for customer sales summary
CREATE OR REPLACE VIEW `customer_sales_summary` AS
SELECT
    DATE(cb.bill_date) as sale_date,
    COUNT(cb.id) as total_bills,
    SUM(cb.grand_total) as total_revenue,
    SUM(cb.amount_paid) as total_collected,
    SUM(cb.balance_due) as total_outstanding,
    AVG(cb.grand_total) as average_bill_value
FROM customer_bills cb
GROUP BY DATE(cb.bill_date)
ORDER BY sale_date DESC;

-- View for supplier performance
CREATE OR REPLACE VIEW `supplier_performance` AS
SELECT
    s.id,
    s.name as supplier_name,
    COUNT(i.id) as total_purchases,
    SUM(i.quantity) as total_quantity,
    SUM(i.quantity * i.unit_price) as total_value,
    AVG(i.unit_price) as avg_unit_price,
    MAX(i.purchase_date) as last_purchase_date,
    DATEDIFF(CURDATE(), MAX(i.purchase_date)) as days_since_last_purchase
FROM suppliers s
LEFT JOIN inventory i ON s.id = i.supplier_id
GROUP BY s.id, s.name
ORDER BY total_value DESC;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Procedure to get low stock alerts
DELIMITER $$
DROP PROCEDURE IF EXISTS `GetLowStockAlerts`$$
CREATE PROCEDURE `GetLowStockAlerts`()
BEGIN
    SELECT
        p.id,
        p.name,
        p.stocks_qty,
        p.min_stock_level,
        p.unit,
        c.name as category_name,
        (p.min_stock_level - p.stocks_qty) as shortage_quantity
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stocks_qty <= p.min_stock_level
    ORDER BY (p.min_stock_level - p.stocks_qty) DESC;
END$$

-- Procedure to get inventory analytics
DROP PROCEDURE IF EXISTS `GetInventoryAnalytics`$$
CREATE PROCEDURE `GetInventoryAnalytics`()
BEGIN
    SELECT
        COUNT(*) as total_products,
        SUM(stocks_qty * market_price) as total_inventory_value,
        COUNT(CASE WHEN stocks_qty <= min_stock_level THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN stocks_qty >= max_stock_level THEN 1 END) as overstock_count,
        AVG(market_price) as avg_product_price,
        SUM(stocks_qty) as total_stock_quantity
    FROM products;
END$$

-- Procedure to get monthly sales report
DROP PROCEDURE IF EXISTS `GetMonthlySalesReport`$$
CREATE PROCEDURE `GetMonthlySalesReport`(IN report_year INT, IN report_month INT)
BEGIN
    SELECT
        DATE(d.distribution_date) as sale_date,
        COUNT(d.id) as orders_count,
        SUM(d.grand_total) as total_revenue,
        SUM(d.amount_paid) as total_collected,
        SUM(d.balance_due) as total_outstanding
    FROM distributions d
    WHERE YEAR(d.distribution_date) = report_year
    AND MONTH(d.distribution_date) = report_month
    AND d.status = 'completed'
    GROUP BY DATE(d.distribution_date)
    ORDER BY sale_date;
END$$

DELIMITER ;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional indexes for better performance
CREATE INDEX idx_products_category_stock ON products(category_id, stocks_qty);
CREATE INDEX idx_inventory_product_status ON inventory(product_id, status);
CREATE INDEX idx_inventory_expiry_status ON inventory(expiry_date, status);
CREATE INDEX idx_distributions_date_status ON distributions(distribution_date, status);
CREATE INDEX idx_customer_bills_date ON customer_bills(bill_date);
CREATE INDEX idx_payments_date ON caterer_payments(payment_date);
CREATE INDEX idx_supplier_payments_date ON supplier_payments(payment_date);

-- =====================================================
-- FINAL SETUP
-- =====================================================

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Commit the transaction
COMMIT;

-- =====================================================
-- EXPORT COMPLETE
-- =====================================================
-- This export includes:
-- 1. Complete database structure with all tables
-- 2. Foreign key relationships and constraints
-- 3. Triggers for automatic stock management
-- 4. Sample data for testing
-- 5. Views for reporting and analytics
-- 6. Stored procedures for common operations
-- 7. Performance indexes
--
-- To import this database:
-- 1. Create a new MySQL database
-- 2. Run this SQL file: mysql -u username -p database_name < spice_inventory_master_export.sql
-- 3. Verify the import by checking tables and data
--
-- Database Version: MySQL 8.0+
-- Character Set: utf8mb4_unicode_ci
-- Engine: InnoDB
-- =====================================================
