import express, { Express } from "express";
import { z } from "zod";
import {
  insertSupplierSchema,
  purchaseWithItemsSchema,
  insertCatererSchema,
  distributionWithItemsSchema,
  insertCatererPaymentSchema,
  customerBillWithItemsSchema,
  insertExpenseSchema,
  insertAssetSchema
} from "@shared/schema";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import upload, { getCatererImageUrl, getSupplierImageUrl } from "./upload";
import path from "path";
import { fileURLToPath } from "url";
import vendorPaymentsRouter from "./routes/vendor-payments";
import customerBillsRouter from "./routes/customer-bills";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fuzzy matching function for product names
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1.0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Common spice name mappings
  const spiceMappings: { [key: string]: string[] } = {
    'mirchi': ['red chili powder', 'chili powder', 'red chilli powder', 'chilli powder'],
    'turmeric': ['turmeric powder', 'haldi', 'haldi powder'],
    'coriander': ['coriander powder', 'dhania', 'dhania powder'],
    'cumin': ['cumin seeds', 'jeera', 'cumin powder'],
    'garam masala': ['garam masala powder'],
    'black pepper': ['black pepper powder', 'kali mirch'],
    'cardamom': ['green cardamom', 'elaichi'],
    'cinnamon': ['cinnamon stick', 'dalchini'],
    'cloves': ['laung'],
    'bay leaves': ['tej patta'],
    'mustard': ['mustard seeds', 'sarson'],
    'fenugreek': ['methi', 'fenugreek seeds'],
    'asafoetida': ['hing'],
    'fennel': ['saunf', 'fennel seeds']
  };

  // Check mappings
  for (const [key, aliases] of Object.entries(spiceMappings)) {
    if ((s1.includes(key) || aliases.some(alias => s1.includes(alias))) &&
        (s2.includes(key) || aliases.some(alias => s2.includes(alias)))) {
      return 0.9;
    }
  }

  // Levenshtein distance for fuzzy matching
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

// Find best matching product for an order item
async function findMatchingProduct(conn: any, itemName: string): Promise<any | null> {
  const [products] = await conn.execute(`
    SELECT id, name, unit, stocks_qty
    FROM products
    WHERE is_active = 1
  `);

  let bestMatch = null;
  let bestScore = 0;
  const threshold = 0.6; // Minimum similarity score

  for (const product of products as any[]) {
    const score = calculateSimilarity(itemName, product.name);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = { ...product, similarity: score };
    }
  }

  console.log(`Best match for "${itemName}": ${bestMatch ? `${bestMatch.name} (${(bestMatch.similarity * 100).toFixed(1)}%)` : 'None found'}`);
  return bestMatch;
}

// Deduct inventory for an order item using FIFO
async function deductInventoryForOrderItem(conn: any, orderItem: any, orderId: number): Promise<void> {
  const { product_name, quantity, unit } = orderItem;

  console.log(`Processing inventory deduction for: ${product_name} (${quantity} ${unit})`);

  // Find matching product
  const matchedProduct = await findMatchingProduct(conn, product_name);
  if (!matchedProduct) {
    console.log(`No matching product found for "${product_name}", skipping inventory deduction`);
    return;
  }

  console.log(`Matched "${product_name}" to product "${matchedProduct.name}" (ID: ${matchedProduct.id})`);

  // Get available inventory batches for this product (FIFO order)
  const [inventoryBatches] = await conn.execute(`
    SELECT id, batch_number, quantity, unit_price, expiry_date, purchase_date
    FROM inventory
    WHERE product_id = ? AND status = 'active' AND quantity > 0
    ORDER BY expiry_date ASC, purchase_date ASC
  `, [matchedProduct.id]);

  const batches = inventoryBatches as any[];
  console.log(`Found ${batches.length} available batches for product ${matchedProduct.name}`);

  if (batches.length === 0) {
    console.log(`No available inventory for product "${matchedProduct.name}"`);
    return;
  }

  let remainingQuantity = Number(quantity);
  const deductedBatches: { batchId: number; deductedQuantity: number }[] = [];

  // Deduct from batches using FIFO
  for (const batch of batches) {
    if (remainingQuantity <= 0) break;

    const availableQuantity = Number(batch.quantity);
    const deductQuantity = Math.min(remainingQuantity, availableQuantity);
    const newQuantity = availableQuantity - deductQuantity;

    // Update batch quantity
    if (newQuantity === 0) {
      // Mark batch as inactive if depleted
      await conn.execute(`
        UPDATE inventory
        SET quantity = 0, total_value = 0, status = 'inactive'
        WHERE id = ?
      `, [batch.id]);
      console.log(`Batch ${batch.batch_number} depleted and marked as inactive`);
    } else {
      // Update remaining quantity and value
      const unitPrice = Number(batch.unit_price);
      const newValue = newQuantity * unitPrice;
      await conn.execute(`
        UPDATE inventory
        SET quantity = ?, total_value = ?
        WHERE id = ?
      `, [newQuantity, newValue, batch.id]);
      console.log(`Updated batch ${batch.batch_number}: ${availableQuantity} -> ${newQuantity}`);
    }

    // Record the deduction
    deductedBatches.push({ batchId: batch.id, deductedQuantity: deductQuantity });
    remainingQuantity -= deductQuantity;

    console.log(`Deducted ${deductQuantity} from batch ${batch.batch_number}, remaining to deduct: ${remainingQuantity}`);
  }

  // Update product stock quantity
  const totalDeducted = Number(quantity) - remainingQuantity;
  if (totalDeducted > 0) {
    await conn.execute(`
      UPDATE products
      SET stocks_qty = GREATEST(0, stocks_qty - ?)
      WHERE id = ?
    `, [totalDeducted, matchedProduct.id]);

    console.log(`Updated product ${matchedProduct.name} stock quantity by -${totalDeducted}`);
  }

  // Log inventory transactions for audit trail
  for (const { batchId, deductedQuantity } of deductedBatches) {
    try {
      // Check if inventory_transactions table exists, create if not
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'inventory_transactions'`);
      if ((tables as any[]).length === 0) {
        console.log("Creating inventory_transactions table...");
        await conn.execute(`
          CREATE TABLE inventory_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            inventory_id INT NOT NULL,
            transaction_type VARCHAR(50) NOT NULL,
            quantity DECIMAL(10,3) NOT NULL,
            reference_type VARCHAR(50),
            reference_id INT,
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_id) REFERENCES inventory(id)
          )
        `);
      }

      await conn.execute(`
        INSERT INTO inventory_transactions (
          inventory_id, transaction_type, quantity, reference_type, reference_id, notes, created_at
        ) VALUES (?, 'deduction', ?, 'order_delivery', ?, ?, NOW())
      `, [
        batchId,
        deductedQuantity,
        orderId,
        `Order delivery - Order #${orderItem.order_number} - Item: ${product_name}`
      ]);
    } catch (transactionError) {
      console.warn("Failed to record inventory transaction:", transactionError);
      // Continue without failing the entire operation
    }
  }

  if (remainingQuantity > 0) {
    console.warn(`Could not deduct full quantity for "${product_name}". Remaining: ${remainingQuantity} ${unit}`);
  } else {
    console.log(`Successfully deducted ${quantity} ${unit} of "${product_name}" from inventory`);
  }
}

export async function registerRoutes(app: Express) {
  const uploadsPath = path.join(__dirname, 'public', 'uploads');
  console.log(`Serving static files from: ${uploadsPath} at /api/uploads`);
  app.use('/api/uploads', express.static(uploadsPath));

  // Public API endpoints for customer showcase (no authentication required)
  // IMPORTANT: These must be defined BEFORE authentication setup

  // Debug endpoint to check image paths
  app.get("/api/debug/image-paths", async (_req, res) => {
    try {
      const products = await storage.getSpices();
      const imagePaths = products.slice(0, 10).map(p => ({
        id: p.id,
        name: p.name,
        imagePath: p.imagePath
      }));
      res.json(imagePaths);
    } catch (error) {
      console.error("Debug image paths error:", error);
      res.status(500).json({ message: "Failed to fetch image paths" });
    }
  });

  // Get all categories for public showcase
  app.get("/api/public/categories", async (_req, res) => {
    try {
      console.log("Fetching categories for public showcase");
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get public categories error:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Create order from showcase (WhatsApp orders)
  app.post("/api/public/orders", async (req, res) => {
    try {
      console.log("Creating showcase order");
      const {
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        notes,
        items,
        subtotal,
        deliveryFee,
        total,
        whatsappMessage
      } = req.body;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const conn = await storage.getConnection();
      try {
        await conn.beginTransaction();

        // Insert order
        const [orderResult] = await conn.execute(`
          INSERT INTO orders (
            order_number, customer_name, customer_phone, customer_email,
            delivery_address, subtotal, delivery_fee, total_amount,
            notes, whatsapp_sent, whatsapp_message, order_source, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, 'showcase', 'pending')
        `, [
          orderNumber, customerName, customerPhone, customerEmail || null,
          customerAddress, subtotal, deliveryFee, total,
          notes || null, whatsappMessage
        ]);

        const orderId = (orderResult as any).insertId;

        // Insert order items
        for (const item of items) {
          await conn.execute(`
            INSERT INTO order_items (
              order_id, product_id, product_name, quantity,
              unit, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            orderId, item.productId || null, item.name,
            item.quantity, item.unit, item.price, item.total
          ]);
        }

        await conn.commit();

        res.json({
          success: true,
          orderId,
          orderNumber,
          message: "Order created successfully"
        });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Debug endpoint to check image paths
  app.get("/api/debug/image-paths", async (_req, res) => {
    try {
      const products = await storage.getSpices();
      const imagePaths = products.slice(0, 10).map(p => ({
        id: p.id,
        name: p.name,
        imagePath: p.imagePath
      }));
      res.json(imagePaths);
    } catch (error) {
      console.error("Debug image paths error:", error);
      res.status(500).json({ message: "Failed to fetch image paths" });
    }
  });

  // Debug endpoint to check uploads directory
  app.get("/api/debug/uploads", async (_req, res) => {
    try {
      const fs = await import('fs');
      const uploadsPath = path.join(__dirname, 'public', 'uploads', 'spices');

      if (!fs.existsSync(uploadsPath)) {
        return res.json({
          error: 'Uploads directory does not exist',
          path: uploadsPath
        });
      }

      const files = fs.readdirSync(uploadsPath);
      res.json({
        uploadsPath,
        files: files.slice(0, 10) // First 10 files
      });
    } catch (error) {
      console.error("Debug uploads error:", error);
      res.status(500).json({ message: "Failed to check uploads directory" });
    }
  });

  // Get all products for public showcase with stock info
  app.get("/api/public/products", async (req, res) => {
    try {
      console.log("Fetching products for public showcase");
      const { category, search, sortBy = 'name', sortOrder = 'asc' } = req.query;

      let products = await storage.getSpices();

      // Calculate actual stock quantities from inventory
      const conn = await storage.getConnection();
      try {
        for (const product of products) {
          const [rows] = await conn.execute(`
            SELECT SUM(quantity) as totalQuantity
            FROM inventory
            WHERE product_id = ? AND status = 'active'
          `, [product.id]);

          const result = (rows as any[])[0];
          product.stocksQty = result.totalQuantity ? Number(result.totalQuantity) : 0;
        }
      } finally {
        conn.release();
      }

      // Filter by category if specified
      if (category) {
        const categoryId = parseInt(category as string);
        if (!isNaN(categoryId)) {
          products = products.filter(p => p.categoryId === categoryId);
        }
      }

      // Filter by search term if specified
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(searchTerm) ||
          (p.description && p.description.toLowerCase().includes(searchTerm))
        );
      }

      // Sort products with availability priority
      products.sort((a, b) => {
        // First priority: Available products (stocksQty > 0) come before out-of-stock (stocksQty = 0)
        const aInStock = (a.stocksQty || 0) > 0;
        const bInStock = (b.stocksQty || 0) > 0;

        if (aInStock && !bInStock) return -1; // a is in stock, b is not - a comes first
        if (!aInStock && bInStock) return 1;  // b is in stock, a is not - b comes first

        // If both have same stock status, sort by the selected criteria
        let aValue, bValue;

        switch (sortBy) {
          case 'price':
            aValue = Number(a.retailPrice || 0);
            bValue = Number(b.retailPrice || 0);
            break;
          case 'stock':
            aValue = a.stocksQty || 0;
            bValue = b.stocksQty || 0;
            break;
          default: // name
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }

        if (sortOrder === 'desc') {
          return aValue < bValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });

      // Return all active products regardless of stock for public showcase
      const availableProducts = products.filter(p => p.isActive);

      res.json(availableProducts);
    } catch (error) {
      console.error("Get public products error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get products by category for public showcase
  app.get("/api/public/categories/:categoryId/products", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }

      console.log(`Fetching products for category ${categoryId} for public showcase`);
      const products = await storage.getProductsByCategory(categoryId);

      // Calculate actual stock quantities from inventory
      const conn = await storage.getConnection();
      try {
        for (const product of products) {
          const [rows] = await conn.execute(`
            SELECT SUM(quantity) as totalQuantity
            FROM inventory
            WHERE product_id = ? AND status = 'active'
          `, [product.id]);

          const result = (rows as any[])[0];
          product.stocksQty = result.totalQuantity ? Number(result.totalQuantity) : 0;
        }
      } finally {
        conn.release();
      }

      // Sort products with availability priority (same logic as main products endpoint)
      products.sort((a, b) => {
        // First priority: Available products (stocksQty > 0) come before out-of-stock (stocksQty = 0)
        const aInStock = (a.stocksQty || 0) > 0;
        const bInStock = (b.stocksQty || 0) > 0;

        if (aInStock && !bInStock) return -1; // a is in stock, b is not - a comes first
        if (!aInStock && bInStock) return 1;  // b is in stock, a is not - b comes first

        // If both have same stock status, sort by name (default)
        const aValue = a.name.toLowerCase();
        const bValue = b.name.toLowerCase();
        return aValue > bValue ? 1 : -1;
      });

      // Return all active products regardless of stock for public showcase
      const availableProducts = products.filter(p => p.isActive);

      res.json(availableProducts);
    } catch (error) {
      console.error("Get public category products error:", error);
      res.status(500).json({ message: "Failed to fetch category products" });
    }
  });

  // Search products for public showcase with suggestions
  app.get("/api/public/products/search", async (req, res) => {
    try {
      const { q, limit = '10' } = req.query;

      if (!q || (q as string).length < 2) {
        return res.json([]);
      }

      const searchTerm = (q as string).toLowerCase();
      const limitNum = parseInt(limit as string);

      let products = await storage.getSpices();

      // Filter and search
      const searchResults = products
        .filter(p => p.isActive && (
          p.name.toLowerCase().includes(searchTerm) ||
          (p.description && p.description.toLowerCase().includes(searchTerm))
        ))
        .slice(0, limitNum)
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          retailPrice: p.retailPrice,
          unit: p.unit
        }));

      res.json(searchResults);
    } catch (error) {
      console.error("Search public products error:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  // Order management endpoints (admin)
  app.get("/api/orders", async (req, res) => {
    try {
      console.log("Fetching orders");
      const { status, source, page = 1, limit = 50, date } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 50;
      const offset = (pageNum - 1) * limitNum;

      const conn = await storage.getConnection();
      try {
        // First, let's check if the orders table exists
        const [tableCheck] = await conn.execute("SHOW TABLES LIKE 'orders'");
        if ((tableCheck as any[]).length === 0) {
          return res.json({
            orders: [],
            pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 },
            message: "Orders table does not exist"
          });
        }

        // Build WHERE clause dynamically
        let whereClause = "";
        let queryParams: any[] = [];

        if (status && status !== 'all') {
          whereClause += whereClause ? " AND " : " WHERE ";
          whereClause += "o.status = ?";
          queryParams.push(status);
        }

        if (source && source !== 'all') {
          whereClause += whereClause ? " AND " : " WHERE ";
          whereClause += "o.order_source = ?";
          queryParams.push(source);
        }

        if (date) {
          whereClause += whereClause ? " AND " : " WHERE ";
          whereClause += "DATE(o.created_at) = ?";
          queryParams.push(date);
        }

        // Get orders with items - using a simpler query first
        const ordersQuery = `
          SELECT
            o.id,
            o.order_number,
            o.customer_name,
            o.customer_phone,
            o.customer_email,
            o.delivery_address,
            o.subtotal,
            o.delivery_fee,
            o.total_amount,
            o.status,
            o.order_source,
            o.created_at,
            o.notes,
            COALESCE(item_summary.item_count, 0) as item_count,
            COALESCE(item_summary.items_summary, '') as items_summary
          FROM orders o
          LEFT JOIN (
            SELECT
              order_id,
              COUNT(*) as item_count,
              GROUP_CONCAT(
                CONCAT(product_name, ' (', quantity, ' ', unit, ')')
                SEPARATOR ', '
              ) as items_summary
            FROM order_items
            GROUP BY order_id
          ) item_summary ON o.id = item_summary.order_id
          ${whereClause}
          ORDER BY o.created_at DESC
          LIMIT ${limitNum} OFFSET ${offset}
        `;

        console.log("Orders query:", ordersQuery);
        console.log("Query params:", queryParams);

        const [orders] = await conn.execute(ordersQuery, queryParams);

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM orders o${whereClause}`;
        const [countResult] = await conn.execute(countQuery, queryParams);
        const total = (countResult as any[])[0]?.total || 0;

        console.log("Orders found:", (orders as any[]).length);
        console.log("Total count:", total);

        res.json({
          orders,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders", error: error.message });
    }
  });

  // Get single order with details
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const orderId = req.params.id;
      console.log("Fetching order details for:", orderId);

      const conn = await storage.getConnection();
      try {
        // Get order details
        const [orderRows] = await conn.execute(`
          SELECT o.*
          FROM orders o
          WHERE o.id = ?
        `, [orderId]);

        if ((orderRows as any[]).length === 0) {
          return res.status(404).json({ message: "Order not found" });
        }

        const order = (orderRows as any[])[0];

        // Get order items with product images
        const [items] = await conn.execute(`
          SELECT
            oi.*,
            p.image_path as product_image
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
          ORDER BY oi.id
        `, [orderId]);

        res.json({
          ...order,
          items
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Get order details error:", error);
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });

  // Update order status
  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const orderId = req.params.id;
      const { status, notes } = req.body;
      console.log("Updating order status:", orderId, status);

      const conn = await storage.getConnection();
      try {
        await conn.beginTransaction();

        // Update order status
        await conn.execute(`
          UPDATE orders
          SET status = ?, notes = CONCAT(IFNULL(notes, ''), '\n', ?), delivered_at = ${status === 'delivered' ? 'NOW()' : 'delivered_at'}
          WHERE id = ?
        `, [status, `Status updated to ${status} at ${new Date().toISOString()}`, orderId]);

        // If order is being marked as delivered, automatically deduct inventory
        if (status === 'delivered') {
          console.log(`Order ${orderId} marked as delivered, starting automatic inventory deduction`);

          // Get order items
          const [orderItems] = await conn.execute(`
            SELECT oi.*, o.order_number
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.order_id = ?
          `, [orderId]);

          const items = orderItems as any[];
          console.log(`Found ${items.length} items to process for order ${orderId}`);

          // Process each order item for inventory deduction
          for (const item of items) {
            try {
              await deductInventoryForOrderItem(conn, item, orderId);
            } catch (itemError) {
              console.error(`Failed to deduct inventory for item ${item.id}:`, itemError);
              // Continue processing other items even if one fails
            }
          }
        }

        await conn.commit();
        res.json({ success: true, message: "Order status updated" });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Approve order
  app.put("/api/orders/:id/approve", async (req, res) => {
    try {
      const orderId = req.params.id;
      console.log("Approving order:", orderId);

      const conn = await storage.getConnection();
      try {
        await conn.execute(`
          UPDATE orders
          SET status = 'confirmed', approved_at = NOW()
          WHERE id = ? AND status = 'pending'
        `, [orderId]);

        res.json({ success: true, message: "Order approved successfully" });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Approve order error:", error);
      res.status(500).json({ message: "Failed to approve order" });
    }
  });

  // Test endpoint to check if orders table exists
  app.get("/api/test/orders-table", async (req, res) => {
    try {
      const conn = await storage.getConnection();
      try {
        // Check if orders table exists
        const [tables] = await conn.execute("SHOW TABLES LIKE 'orders'");

        if ((tables as any[]).length === 0) {
          return res.json({
            exists: false,
            message: "Orders table does not exist. Please run the migration script."
          });
        }

        // Check table structure
        const [columns] = await conn.execute("DESCRIBE orders");

        // Try to count orders
        const [count] = await conn.execute("SELECT COUNT(*) as total FROM orders");
        const total = (count as any[])[0].total;

        // Count delivered orders
        const [deliveredCount] = await conn.execute("SELECT COUNT(*) as total FROM orders WHERE status = 'delivered'");
        const deliveredTotal = (deliveredCount as any[])[0].total;

        // Count today's orders
        const [todayCount] = await conn.execute("SELECT COUNT(*) as total FROM orders WHERE DATE(created_at) = CURDATE()");
        const todayTotal = (todayCount as any[])[0].total;

        res.json({
          exists: true,
          columns: columns,
          totalOrders: total,
          deliveredOrders: deliveredTotal,
          todayOrders: todayTotal,
          message: `Orders table exists with ${total} total orders (${deliveredTotal} delivered, ${todayTotal} today)`
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Test orders table error:", error);
      res.status(500).json({ message: "Failed to check orders table", error: error.message });
    }
  });

  // Test endpoint to check sales data
  app.get("/api/test/sales-data", async (req, res) => {
    try {
      const conn = await storage.getConnection();
      try {
        // Check orders
        const [orders] = await conn.execute(`
          SELECT
            COUNT(*) as total_orders,
            SUM(total_amount) as total_revenue,
            MIN(created_at) as first_order,
            MAX(created_at) as last_order,
            COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_orders
          FROM orders
          WHERE status NOT IN ('cancelled')
        `);

        // Get sample orders
        const [sampleOrders] = await conn.execute(`
          SELECT id, order_number, customer_name, total_amount, status, created_at
          FROM orders
          ORDER BY created_at DESC
          LIMIT 5
        `);

        res.json({
          summary: (orders as any[])[0],
          sampleOrders: sampleOrders,
          message: "Sales data check complete"
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Sales data check error:", error);
      res.status(500).json({ message: "Failed to check sales data", error: error.message });
    }
  });

  // Setup authentication routes and middleware
  await setupAuth(app);

  // Register vendor payments router with conditional authentication
  app.use("/api", (req, res, next) => {
    // Skip authentication for public routes and uploads
    if (req.path.startsWith('/public/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    // Apply authentication for all other routes
    return isAuthenticated(req, res, next);
  }, vendorPaymentsRouter);

  // Register customer bills router
  app.use("/api/customer-bills", isAuthenticated, customerBillsRouter);

  // Debug endpoint to check if server is running
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", authenticated: req.isAuthenticated ? req.isAuthenticated() : false });
  });

  // Compatibility routes for vendors (redirecting to suppliers)
  // These routes are needed because the frontend uses /api/vendors but the backend uses /api/suppliers
  app.get("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching all vendors (redirecting to suppliers)");
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Get vendors error:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const supplier = await storage.getSupplier(parseInt(req.params.id));
      if (!supplier) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating vendor with data (redirecting to suppliers):", req.body);

      // Validate the request body
      const validatedData = insertSupplierSchema.parse(req.body);
      console.log("Validated vendor data:", validatedData);

      // Create the supplier
      const supplier = await storage.createSupplier(validatedData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Create vendor error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vendor data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vendor", error: String(error) });
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("Updating vendor with ID (redirecting to suppliers):", req.params.id, "Data:", req.body);

      // Validate the request body (partial validation)
      const partialSchema = insertSupplierSchema.partial();
      const validatedData = partialSchema.parse(req.body);
      console.log("Validated update data:", validatedData);

      // Convert creditLimit to string if it's a number
      const updateData: any = { ...validatedData };
      if (typeof updateData.creditLimit === 'number') {
        updateData.creditLimit = String(updateData.creditLimit);
      }

      const supplier = await storage.updateSupplier(parseInt(req.params.id), updateData);
      if (!supplier) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Update vendor error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vendor data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update vendor", error: String(error) });
    }
  });

  app.delete("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`Deleting vendor with ID (redirecting to suppliers): ${req.params.id}`);

      // Check if force delete is requested
      const forceDelete = req.query.force === 'true';

      if (forceDelete) {
        console.log(`Force delete requested for vendor ID: ${req.params.id}`);
      }

      // Delete the supplier
      const success = await storage.deleteSupplier(parseInt(req.params.id), forceDelete);

      if (!success) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      console.log(`Successfully deleted vendor with ID: ${req.params.id}`);
      res.status(204).send();
    } catch (error) {
      console.error("Delete vendor error:", error);
      res.status(500).json({ message: "Failed to delete vendor", error: String(error) });
    }
  });
  // Suppliers API
  app.get("/api/suppliers", isAuthenticated, async (_req, res) => {
    try {
      console.log("Fetching all suppliers");
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Get suppliers error:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  // Get purchases by supplier
  app.get("/api/suppliers/:supplierId/purchases", isAuthenticated, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      console.log(`Fetching purchases for supplier ID: ${supplierId}`);
      const purchases = await storage.getPurchasesBySupplier(supplierId);
      res.json(purchases);
    } catch (error) {
      console.error("Get purchases by supplier error:", error);
      res.status(500).json({ message: "Failed to fetch purchases by supplier" });
    }
  });

  // Get purchase history for a supplier
  app.get("/api/suppliers/:supplierId/purchase-history", isAuthenticated, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      console.log(`Fetching purchase history for supplier ID: ${supplierId}`);
      const purchaseHistory = await storage.getSupplierPurchaseHistory(supplierId);
      res.json(purchaseHistory);
    } catch (error) {
      console.error("Get supplier purchase history error:", error);
      res.status(500).json({ message: "Failed to fetch supplier purchase history" });
    }
  });

  // Get all purchase history across all suppliers
  app.get("/api/purchase-history", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching all purchase history");
      const purchaseHistory = await storage.getAllPurchaseHistory();
      res.json(purchaseHistory);
    } catch (error) {
      console.error("Get all purchase history error:", error);
      res.status(500).json({ message: "Failed to fetch purchase history" });
    }
  });

  // Get purchase history for a specific product from a supplier
  app.get("/api/suppliers/:supplierId/products/:productName/purchase-history", isAuthenticated, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      const productName = req.params.productName;
      console.log(`Fetching purchase history for supplier ID: ${supplierId} and product name: ${productName}`);
      const purchaseHistory = await storage.getProductPurchaseHistory(supplierId, productName);
      res.json(purchaseHistory);
    } catch (error) {
      console.error("Get product purchase history error:", error);
      res.status(500).json({ message: "Failed to fetch product purchase history" });
    }
  });

  app.get("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const supplier = await storage.getSupplier(parseInt(req.params.id));
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating supplier with data:", req.body);

      // Validate the request body
      const validatedData = insertSupplierSchema.parse(req.body);
      console.log("Validated supplier data:", validatedData);

      // Create the supplier
      const supplier = await storage.createSupplier(validatedData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Create supplier error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create supplier", error: String(error) });
    }
  });

  app.patch("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("Updating supplier with ID:", req.params.id, "Data:", req.body);

      // Validate the request body (partial validation)
      const partialSchema = insertSupplierSchema.partial();
      const validatedData = partialSchema.parse(req.body);
      console.log("Validated update data:", validatedData);

      // Convert creditLimit to string if it's a number
      const updateData: any = { ...validatedData };
      if (typeof updateData.creditLimit === 'number') {
        updateData.creditLimit = String(updateData.creditLimit);
      }

      const supplier = await storage.updateSupplier(parseInt(req.params.id), updateData);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Update supplier error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update supplier", error: String(error) });
    }
  });

  app.delete("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`Deleting supplier with ID: ${req.params.id}`);

      // Check if force delete is requested
      const forceDelete = req.query.force === 'true';

      if (forceDelete) {
        console.log(`Force delete requested for supplier ID: ${req.params.id}`);
      }

      // Delete the supplier
      const success = await storage.deleteSupplier(parseInt(req.params.id), forceDelete);

      if (!success) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      console.log(`Successfully deleted supplier with ID: ${req.params.id}`);
      res.status(204).send();
    } catch (error) {
      console.error("Delete supplier error:", error);
      res.status(500).json({ message: "Failed to delete supplier", error: String(error) });
    }
  });

  // Supplier image upload endpoint
  app.post("/api/suppliers/upload-image", isAuthenticated, upload.single('supplierImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Get the relative path for storage in the database
      const imagePath = `/api/uploads/suppliers/${path.basename(req.file.path)}`;
      console.log("Supplier image uploaded to:", imagePath);

      // Return the image URL
      res.json({
        url: imagePath,
        filename: path.basename(req.file.path),
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Supplier image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Categories API
  app.get("/api/categories", isAuthenticated, async (_req, res) => {
    try {
      console.log("Fetching all categories");

      // Try direct database access
      const conn = await storage.getConnection();
      try {
        // Check if the categories table exists
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'categories'`);
        if ((tables as any[]).length === 0) {
          console.log("Categories table doesn't exist, creating it...");
          await conn.execute(`
            CREATE TABLE categories (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL UNIQUE,
              description TEXT,
              image_path VARCHAR(255) DEFAULT NULL
            )
          `);
          console.log("Categories table created successfully");

          // Insert a default category
          await conn.execute(`
            INSERT INTO categories (name, description)
            VALUES ('Default', 'Default category for products')
          `);
          console.log("Default category created");

          // Return the default category
          res.json([{
            id: 1,
            name: 'Default',
            description: 'Default category for products'
          }]);
          return;
        }

        // Fetch all categories
        const [rows] = await conn.execute(`SELECT * FROM categories`);
        console.log("Retrieved categories:", rows);

        // Map database fields to camelCase for the client
        const categories = (rows as any[]).map(category => {
          return {
            id: category.id,
            name: category.name,
            description: category.description,
            imagePath: category.image_path
          };
        });

        res.json(categories);
      } catch (directDbError) {
        console.error("Direct database access error:", directDbError);
        throw directDbError;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Get categories error:", error);
      if (error instanceof Error) {
        res.status(500).json({
          message: "Failed to fetch categories",
          error: error.message,
          details: String(error)
        });
      } else {
        res.status(500).json({ message: "Failed to fetch categories", error: String(error) });
      }
    }
  });

  app.get("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.getCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating category with data:", req.body);
      console.log("Authentication status:", req.isAuthenticated ? req.isAuthenticated() : false);

      // Validate the request body
      if (!req.body || !req.body.name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      // Create the category
      const categoryData = {
        name: req.body.name,
        description: req.body.description || null,
        imagePath: req.body.imagePath || null
      };

      // Try direct database insertion
      console.log("Attempting direct database insertion for category...");
      const conn = await storage.getConnection();
      try {
        // Check if the categories table exists
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'categories'`);
        if ((tables as any[]).length === 0) {
          console.log("Categories table doesn't exist, creating it...");
          await conn.execute(`
            CREATE TABLE categories (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL UNIQUE,
              description TEXT,
              image_path VARCHAR(255) DEFAULT NULL
            )
          `);
          console.log("Categories table created successfully");
        }

        const [result] = await conn.execute(`
          INSERT INTO categories (name, description, image_path)
          VALUES (?, ?, ?)
        `, [
          categoryData.name,
          categoryData.description,
          categoryData.imagePath
        ]);

        const insertId = (result as any).insertId;
        const [rows] = await conn.execute(`SELECT * FROM categories WHERE id = ?`, [insertId]);
        const dbCategory = (rows as any[])[0];

        // Map database fields to camelCase for the client
        const newCategory = {
          id: dbCategory.id,
          name: dbCategory.name,
          description: dbCategory.description,
          imagePath: dbCategory.image_path
        };

        console.log("Category created successfully via direct DB insertion:", newCategory);
        res.status(201).json(newCategory);
      } catch (directDbError) {
        console.error("Direct database insertion error:", directDbError);
        throw directDbError; // Re-throw for the outer catch block
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Create category error:", error);
      if (error instanceof Error) {
        res.status(500).json({
          message: "Failed to create category",
          error: error.message,
          details: String(error),
          stack: error.stack
        });
      } else {
        res.status(500).json({ message: "Failed to create category", error: String(error) });
      }
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Deleting category with ID: ${id}`);

      // Check if category has associated spices
      const spices = await storage.getSpicesByCategory(id);
      if (spices.length > 0) {
        return res.status(400).json({
          message: "Cannot delete category that has products. Please reassign or delete the products first.",
          spiceCount: spices.length
        });
      }

      // Delete the category
      const conn = await storage.getConnection();
      try {
        const [result] = await conn.execute(`DELETE FROM categories WHERE id = ?`, [id]);
        const success = (result as any).affectedRows > 0;

        if (!success) {
          return res.status(404).json({ message: "Category not found" });
        }

        res.status(204).send();
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category", error: String(error) });
    }
  });

  // Products API
  app.get("/api/products", isAuthenticated, async (_req, res) => {
    try {
      console.log("Fetching all products");
      const products = await storage.getSpices();

      // Calculate actual stock quantities from inventory
      const conn = await storage.getConnection();
      try {
        for (const product of products) {
          // Get the sum of quantities from active inventory items for this product
          const [rows] = await conn.execute(`
            SELECT SUM(quantity) as totalQuantity
            FROM inventory
            WHERE product_id = ? AND status = 'active'
          `, [product.id]);

          const result = (rows as any[])[0];
          // Update the stocksQty with the actual inventory quantity or 0 if null
          product.stocksQty = result.totalQuantity ? Number(result.totalQuantity) : 0;
        }
      } finally {
        conn.release();
      }

      // Sort products with availability priority (available first, then by name)
      products.sort((a, b) => {
        const aInStock = (a.stocksQty || 0) > 0;
        const bInStock = (b.stocksQty || 0) > 0;

        if (aInStock && !bInStock) return -1;
        if (!aInStock && bInStock) return 1;

        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      console.log("Fetched all products:", products.map(p => ({ id: p.id, name: p.name, stocksQty: p.stocksQty })));
      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });



  // Debug endpoint to get product IDs
  app.get("/api/products/debug/ids", isAuthenticated, async (_req, res) => {
    try {
      const products = await storage.getSpices();
      const productIds = products.map(p => ({
        id: p.id,
        name: p.name,
        marketPrice: p.marketPrice,
        retailPrice: p.retailPrice,
        catererPrice: p.catererPrice
      }));
      res.json(productIds);
    } catch (error) {
      console.error("Get product IDs error:", error);
      res.status(500).json({ message: "Failed to fetch product IDs" });
    }
  });

  app.get("/api/categories/:categoryId/products", isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      console.log(`Fetching products for category ID: ${categoryId}`);
      const products = await storage.getSpicesByCategory(categoryId);
      res.json(products);
    } catch (error) {
      console.error("Get products by category error:", error);
      res.status(500).json({ message: "Failed to fetch products by category" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getSpice(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Calculate actual stock quantity from inventory
      const conn = await storage.getConnection();
      try {
        // Get the sum of quantities from active inventory items for this product
        const [rows] = await conn.execute(`
          SELECT SUM(quantity) as totalQuantity
          FROM inventory
          WHERE product_id = ? AND status = 'active'
        `, [product.id]);

        const result = (rows as any[])[0];
        // Update the stocksQty with the actual inventory quantity or 0 if null
        product.stocksQty = result.totalQuantity ? Number(result.totalQuantity) : 0;
      } finally {
        conn.release();
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Get average price for a product from inventory
  app.get("/api/products/:name/average-price", isAuthenticated, async (req, res) => {
    try {
      const productName = req.params.name;
      console.log(`Fetching average price for product: ${productName}`);

      const avgPrice = await storage.getProductAveragePrice(productName);

      if (avgPrice === null) {
        return res.status(404).json({
          message: "No price data available for this product",
          productName
        });
      }

      res.json({
        productName,
        averagePrice: avgPrice
      });
    } catch (error) {
      console.error("Get product average price error:", error);
      res.status(500).json({ message: "Failed to fetch product average price" });
    }
  });

  // Product image upload endpoint
  app.post("/api/products/upload-image", isAuthenticated, upload.single('productImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Get the relative path for storage in the database
      const imagePath = `/api/uploads/spices/${path.basename(req.file.path)}`;
      console.log("Product image uploaded to:", imagePath);

      // Return the image URL
      res.json({
        url: imagePath,
        filename: path.basename(req.file.path),
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Product image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Category image upload endpoint
  app.post("/api/categories/upload-image", isAuthenticated, upload.single('categoryImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Get the relative path for storage in the database
      const imagePath = `/api/uploads/categories/${path.basename(req.file.path)}`;
      console.log("Category image uploaded to:", imagePath);

      // Return the image URL
      res.json({
        url: imagePath,
        filename: path.basename(req.file.path),
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Category image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.post("/api/products", isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      console.log("Creating product with data:", req.body);
      console.log("Authentication status:", req.isAuthenticated ? req.isAuthenticated() : false);

      // Get the uploaded file path if it exists
      let imagePath = null;
      if (req.file) {
        // Get the relative path for storage in the database
        imagePath = `/uploads/spices/${path.basename(req.file.path)}`;
        console.log("Image uploaded to:", imagePath);
      }

      // Process and validate form data
      // Convert string values to appropriate types
      const processedData = {
        name: req.body.name,
        categoryId: req.body.categoryId ? parseInt(req.body.categoryId) : 1, // Default to category 1
        origin: req.body.origin || '',
        description: req.body.description || '',
        price: req.body.price ? parseFloat(req.body.price) : 0,
        marketPrice: req.body.marketPrice ? parseFloat(req.body.marketPrice) : 0,
        retailPrice: req.body.retailPrice ? parseFloat(req.body.retailPrice) : 0,
        catererPrice: req.body.catererPrice ? parseFloat(req.body.catererPrice) : 0,
        unit: req.body.unit || 'kg',
        stocksQty: req.body.stocksQty ? parseInt(req.body.stocksQty) : 0,
        isActive: req.body.isActive === 'true' || req.body.isActive === true || req.body.isActive === 1,
        imagePath: imagePath
      };

      console.log("Processed product data:", JSON.stringify(processedData, null, 2));

      // Validate required fields
      if (!processedData.name) {
        console.error("Product name is missing");
        return res.status(400).json({ message: "Product name is required" });
      }

      // Try direct database insertion
      console.log("Attempting direct database insertion...");
      const conn = await storage.getConnection();
      try {
        const [result] = await conn.execute(`
          INSERT INTO products (name, category_id, origin, description, price, market_price, retail_price, caterer_price, unit, stocks_qty, is_active, image_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          processedData.name,
          processedData.categoryId,
          processedData.origin,
          processedData.description,
          processedData.price,
          processedData.marketPrice,
          processedData.retailPrice,
          processedData.catererPrice,
          processedData.unit,
          processedData.stocksQty,
          processedData.isActive ? 1 : 0,
          processedData.imagePath
        ]);

        const insertId = (result as any).insertId;
        const [rows] = await conn.execute(`SELECT * FROM products WHERE id = ?`, [insertId]);
        const dbProduct = (rows as any[])[0];

        // Map database fields to camelCase for the client
        const newProduct = {
          id: dbProduct.id,
          name: dbProduct.name,
          categoryId: dbProduct.category_id,
          origin: dbProduct.origin,
          description: dbProduct.description,
          price: dbProduct.price,
          marketPrice: dbProduct.market_price,
          retailPrice: dbProduct.retail_price,
          catererPrice: dbProduct.caterer_price,
          unit: dbProduct.unit,
          stocksQty: dbProduct.stocks_qty,
          isActive: dbProduct.is_active === 1,
          imagePath: dbProduct.image_path
        };

        console.log("Product created successfully via direct DB insertion:", newProduct);
        res.status(201).json(newProduct);
      } catch (directDbError) {
        console.error("Direct database insertion error:", directDbError);
        throw directDbError; // Re-throw for the outer catch block
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Create product error:", error);
      // Provide more specific error messages based on the error
      if (error instanceof Error) {
        res.status(500).json({
          message: "Failed to create product",
          error: error.message,
          details: String(error),
          stack: error.stack
        });
      } else {
        res.status(500).json({ message: "Failed to create product", error: String(error) });
      }
    }
  });

  app.patch("/api/products/:id", isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Updating product with ID: ${id}, Data:`, req.body);

      // Get the uploaded file path if it exists
      let imagePath = undefined;
      if (req.file) {
        // Get the relative path for storage in the database
        imagePath = `/uploads/spices/${path.basename(req.file.path)}`;
        console.log("Image updated to:", imagePath);
      }

      // Combine form data with image path if a new image was uploaded
      const productData = {
        ...req.body,
        ...(imagePath && { imagePath })
      };

      // Convert price fields to numbers if they're strings
      if (productData.marketPrice !== undefined) {
        productData.marketPrice = Number(productData.marketPrice);
      }
      if (productData.retailPrice !== undefined) {
        productData.retailPrice = Number(productData.retailPrice);
      }
      if (productData.catererPrice !== undefined) {
        productData.catererPrice = Number(productData.catererPrice);
      }

      console.log("Processed product data:", productData);

      const product = await storage.updateSpice(id, productData);
      if (!product) {
        console.log(`Product with ID ${id} not found`);
        return res.status(404).json({ message: "Product not found" });
      }
      console.log("Product updated successfully:", product);
      res.json(product);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteSpice(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Deduct stock from product inventory (for customer sales)
  app.post("/api/products/:id/deduct-stock", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { quantity, reason } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: "Valid quantity is required" });
      }

      const conn = await storage.getConnection();
      try {
        await conn.beginTransaction();

        // Get current product stock
        const [productRows] = await conn.execute(
          `SELECT stocks_qty FROM products WHERE id = ?`,
          [productId]
        );

        if ((productRows as any[]).length === 0) {
          await conn.rollback();
          return res.status(404).json({ message: "Product not found" });
        }

        const currentStock = Number((productRows as any[])[0].stocks_qty);

        if (currentStock < quantity) {
          await conn.rollback();
          return res.status(400).json({
            message: "Insufficient stock",
            currentStock,
            requestedQuantity: quantity
          });
        }

        // Update product stock
        const newStock = currentStock - quantity;
        await conn.execute(
          `UPDATE products SET stocks_qty = ? WHERE id = ?`,
          [newStock, productId]
        );

        // Create inventory history entry (check if table exists first)
        const [historyTables] = await conn.execute(`SHOW TABLES LIKE 'inventory_history'`);
        if ((historyTables as any[]).length === 0) {
          console.log("Inventory history table doesn't exist, creating it...");
          await conn.execute(`
            CREATE TABLE inventory_history (
              id INT AUTO_INCREMENT PRIMARY KEY,
              product_id INT NOT NULL,
              change_type VARCHAR(50) NOT NULL,
              quantity_change DECIMAL(10,3) NOT NULL,
              reason TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (product_id) REFERENCES products(id)
            )
          `);
        } else {
          // Check if the table has the correct column name
          const [columns] = await conn.execute(`SHOW COLUMNS FROM inventory_history LIKE 'quantity_change%'`);
          if ((columns as any[]).length === 0) {
            // Table exists but might have wrong column name, let's check and fix
            const [oldColumns] = await conn.execute(`SHOW COLUMNS FROM inventory_history LIKE 'quantity_changed'`);
            if ((oldColumns as any[]).length > 0) {
              console.log("Renaming quantity_changed to quantity_change in inventory_history table...");
              await conn.execute(`ALTER TABLE inventory_history CHANGE quantity_changed quantity_change DECIMAL(10,3) NOT NULL`);
            } else {
              // Add the column if it doesn't exist
              console.log("Adding quantity_change column to inventory_history table...");
              await conn.execute(`ALTER TABLE inventory_history ADD COLUMN quantity_change DECIMAL(10,3) NOT NULL`);
            }
          }
        }

        await conn.execute(
          `INSERT INTO inventory_history (product_id, change_type, quantity_change, reason, created_at)
           VALUES (?, 'deduction', ?, ?, NOW())`,
          [productId, quantity, reason || 'Customer sale']
        );

        await conn.commit();

        res.json({
          message: "Stock deducted successfully",
          previousStock: currentStock,
          newStock: newStock,
          quantityDeducted: quantity
        });

      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Deduct stock error:", error);
      res.status(500).json({ message: "Failed to deduct stock" });
    }
  });

  // Update product market price
  app.patch("/api/products/:id/market-price", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { marketPrice } = req.body;

      if (marketPrice === undefined) {
        return res.status(400).json({ message: "Market price is required" });
      }

      const parsedMarketPrice = parseFloat(marketPrice);
      if (isNaN(parsedMarketPrice)) {
        return res.status(400).json({ message: "Invalid market price value" });
      }

      const product = await storage.updateSpice(id, { marketPrice: parsedMarketPrice });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Update market price error:", error);
      res.status(500).json({ message: "Failed to update market price" });
    }
  });

  // Inventory API
  app.get("/api/inventory", isAuthenticated, async (_req, res) => {
    try {
      console.log("Fetching all inventory items");
      const inventory = await storage.getInventory();
      res.json(inventory);
    } catch (error) {
      console.error("Get inventory error:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Inventory validation endpoint
  app.post("/api/inventory/validate", isAuthenticated, async (req, res) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Items array is required" });
      }

      const conn = await storage.getConnection();
      try {
        const validationResults = [];

        for (const item of items) {
          const { productId, batchIds, quantities } = item;
          const batchValidations = [];

          for (let i = 0; i < batchIds.length; i++) {
            const batchId = batchIds[i];
            const requiredQuantity = quantities[i];

            // Check batch availability
            const [batchRows] = await conn.execute(
              `SELECT quantity FROM inventory WHERE id = ? AND status = 'active'`,
              [batchId]
            );

            if ((batchRows as any[]).length === 0) {
              batchValidations.push({
                batchId,
                isValid: false,
                availableQuantity: 0,
                requiredQuantity,
                error: `Batch ${batchId} not found or inactive`
              });
            } else {
              const availableQuantity = (batchRows as any[])[0].quantity;
              const isValid = availableQuantity >= requiredQuantity;

              batchValidations.push({
                batchId,
                isValid,
                availableQuantity,
                requiredQuantity,
                error: isValid ? undefined : `Insufficient quantity. Available: ${availableQuantity}, Required: ${requiredQuantity}`
              });
            }
          }

          const isProductValid = batchValidations.every(batch => batch.isValid);
          validationResults.push({
            productId,
            isValid: isProductValid,
            batchValidations
          });
        }

        const isOverallValid = validationResults.every(result => result.isValid);

        res.json({
          isValid: isOverallValid,
          validationResults
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Inventory validation error:", error);
      res.status(500).json({ message: "Failed to validate inventory" });
    }
  });

  // Inventory analytics API
  app.get("/api/inventory/analytics", isAuthenticated, async (_req, res) => {
    try {
      console.log("Fetching inventory analytics");
      const analytics = await storage.getInventoryAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Get inventory analytics error:", error);
      res.status(500).json({ message: "Failed to fetch inventory analytics" });
    }
  });

  // Dashboard stats API
  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try {
      console.log("Fetching dashboard stats");
      const conn = await storage.getConnection();

      try {
        // Get total inventory value
        const [totalValueResult] = await conn.execute(`
          SELECT SUM(i.quantity * i.unit_price) as totalValue
          FROM inventory i
          WHERE i.status = 'active'
        `);

        // Get active spice types count (products that have inventory entries with quantity > 0)
        const [activeSpicesResult] = await conn.execute(`
          SELECT COUNT(DISTINCT p.id) as activeSpices
          FROM products p
          JOIN inventory i ON p.id = i.product_id
          WHERE i.status = 'active' AND CAST(i.quantity AS DECIMAL(10,2)) > 0
        `);

        // Debug: Get the actual list of active products
        const [debugActiveProducts] = await conn.execute(`
          SELECT DISTINCT p.id, p.name, i.quantity
          FROM products p
          JOIN inventory i ON p.id = i.product_id
          WHERE i.status = 'active' AND CAST(i.quantity AS DECIMAL(10,2)) > 0
          ORDER BY p.name
        `);
        console.log('Active products with inventory:', debugActiveProducts);

        // Get pending orders count (from orders table)
        const [pendingOrdersResult] = await conn.execute(`
          SELECT COUNT(*) as pendingOrders
          FROM orders o
          WHERE o.status IN ('pending', 'confirmed', 'processing', 'out_for_delivery')
        `);

        // Debug: Get the actual pending orders
        const [debugPendingOrders] = await conn.execute(`
          SELECT o.id, o.order_number, o.status, o.customer_name, o.created_at
          FROM orders o
          WHERE o.status IN ('pending', 'confirmed', 'processing', 'out_for_delivery')
          ORDER BY o.created_at DESC
        `);
        console.log('Pending orders:', debugPendingOrders);

        // Get low stock alerts count (inventory items with quantity <= 10 + out of stock products)
        const [lowStockInventoryResult] = await conn.execute(`
          SELECT COUNT(*) as lowStockFromInventory
          FROM inventory i
          WHERE i.status = 'active' AND i.quantity <= 10
        `);

        const [outOfStockProductsResult] = await conn.execute(`
          SELECT COUNT(*) as outOfStockProducts
          FROM products p
          WHERE p.is_active = 1
            AND p.id NOT IN (
              SELECT DISTINCT product_id
              FROM inventory
              WHERE status = 'active' AND quantity > 0
            )
        `);

        const lowStockAlerts = Number((lowStockInventoryResult as any[])[0]?.lowStockFromInventory || 0) +
                              Number((outOfStockProductsResult as any[])[0]?.outOfStockProducts || 0);

        // Get historical data for comparison (30 days ago)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // Historical total value (approximate - using current prices with historical quantities)
        const [historicalValueResult] = await conn.execute(`
          SELECT SUM(i.quantity * i.unit_price) as totalValue
          FROM inventory i
          WHERE i.status = 'active' AND DATE(i.purchase_date) <= ?
        `, [thirtyDaysAgoStr]);

        // Historical active spices count
        const [historicalSpicesResult] = await conn.execute(`
          SELECT COUNT(DISTINCT p.id) as activeSpices
          FROM products p
          JOIN inventory i ON p.id = i.product_id
          WHERE i.status = 'active' AND DATE(i.purchase_date) <= ?
        `, [thirtyDaysAgoStr]);

        // Historical pending orders (orders from 30 days ago)
        const [historicalPendingResult] = await conn.execute(`
          SELECT COUNT(*) as pendingOrders
          FROM orders o
          WHERE o.status IN ('pending', 'confirmed', 'processing', 'out_for_delivery')
            AND DATE(o.created_at) <= ?
        `, [thirtyDaysAgoStr]);

        // Calculate current values
        const currentStats = {
          totalValue: Number((totalValueResult as any[])[0]?.totalValue || 0),
          activeSpices: Number((activeSpicesResult as any[])[0]?.activeSpices || 0),
          pendingInvoices: Number((pendingOrdersResult as any[])[0]?.pendingOrders || 0),
          lowStockAlerts: lowStockAlerts
        };

        // Calculate historical values
        const historicalStats = {
          totalValue: Number((historicalValueResult as any[])[0]?.totalValue || 0),
          activeSpices: Number((historicalSpicesResult as any[])[0]?.activeSpices || 0),
          pendingInvoices: Number((historicalPendingResult as any[])[0]?.pendingOrders || 0)
        };

        // Calculate percentage changes
        const calculateChange = (current: number, historical: number) => {
          if (historical === 0) return current > 0 ? 100 : 0;
          return ((current - historical) / historical) * 100;
        };

        const stats = {
          ...currentStats,
          changes: {
            totalValueChange: calculateChange(currentStats.totalValue, historicalStats.totalValue),
            activeSpicesChange: calculateChange(currentStats.activeSpices, historicalStats.activeSpices),
            pendingInvoicesChange: calculateChange(currentStats.pendingInvoices, historicalStats.pendingInvoices),
            lowStockAlertsChange: 0 // No historical comparison for alerts
          }
        };

        console.log("Dashboard stats:", stats);
        res.json(stats);
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Daily profit endpoint
  app.get("/api/dashboard/daily-profit", async (req, res) => {
    try {
      const conn = await storage.getConnection();
      try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        console.log("Calculating daily profit for:", today);

        // First, check if orders table exists
        const [tableCheck] = await conn.execute("SHOW TABLES LIKE 'orders'");
        if ((tableCheck as any[]).length === 0) {
          return res.json({
            totalProfit: 0,
            totalRevenue: 0,
            totalCost: 0,
            ordersDelivered: 0,
            itemsSold: 0,
            profitMargin: 0,
            previousDayProfit: 0,
            profitChange: 0,
            profitChangePercentage: 0,
            message: "Orders table does not exist"
          });
        }

        // Get today's showcase orders (all statuses) with profit calculation
        const [todayShowcaseOrders] = await conn.execute(`
          SELECT
            o.id,
            o.order_number,
            o.status,
            o.total_amount as revenue,
            o.created_at,
            o.order_source,
            SUM(oi.quantity * COALESCE(oi.unit_price * 0.6, 100)) as estimated_cost,
            SUM(oi.quantity) as total_quantity
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE DATE(o.created_at) = ?
            AND o.order_source = 'showcase'
            AND o.status NOT IN ('cancelled')
          GROUP BY o.id
        `, [today]);

        console.log("Today's showcase orders:", (todayShowcaseOrders as any[]).length);

        // If no showcase orders today, get all today's orders
        let ordersToUse = todayShowcaseOrders as any[];
        if (ordersToUse.length === 0) {
          console.log("No showcase orders today, checking all today's orders...");

          const [todayAllOrders] = await conn.execute(`
            SELECT
              o.id,
              o.order_number,
              o.status,
              o.total_amount as revenue,
              o.created_at,
              o.order_source,
              SUM(oi.quantity * COALESCE(oi.unit_price * 0.6, 100)) as estimated_cost,
              SUM(oi.quantity) as total_quantity
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE DATE(o.created_at) = ?
              AND o.status NOT IN ('cancelled')
            GROUP BY o.id
          `, [today]);

          ordersToUse = todayAllOrders as any[];
          console.log("Today's all orders:", ordersToUse.length);
        }

        // Get yesterday's profit for comparison (showcase orders)
        const [yesterdayOrders] = await conn.execute(`
          SELECT
            COALESCE(SUM(o.total_amount), 0) as total_revenue,
            COALESCE(SUM(oi.quantity * COALESCE(oi.unit_price * 0.6, 100)), 0) as total_cost
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE DATE(o.created_at) = ?
            AND o.order_source = 'showcase'
            AND o.status NOT IN ('cancelled')
        `, [yesterday]);

        // Calculate today's metrics
        const totalRevenue = ordersToUse.reduce((sum, order) => sum + parseFloat(order.revenue || 0), 0);
        const totalCost = ordersToUse.reduce((sum, order) => sum + parseFloat(order.estimated_cost || 0), 0);
        const totalProfit = totalRevenue - totalCost;
        const ordersProcessed = ordersToUse.length; // Changed from ordersDelivered to ordersProcessed
        const itemsSold = ordersToUse.reduce((sum, order) => sum + parseFloat(order.total_quantity || 0), 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // Yesterday's profit
        const yesterdayData = (yesterdayOrders as any[])[0];
        const previousDayRevenue = parseFloat(yesterdayData?.total_revenue || 0);
        const previousDayCost = parseFloat(yesterdayData?.total_cost || 0);
        const previousDayProfit = previousDayRevenue - previousDayCost;

        const profitChange = totalProfit - previousDayProfit;
        const profitChangePercentage = previousDayProfit > 0 ? (profitChange / previousDayProfit) * 100 : 0;

        console.log("Profit calculation:", {
          totalRevenue,
          totalCost,
          totalProfit,
          ordersProcessed,
          itemsSold,
          profitMargin,
          previousDayProfit
        });

        res.json({
          totalProfit,
          totalRevenue,
          totalCost,
          ordersDelivered: ordersProcessed, // Keep the same field name for frontend compatibility
          itemsSold,
          profitMargin,
          previousDayProfit,
          profitChange,
          profitChangePercentage
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Daily profit error:", error);
      res.status(500).json({
        message: "Failed to fetch daily profit data",
        error: error.message,
        totalProfit: 0,
        totalRevenue: 0,
        totalCost: 0,
        ordersDelivered: 0,
        itemsSold: 0,
        profitMargin: 0,
        previousDayProfit: 0,
        profitChange: 0,
        profitChangePercentage: 0
      });
    }
  });

  // Sales trends endpoint for dashboard chart
  app.get("/api/dashboard/sales-trends", async (req, res) => {
    try {
      const { timeRange = 'daily' } = req.query;
      console.log("Fetching sales trends for:", timeRange);

      const conn = await storage.getConnection();

      try {
        let salesData = [];

        // Check if orders table exists
        const [tableCheck] = await conn.execute("SHOW TABLES LIKE 'orders'");
        if ((tableCheck as any[]).length === 0) {
          console.log("Orders table does not exist");
          return res.json([]);
        }

        // First, let's check what orders we have
        const [allOrders] = await conn.execute(`
          SELECT COUNT(*) as total,
                 SUM(total_amount) as total_revenue,
                 MIN(created_at) as earliest_order,
                 MAX(created_at) as latest_order
          FROM orders
          WHERE status NOT IN ('cancelled')
        `);

        const orderStats = (allOrders as any[])[0];
        console.log("Order statistics:", orderStats);

        switch (timeRange) {
          case 'daily':
            // Get hourly data for today, but if no data today, get recent data
            let [dailyData] = await conn.execute(`
              SELECT
                hour_val as hour_num,
                CONCAT(hour_val, ':00') as period,
                COALESCE(SUM(o.total_amount), 0) as revenue,
                COUNT(o.id) as orders,
                COALESCE(SUM(o.total_amount * 0.4), 0) as profit,
                CURDATE() as date
              FROM (
                SELECT HOUR(created_at) as hour_val, total_amount, id
                FROM orders
                WHERE DATE(created_at) = CURDATE()
                  AND status NOT IN ('cancelled')
              ) o
              GROUP BY hour_val
              ORDER BY hour_val
            `);

            console.log("Today's hourly data:", (dailyData as any[]).length, "hours with data");

            // If no data today, show existing orders distributed across hours
            if ((dailyData as any[]).length === 0) {
              console.log("No data for today, showing existing orders...");
              [dailyData] = await conn.execute(`
                SELECT
                  hour_val as hour_num,
                  CONCAT(hour_val, ':00') as period,
                  COALESCE(SUM(o.total_amount), 0) as revenue,
                  COUNT(o.id) as orders,
                  COALESCE(SUM(o.total_amount * 0.4), 0) as profit,
                  CURDATE() as date
                FROM (
                  SELECT HOUR(created_at) as hour_val, total_amount, id
                  FROM orders
                  WHERE status NOT IN ('cancelled')
                ) o
                GROUP BY hour_val
                ORDER BY hour_val
                LIMIT 24
              `);
            }

            // Fill in missing hours with zero values
            const hours = Array.from({ length: 24 }, (_, i) => i);
            salesData = hours.map(hour => {
              const existingData = (dailyData as any[]).find(d => d.hour_num === hour);
              return {
                period: `${hour.toString().padStart(2, '0')}:00`,
                revenue: existingData ? parseFloat(existingData.revenue) : 0,
                orders: existingData ? parseInt(existingData.orders) : 0,
                profit: existingData ? parseFloat(existingData.profit) : 0,
                date: new Date().toISOString().split('T')[0]
              };
            });
            break;

          case 'weekly':
            // Get daily data for last 7 days, or all available data if less
            let [weeklyData] = await conn.execute(`
              SELECT
                date_val as date,
                DAYNAME(date_val) as period,
                COALESCE(SUM(o.total_amount), 0) as revenue,
                COUNT(o.id) as orders,
                COALESCE(SUM(o.total_amount * 0.4), 0) as profit
              FROM (
                SELECT DATE(created_at) as date_val, total_amount, id
                FROM orders
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                  AND status NOT IN ('cancelled')
              ) o
              GROUP BY date_val
              ORDER BY date_val
            `);

            // If no data in last 7 days, get all available data
            if ((weeklyData as any[]).length === 0) {
              [weeklyData] = await conn.execute(`
                SELECT
                  date_val as date,
                  DAYNAME(date_val) as period,
                  COALESCE(SUM(o.total_amount), 0) as revenue,
                  COUNT(o.id) as orders,
                  COALESCE(SUM(o.total_amount * 0.4), 0) as profit
                FROM (
                  SELECT DATE(created_at) as date_val, total_amount, id
                  FROM orders
                  WHERE status NOT IN ('cancelled')
                ) o
                GROUP BY date_val
                ORDER BY date_val DESC
                LIMIT 7
              `);
            }

            salesData = weeklyData as any[];
            console.log("Weekly data:", salesData.length, "days");
            break;

          case 'monthly':
            // Get daily data for last 30 days, or all available data
            let [monthlyData] = await conn.execute(`
              SELECT
                date_val as date,
                DATE_FORMAT(date_val, '%b %d') as period,
                COALESCE(SUM(o.total_amount), 0) as revenue,
                COUNT(o.id) as orders,
                COALESCE(SUM(o.total_amount * 0.4), 0) as profit
              FROM (
                SELECT DATE(created_at) as date_val, total_amount, id
                FROM orders
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                  AND status NOT IN ('cancelled')
              ) o
              GROUP BY date_val
              ORDER BY date_val
            `);

            // If no data in last 30 days, get all available data
            if ((monthlyData as any[]).length === 0) {
              [monthlyData] = await conn.execute(`
                SELECT
                  date_val as date,
                  DATE_FORMAT(date_val, '%b %d') as period,
                  COALESCE(SUM(o.total_amount), 0) as revenue,
                  COUNT(o.id) as orders,
                  COALESCE(SUM(o.total_amount * 0.4), 0) as profit
                FROM (
                  SELECT DATE(created_at) as date_val, total_amount, id
                  FROM orders
                  WHERE status NOT IN ('cancelled')
                ) o
                GROUP BY date_val
                ORDER BY date_val DESC
                LIMIT 30
              `);
            }

            salesData = monthlyData as any[];
            console.log("Monthly data:", salesData.length, "days");
            break;

          case 'yearly':
            // Get monthly data for last 12 months, or all available data
            let [yearlyData] = await conn.execute(`
              SELECT
                month_val as date,
                DATE_FORMAT(STR_TO_DATE(CONCAT(month_val, '-01'), '%Y-%m-%d'), '%b %Y') as period,
                COALESCE(SUM(o.total_amount), 0) as revenue,
                COUNT(o.id) as orders,
                COALESCE(SUM(o.total_amount * 0.4), 0) as profit
              FROM (
                SELECT DATE_FORMAT(created_at, '%Y-%m') as month_val, total_amount, id
                FROM orders
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                  AND status NOT IN ('cancelled')
              ) o
              GROUP BY month_val
              ORDER BY month_val
            `);

            // If no data in last 12 months, get all available data
            if ((yearlyData as any[]).length === 0) {
              [yearlyData] = await conn.execute(`
                SELECT
                  month_val as date,
                  DATE_FORMAT(STR_TO_DATE(CONCAT(month_val, '-01'), '%Y-%m-%d'), '%b %Y') as period,
                  COALESCE(SUM(o.total_amount), 0) as revenue,
                  COUNT(o.id) as orders,
                  COALESCE(SUM(o.total_amount * 0.4), 0) as profit
                FROM (
                  SELECT DATE_FORMAT(created_at, '%Y-%m') as month_val, total_amount, id
                  FROM orders
                  WHERE status NOT IN ('cancelled')
                ) o
                GROUP BY month_val
                ORDER BY month_val DESC
                LIMIT 12
              `);
            }

            salesData = yearlyData as any[];
            console.log("Yearly data:", salesData.length, "months");
            break;

          default:
            salesData = [];
        }

        // Convert to proper format
        const formattedData = salesData.map(item => ({
          period: item.period,
          revenue: parseFloat(item.revenue || 0),
          orders: parseInt(item.orders || 0),
          profit: parseFloat(item.profit || 0),
          date: item.date
        }));

        console.log(`Sales trends (${timeRange}):`, formattedData.length, 'data points');
        res.json(formattedData);

      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Sales trends error:", error);
      res.status(500).json({ message: "Failed to fetch sales trends" });
    }
  });

  // Supplier payment endpoints
  app.post("/api/vendors/:vendorId/payment", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.vendorId);
      const { amount, paymentDate, paymentMethod, referenceNo, notes } = req.body;

      if (!vendorId || !amount || !paymentDate || !paymentMethod) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const conn = await storage.getConnection();
      try {
        await conn.beginTransaction();

        // Insert payment record
        const [paymentResult] = await conn.execute(`
          INSERT INTO vendor_payments (
            vendor_id, amount, payment_date, payment_method,
            reference_no, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [vendorId, amount, paymentDate, paymentMethod, referenceNo || null, notes || null]);

        // Update vendor balance
        await conn.execute(`
          UPDATE vendors
          SET balance_due = GREATEST(0, COALESCE(balance_due, 0) - ?)
          WHERE id = ?
        `, [amount, vendorId]);

        await conn.commit();

        res.json({
          success: true,
          paymentId: (paymentResult as any).insertId,
          message: "Payment recorded successfully"
        });

      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Supplier payment error:", error);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  app.get("/api/vendors/:vendorId/payments", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.vendorId);
      const conn = await storage.getConnection();

      try {
        const [payments] = await conn.execute(`
          SELECT
            vp.*,
            v.name as vendor_name
          FROM vendor_payments vp
          JOIN vendors v ON vp.vendor_id = v.id
          WHERE vp.vendor_id = ?
          ORDER BY vp.payment_date DESC, vp.created_at DESC
        `, [vendorId]);

        res.json(payments);
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Fetch vendor payments error:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Reports API endpoints
  app.get("/api/reports/inventory-trends", isAuthenticated, async (req, res) => {
    try {
      const { timeRange = 'year' } = req.query;
      const conn = await storage.getConnection();

      try {
        let dateFilter = '';
        let groupBy = '';

        switch (timeRange) {
          case 'month':
            dateFilter = 'WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)';
            groupBy = 'DATE_FORMAT(purchase_date, "%Y-%m-%d")';
            break;
          case 'quarter':
            dateFilter = 'WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)';
            groupBy = 'DATE_FORMAT(purchase_date, "%Y-%m")';
            break;
          case 'year':
          default:
            dateFilter = 'WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)';
            groupBy = 'DATE_FORMAT(purchase_date, "%Y-%m")';
            break;
        }

        const [trends] = await conn.execute(`
          SELECT
            ${groupBy} as period,
            SUM(quantity * unit_price) as value,
            SUM(quantity) as quantity,
            COUNT(*) as transactions
          FROM inventory
          ${dateFilter}
          GROUP BY ${groupBy}
          ORDER BY period ASC
        `);

        res.json(trends);
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Get inventory trends error:", error);
      res.status(500).json({ message: "Failed to fetch inventory trends" });
    }
  });

  app.get("/api/reports/category-performance", isAuthenticated, async (_req, res) => {
    try {
      const conn = await storage.getConnection();

      try {
        const [performance] = await conn.execute(`
          SELECT
            c.name as category,
            COUNT(p.id) as productCount,
            SUM(p.stocks_qty) as totalStock,
            AVG(p.market_price) as avgPrice,
            SUM(CASE WHEN p.stocks_qty <= 10 THEN 1 ELSE 0 END) as lowStockCount
          FROM categories c
          LEFT JOIN products p ON c.id = p.category_id
          GROUP BY c.id, c.name
          ORDER BY totalStock DESC
        `);

        res.json(performance);
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Get category performance error:", error);
      res.status(500).json({ message: "Failed to fetch category performance" });
    }
  });

  app.get("/api/reports/supplier-performance", isAuthenticated, async (_req, res) => {
    try {
      const conn = await storage.getConnection();

      try {
        const [performance] = await conn.execute(`
          SELECT
            s.name as supplierName,
            COUNT(i.id) as totalPurchases,
            SUM(i.quantity) as totalQuantity,
            SUM(i.quantity * i.unit_price) as totalValue,
            AVG(i.unit_price) as avgUnitPrice,
            MAX(i.purchase_date) as lastPurchaseDate
          FROM suppliers s
          LEFT JOIN inventory i ON s.id = i.supplier_id
          WHERE i.purchase_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          GROUP BY s.id, s.name
          HAVING totalPurchases > 0
          ORDER BY totalValue DESC
        `);

        res.json(performance);
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Get supplier performance error:", error);
      res.status(500).json({ message: "Failed to fetch supplier performance" });
    }
  });

  // Recent activities API for dashboard
  app.get("/api/dashboard/recent-activities", isAuthenticated, async (_req, res) => {
    try {
      const conn = await storage.getConnection();

      try {
        // Get recent inventory additions
        const [inventoryActivities] = await conn.execute(`
          SELECT
            CONCAT('inventory_', i.id) as id,
            'inventory' as type,
            'Inventory Added' as title,
            CONCAT('Added ', i.quantity, ' ', p.unit, ' of ', p.name, ' to stock') as description,
            i.purchase_date as timestamp,
            i.id as entityId,
            (i.quantity * i.unit_price) as amount
          FROM inventory i
          JOIN products p ON i.product_id = p.id
          WHERE i.purchase_date >= DATE_SUB(NOW(), INTERVAL 14 DAY)
          ORDER BY i.purchase_date DESC
          LIMIT 6
        `);

        // Get recent distributions (sales)
        const [distributionActivities] = await conn.execute(`
          SELECT
            CONCAT('distribution_', d.id) as id,
            'distribution' as type,
            'Order Completed' as title,
            CONCAT('Bill #', d.bill_no, ' for caterer - ₹', d.grand_total) as description,
            d.distribution_date as timestamp,
            d.id as entityId,
            d.grand_total as amount
          FROM distributions d
          WHERE d.distribution_date >= DATE_SUB(NOW(), INTERVAL 14 DAY)
          ORDER BY d.distribution_date DESC
          LIMIT 6
        `);

        // Get recent payments
        const [paymentActivities] = await conn.execute(`
          SELECT
            CONCAT('payment_', cp.id) as id,
            'payment' as type,
            'Payment Received' as title,
            CONCAT('₹', cp.amount, ' received from caterer') as description,
            cp.payment_date as timestamp,
            cp.id as entityId,
            cp.amount as amount
          FROM caterer_payments cp
          WHERE cp.payment_date >= DATE_SUB(NOW(), INTERVAL 14 DAY)
          ORDER BY cp.payment_date DESC
          LIMIT 4
        `);

        // Get recent supplier additions
        const [supplierActivities] = await conn.execute(`
          SELECT
            CONCAT('supplier_', s.id) as id,
            'supplier' as type,
            'Supplier Added' as title,
            CONCAT('New supplier "', s.name, '" added to system') as description,
            s.created_at as timestamp,
            s.id as entityId,
            0 as amount
          FROM suppliers s
          WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
          ORDER BY s.created_at DESC
          LIMIT 3
        `);

        // Get recent orders (showcase orders)
        const [orderActivities] = await conn.execute(`
          SELECT
            CONCAT('order_', o.id) as id,
            'order' as type,
            'New Order Received' as title,
            CONCAT('Order #', o.order_number, ' from ', o.customer_name, ' - ₹', o.total_amount) as description,
            o.created_at as timestamp,
            o.id as entityId,
            o.total_amount as amount
          FROM orders o
          WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
          ORDER BY o.created_at DESC
          LIMIT 4
        `);

        // Get recent product additions
        const [productActivities] = await conn.execute(`
          SELECT
            CONCAT('product_', p.id) as id,
            'product' as type,
            'Product Added' as title,
            CONCAT('New product "', p.name, '" added to catalog') as description,
            p.created_at as timestamp,
            p.id as entityId,
            0 as amount
          FROM products p
          WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
          ORDER BY p.created_at DESC
          LIMIT 3
        `);

        // Combine all activities
        const allActivities = [
          ...(inventoryActivities as any[]),
          ...(distributionActivities as any[]),
          ...(paymentActivities as any[]),
          ...(supplierActivities as any[]),
          ...(orderActivities as any[]),
          ...(productActivities as any[])
        ];

        // Sort by timestamp and take top 12 to fill the layout height
        const sortedActivities = allActivities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 12);

        res.json(sortedActivities);
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Get recent activities error:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // Inventory history API - must come before /api/inventory/:id route
  app.get("/api/inventory/history", isAuthenticated, async (req, res) => {
    try {
      const inventoryId = req.query.inventoryId ? parseInt(req.query.inventoryId as string) : undefined;
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;

      console.log("Fetching inventory history with filters:", { inventoryId, productId });
      const history = await storage.getInventoryHistory(inventoryId, productId);
      res.json(history);
    } catch (error) {
      console.error("Get inventory history error:", error);
      res.status(500).json({ message: "Failed to fetch inventory history" });
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(parseInt(req.params.id));
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  // Get inventory items by product ID
  app.get("/api/inventory/product/:productId", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const conn = await storage.getConnection();
      try {
        // Get all inventory items for the specified product
        const [rows] = await conn.execute(`
          SELECT
            i.*,
            p.name as product_name,
            p.unit as product_unit,
            s.name as supplier_name
          FROM
            inventory i
          LEFT JOIN
            products p ON i.product_id = p.id
          LEFT JOIN
            suppliers s ON i.supplier_id = s.id
          WHERE
            i.product_id = ? AND
            i.status = 'active' AND
            i.quantity > 0
          ORDER BY
            i.expiry_date ASC
        `, [productId]);

        // Map the database fields to the expected format for the client
        const formattedItems = (rows as any[]).map(item => ({
          id: item.id,
          productId: item.product_id,
          supplierId: item.supplier_id,
          batchNumber: item.batch_number,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalValue: item.total_value,
          expiryDate: item.expiry_date,
          purchaseDate: item.purchase_date,
          barcode: item.barcode,
          notes: item.notes,
          status: item.status,
          productName: item.product_name,
          productUnit: item.product_unit,
          supplierName: item.supplier_name
        }));

        res.json(formattedItems);
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Get inventory by product error:", error);
      res.status(500).json({ message: "Failed to fetch inventory items for product" });
    }
  });

  app.post("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating inventory item with data:", req.body);

      // Format the date correctly for MySQL DATE type (YYYY-MM-DD)
      let expiryDate = req.body.expiryDate;
      if (expiryDate) {
        // If it's an ISO string, extract just the date part
        if (typeof expiryDate === 'string' && expiryDate.includes('T')) {
          expiryDate = expiryDate.split('T')[0];
        } else if (expiryDate instanceof Date) {
          // If it's a Date object, format it as YYYY-MM-DD
          expiryDate = expiryDate.toISOString().split('T')[0];
        }
      }

      // Format received date if present
      let receivedDate = req.body.purchaseDate || new Date();
      if (receivedDate instanceof Date) {
        receivedDate = receivedDate.toISOString().split('T')[0];
      } else if (typeof receivedDate === 'string' && receivedDate.includes('T')) {
        receivedDate = receivedDate.split('T')[0];
      }

      // Map the fields from the client to match the database schema
      const inventoryData = {
        spice_id: req.body.spiceId,
        batch_number: req.body.batchNumber,
        quantity: req.body.quantity,
        purchase_price: req.body.unitPrice,
        expiry_date: expiryDate,
        received_date: receivedDate,
        notes: req.body.notes || null,
        location: ""  // Default value
      };

      console.log("Formatted inventory data:", inventoryData);

      // Create the inventory item using the database schema fields
      const conn = await storage.getConnection();
      try {
        const [result] = await conn.execute(
          `INSERT INTO inventory (spice_id, batch_number, quantity, purchase_price, expiry_date, received_date, notes, location)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inventoryData.spice_id,
            inventoryData.batch_number,
            inventoryData.quantity,
            inventoryData.purchase_price,
            inventoryData.expiry_date,
            inventoryData.received_date,
            inventoryData.notes,
            inventoryData.location
          ]
        );
        const insertId = (result as any).insertId;
        const [rows] = await conn.execute(`SELECT * FROM inventory WHERE id = ?`, [insertId]);
        const newItem = (rows as any[])[0];

        // Map the database fields to the expected format for the client
        const formattedItem = {
          id: newItem.id,
          spiceId: newItem.spice_id,
          batchNumber: newItem.batch_number,
          quantity: newItem.quantity,
          unitPrice: newItem.purchase_price,
          expiryDate: newItem.expiry_date,
          purchaseDate: newItem.received_date,
          notes: newItem.notes,
          location: newItem.location,
          // Add default values for missing fields
          vendorId: req.body.vendorId || 0,
          totalValue: String(Number(newItem.quantity) * Number(newItem.purchase_price)),
          barcode: req.body.barcode || "",
          status: "active"
        };

        res.status(201).json(formattedItem);
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Create inventory error:", error);
      res.status(500).json({ message: "Failed to create inventory item", error: String(error) });
    }
  });

  // Update inventory quantity (for batch selection in caterer billing)
  app.patch("/api/inventory/:id/quantity", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity, isAddition = false } = req.body;

      if (quantity === undefined) {
        return res.status(400).json({ message: "Quantity is required" });
      }

      const conn = await storage.getConnection();
      try {
        // Start a transaction
        await conn.beginTransaction();

        // First get the current inventory item to check its current quantity
        const [rows] = await conn.execute(`SELECT * FROM inventory WHERE id = ?`, [id]);
        if ((rows as any[]).length === 0) {
          await conn.rollback();
          return res.status(404).json({ message: "Inventory item not found" });
        }

        const item = (rows as any[])[0];
        let newQuantity;

        if (isAddition) {
          // Add to the current quantity
          newQuantity = Number(item.quantity) + Number(quantity);
        } else {
          // Subtract from the current quantity
          newQuantity = Number(item.quantity) - Number(quantity);

          // Ensure quantity doesn't go below zero
          if (newQuantity < 0) {
            await conn.rollback();
            return res.status(400).json({
              message: "Insufficient quantity available",
              available: item.quantity
            });
          }
        }

        // Update the total value based on the new quantity
        const totalValue = newQuantity * Number(item.unit_price);

        // If quantity is zero, mark the batch as inactive
        if (newQuantity === 0) {
          console.log(`Batch ${id} quantity is now zero, marking as inactive`);

          // Update the product's total stock quantity
          const productId = item.product_id;

          // Get the current product stock quantity
          const [productRows] = await conn.execute(
            `SELECT stocks_qty FROM products WHERE id = ?`,
            [productId]
          );

          if ((productRows as any[]).length > 0) {
            const product = (productRows as any[])[0];
            const currentStockQty = Number(product.stocks_qty);
            const updatedStockQty = Math.max(0, currentStockQty - Number(quantity));

            // Update the product's stock quantity
            await conn.execute(
              `UPDATE products SET stocks_qty = ? WHERE id = ?`,
              [updatedStockQty, productId]
            );

            console.log(`Updated product ${productId} stock quantity to ${updatedStockQty}`);
          }

          // Update the inventory item status to inactive
          await conn.execute(
            `UPDATE inventory SET quantity = 0, total_value = 0, status = 'inactive' WHERE id = ?`,
            [id]
          );
        } else {
          // Update the inventory item with new quantity
          await conn.execute(
            `UPDATE inventory SET quantity = ?, total_value = ? WHERE id = ?`,
            [newQuantity, totalValue, id]
          );

          // Update the product's total stock quantity
          if (!isAddition) {
            const productId = item.product_id;

            // Get the current product stock quantity
            const [productRows] = await conn.execute(
              `SELECT stocks_qty FROM products WHERE id = ?`,
              [productId]
            );

            if ((productRows as any[]).length > 0) {
              const product = (productRows as any[])[0];
              const currentStockQty = Number(product.stocks_qty);
              const updatedStockQty = Math.max(0, currentStockQty - Number(quantity));

              // Update the product's stock quantity
              await conn.execute(
                `UPDATE products SET stocks_qty = ? WHERE id = ?`,
                [updatedStockQty, productId]
              );

              console.log(`Updated product ${productId} stock quantity to ${updatedStockQty}`);
            }
          }
        }

        // Commit the transaction
        await conn.commit();

        // Get the updated item
        const [updatedRows] = await conn.execute(`
          SELECT
            i.*,
            p.name as product_name,
            p.unit as product_unit,
            s.name as supplier_name
          FROM
            inventory i
          LEFT JOIN
            products p ON i.product_id = p.id
          LEFT JOIN
            suppliers s ON i.supplier_id = s.id
          WHERE i.id = ?
        `, [id]);

        if ((updatedRows as any[]).length === 0) {
          // If the item is not found after update, it might be because it was marked as inactive
          // Return a special response for zero quantity items
          if (newQuantity === 0) {
            const formattedItem = {
              id: id,
              productId: item.product_id,
              supplierId: item.supplier_id,
              batchNumber: item.batch_number,
              quantity: 0,
              unitPrice: item.unit_price,
              totalValue: 0,
              expiryDate: item.expiry_date,
              purchaseDate: item.purchase_date,
              barcode: item.barcode,
              notes: item.notes,
              status: 'inactive',
              productName: item.product_name || "Unknown",
              productUnit: item.product_unit || "kg",
              supplierName: item.supplier_name || "Unknown"
            };

            res.json(formattedItem);
            return;
          }

          return res.status(404).json({ message: "Inventory item not found after update" });
        }

        const updatedItem = (updatedRows as any[])[0];

        // Map the database fields to the expected format for the client
        const formattedItem = {
          id: updatedItem.id,
          productId: updatedItem.product_id,
          supplierId: updatedItem.supplier_id,
          batchNumber: updatedItem.batch_number,
          quantity: updatedItem.quantity,
          unitPrice: updatedItem.unit_price,
          totalValue: updatedItem.total_value,
          expiryDate: updatedItem.expiry_date,
          purchaseDate: updatedItem.purchase_date,
          barcode: updatedItem.barcode,
          notes: updatedItem.notes,
          status: updatedItem.status,
          productName: updatedItem.product_name,
          productUnit: updatedItem.product_unit,
          supplierName: updatedItem.supplier_name
        };

        res.json(formattedItem);
      } catch (error) {
        // If there's an error, roll back the transaction
        try {
          await conn.rollback();
          console.error("Transaction rolled back due to error:", error);
        } catch (rollbackError) {
          console.error("Error rolling back transaction:", rollbackError);
        }
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Update inventory quantity error:", error);
      res.status(500).json({ message: "Failed to update inventory quantity" });
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Map the fields from the client to match the database schema
      const updateData: any = {};
      if (req.body.spiceId !== undefined) updateData.spice_id = req.body.spiceId;
      if (req.body.batchNumber !== undefined) updateData.batch_number = req.body.batchNumber;
      if (req.body.quantity !== undefined) updateData.quantity = req.body.quantity;
      if (req.body.unitPrice !== undefined) updateData.purchase_price = req.body.unitPrice;

      // Format the expiry date correctly if present
      if (req.body.expiryDate !== undefined) {
        let expiryDate = req.body.expiryDate;
        if (typeof expiryDate === 'string' && expiryDate.includes('T')) {
          expiryDate = expiryDate.split('T')[0];
        } else if (expiryDate instanceof Date) {
          expiryDate = expiryDate.toISOString().split('T')[0];
        }
        updateData.expiry_date = expiryDate;
      }

      // Format the purchase date correctly if present
      if (req.body.purchaseDate !== undefined) {
        let receivedDate = req.body.purchaseDate;
        if (receivedDate instanceof Date) {
          receivedDate = receivedDate.toISOString().split('T')[0];
        } else if (typeof receivedDate === 'string' && receivedDate.includes('T')) {
          receivedDate = receivedDate.split('T')[0];
        }
        updateData.received_date = receivedDate;
      }

      if (req.body.notes !== undefined) updateData.notes = req.body.notes;

      console.log("Update data:", updateData);

      // Update the inventory item
      const conn = await storage.getConnection();
      try {
        // Build the SQL query dynamically based on the fields to update
        const fields = Object.keys(updateData);
        if (fields.length === 0) {
          return res.status(400).json({ message: "No fields to update" });
        }

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => updateData[field]);
        values.push(id); // Add the ID for the WHERE clause

        await conn.execute(
          `UPDATE inventory SET ${setClause} WHERE id = ?`,
          values
        );

        const [rows] = await conn.execute(`SELECT * FROM inventory WHERE id = ?`, [id]);
        const updatedItem = (rows as any[])[0];

        if (!updatedItem) {
          return res.status(404).json({ message: "Inventory item not found" });
        }

        // Map the database fields to the expected format for the client
        const formattedItem = {
          id: updatedItem.id,
          spiceId: updatedItem.spice_id,
          batchNumber: updatedItem.batch_number,
          quantity: updatedItem.quantity,
          unitPrice: updatedItem.purchase_price,
          expiryDate: updatedItem.expiry_date,
          purchaseDate: updatedItem.received_date,
          notes: updatedItem.notes,
          location: updatedItem.location,
          // Add default values for missing fields
          vendorId: req.body.vendorId || 0,
          totalValue: String(Number(updatedItem.quantity) * Number(updatedItem.purchase_price)),
          barcode: req.body.barcode || "",
          status: "active"
        };

        res.json(formattedItem);
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Update inventory error:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conn = await storage.getConnection();
      try {
        const [result] = await conn.execute(`DELETE FROM inventory WHERE id = ?`, [id]);
        const success = (result as any).affectedRows > 0;
        if (!success) {
          return res.status(404).json({ message: "Inventory item not found" });
        }
        res.status(204).send();
      } finally {
        conn.release();
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Inventory alerts API
  app.get("/api/inventory/alerts/low-stock", isAuthenticated, async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 10;
      const lowStockItems = await storage.getLowStockItems(threshold);
      res.json(lowStockItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  app.get("/api/inventory/alerts/expiring", isAuthenticated, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const expiringItems = await storage.getExpiringItems(days);
      res.json(expiringItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expiring items" });
    }
  });

  app.get("/api/inventory/alerts/out-of-stock", isAuthenticated, async (req, res) => {
    try {
      const outOfStockItems = await storage.getOutOfStockItems();
      res.json(outOfStockItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch out of stock items" });
    }
  });

  // Inventory history API - specific item history must come before general history
  app.get("/api/inventory/:id/history", isAuthenticated, async (req, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      if (isNaN(inventoryId)) {
        return res.status(400).json({ message: "Invalid inventory ID" });
      }

      console.log(`Fetching history for inventory item ${inventoryId}`);
      const history = await storage.getInventoryHistory(inventoryId);
      res.json(history);
    } catch (error) {
      console.error("Get inventory item history error:", error);
      res.status(500).json({ message: "Failed to fetch inventory item history" });
    }
  });



  // Purchases API
  app.get("/api/purchases", isAuthenticated, async (_req, res) => {
    try {
      console.log("Fetching all purchases");
      const purchases = await storage.getPurchases();
      res.json(purchases);
    } catch (error) {
      console.error("Get purchases error:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.get("/api/purchases/:id", isAuthenticated, async (req, res) => {
    try {
      const purchase = await storage.getPurchase(parseInt(req.params.id));
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      res.json(purchase);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchase" });
    }
  });

  // Upload receipt image
  app.post("/api/receipts/upload", isAuthenticated, upload.single('receipt'), async (req, res) => {
    try {
      console.log("Receipt upload request received");
      console.log("Request headers:", req.headers);
      console.log("Request file:", req.file);

      if (!req.file) {
        console.log("No file uploaded in request");
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Return the file information
      const fileInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: `/api/uploads/receipts/${req.file.filename}`
      };

      console.log("Receipt uploaded successfully:", fileInfo);
      res.status(201).json(fileInfo);
    } catch (error) {
      console.error("Receipt upload error:", error);
      res.status(500).json({ message: "Failed to upload receipt", error: String(error) });
    }
  });

  app.post("/api/purchases", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating purchase with data:", req.body);

      // Handle vendorId to supplierId conversion for backward compatibility
      const requestData = { ...req.body };
      if (requestData.vendorId && !requestData.supplierId) {
        requestData.supplierId = requestData.vendorId;
        delete requestData.vendorId;
      }

      // Handle null receiptImage - convert to undefined to make it optional
      if (requestData.receiptImage === null) {
        requestData.receiptImage = undefined;
      }

      // Validate the request body
      const validatedData = purchaseWithItemsSchema.parse(requestData);

      // Ensure purchaseDate is a Date object
      const formattedData = {
        ...validatedData,
        purchaseDate: validatedData.purchaseDate instanceof Date
          ? validatedData.purchaseDate
          : new Date(validatedData.purchaseDate)
      };

      // Create the purchase
      const purchase = await storage.createPurchase(formattedData);
      res.status(201).json(purchase);
    } catch (error) {
      console.error("Create purchase error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid purchase data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create purchase", error: String(error) });
    }
  });

  app.delete("/api/purchases/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deletePurchase(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete purchase" });
    }
  });

  // Caterers API
  app.get("/api/caterers", isAuthenticated, async (_req, res) => {
    try {
      console.log("Fetching all caterers");
      const caterers = await storage.getCaterers();
      res.json(caterers);
    } catch (error) {
      console.error("Get caterers error:", error);
      res.status(500).json({ message: "Failed to fetch caterers" });
    }
  });

  app.get("/api/caterers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid caterer ID' });
      }

      const caterer = await storage.getCaterer(id);
      if (!caterer) {
        return res.status(404).json({ message: "Caterer not found" });
      }

      res.json(caterer);
    } catch (error) {
      console.error("Get caterer error:", error);
      res.status(500).json({ message: "Failed to fetch caterer" });
    }
  });

  // Endpoint to check if a caterer has related records
  app.get("/api/caterers/:id/check-related-records", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid caterer ID' });
      }

      // Check if the caterer exists
      const caterer = await storage.getCaterer(id);
      if (!caterer) {
        return res.status(404).json({ message: "Caterer not found" });
      }

      // Get related records counts
      const relatedRecords = await storage.getCatererRelatedRecordsCounts(id);

      res.json({
        hasRelatedRecords: relatedRecords.totalCount > 0,
        distributionsCount: relatedRecords.distributionsCount,
        paymentsCount: relatedRecords.paymentsCount,
        totalCount: relatedRecords.totalCount
      });
    } catch (error) {
      console.error("Check related records error:", error);
      res.status(500).json({ message: "Failed to check related records" });
    }
  });

  app.post("/api/caterers", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCatererSchema.parse(req.body);
      const newCaterer = await storage.createCaterer(validatedData);
      res.status(201).json(newCaterer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create caterer error:", error);
      res.status(500).json({ message: "Failed to create caterer" });
    }
  });

  app.patch("/api/caterers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid caterer ID' });
      }

      const caterer = await storage.getCaterer(id);
      if (!caterer) {
        return res.status(404).json({ message: "Caterer not found" });
      }

      const updatedCaterer = await storage.updateCaterer(id, req.body);
      res.json(updatedCaterer);
    } catch (error) {
      console.error("Update caterer error:", error);
      res.status(500).json({ message: "Failed to update caterer" });
    }
  });

  // Caterer image upload endpoint
  app.post("/api/caterers/upload-image", isAuthenticated, upload.single('shopCard'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Get the relative path for storage in the database
      const imagePath = `/api/uploads/caterers/${path.basename(req.file.path)}`;
      console.log("Caterer image uploaded to:", imagePath);

      // Return the image URL
      res.json({
        url: imagePath,
        filename: path.basename(req.file.path),
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Caterer image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.delete("/api/caterers/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`Delete caterer request received for ID: ${req.params.id}`);

      // Validate the ID parameter
      if (!req.params.id) {
        return res.status(400).json({ error: 'Missing caterer ID' });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid caterer ID' });
      }

      // Check if the caterer exists
      const caterer = await storage.getCaterer(id);
      if (!caterer) {
        return res.status(404).json({ message: "Caterer not found" });
      }

      // Check for deletion options
      const forceDelete = req.query.force === 'true';
      const cascadeDelete = req.query.cascade === 'true';

      if (forceDelete) {
        console.log(`Force delete requested for caterer ID: ${id}`);
      }

      if (cascadeDelete) {
        console.log(`Cascade delete requested for caterer ID: ${id}`);
      }

      // If no special options, check if the caterer has related records
      if (!forceDelete && !cascadeDelete) {
        const relatedRecords = await storage.getCatererRelatedRecordsCounts(id);
        if (relatedRecords.totalCount > 0) {
          console.log(`Caterer ${id} has related records:`, relatedRecords);
          return res.status(400).json({
            error: `Cannot delete caterer with related records: ${relatedRecords.totalCount} related records found`,
            relatedRecords: {
              bills: relatedRecords.distributionsCount,
              payments: relatedRecords.paymentsCount,
              total: relatedRecords.totalCount
            }
          });
        }
      }

      // Delete the caterer with appropriate options
      const success = await storage.deleteCaterer(id, {
        force: forceDelete,
        cascade: cascadeDelete
      });

      if (success) {
        console.log(`Successfully deleted caterer with ID: ${id}`);
        res.status(204).end();
      } else {
        console.error(`Failed to delete caterer with ID: ${id}`);
        res.status(500).json({ message: "Failed to delete caterer" });
      }
    } catch (error) {
      console.error("Delete caterer error:", error);
      res.status(500).json({ message: "Failed to delete caterer", error: String(error) });
    }
  });

  // Distributions API (Caterer Billing)
  app.get("/api/distributions", isAuthenticated, async (_req, res) => {
    try {
      console.log("Fetching all distributions");
      const distributions = await storage.getDistributions();
      console.log("Found distributions:", distributions);
      res.json(distributions);
    } catch (error) {
      console.error("Get distributions error:", error);
      res.status(500).json({ message: "Failed to fetch distributions" });
    }
  });

  // Debug endpoint to check distributions table
  app.get("/api/debug/distributions", isAuthenticated, async (_req, res) => {
    try {
      console.log("Debug: Checking distributions table");
      const conn = await storage.getConnection();
      try {
        // Check if the table exists
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
        if ((tables as any[]).length === 0) {
          return res.json({
            exists: false,
            message: "distributions table does not exist"
          });
        }

        // Get table structure
        const [columns] = await conn.execute(`SHOW COLUMNS FROM distributions`);

        // Get row count
        const [countResult] = await conn.execute(`SELECT COUNT(*) as count FROM distributions`);
        const count = (countResult as any[])[0].count;

        // Get sample data if any exists
        let rows = [];
        if (count > 0) {
          const [rowsResult] = await conn.execute(`SELECT * FROM distributions LIMIT 10`);
          rows = rowsResult;
        }

        res.json({
          exists: true,
          columns,
          rowCount: count,
          sampleData: rows
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Debug distributions error:", error);
      res.status(500).json({ message: "Error checking distributions table", error: String(error) });
    }
  });

  app.get("/api/distributions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid distribution ID' });
      }

      const distribution = await storage.getDistribution(id);
      if (!distribution) {
        return res.status(404).json({ message: "Distribution not found" });
      }

      // Get the distribution items
      const items = await storage.getDistributionItems(id);

      // Combine distribution and items
      const result = {
        ...distribution,
        items
      };

      res.json(result);
    } catch (error) {
      console.error("Get distribution error:", error);
      res.status(500).json({ message: "Failed to fetch distribution" });
    }
  });

  // Add a dedicated endpoint for distribution items
  app.get("/api/distributions/:id/items", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid distribution ID' });
      }

      const items = await storage.getDistributionItems(id);
      res.json(items);
    } catch (error) {
      console.error("Get distribution items error:", error);
      res.status(500).json({ message: "Failed to fetch distribution items" });
    }
  });

  app.get("/api/distributions/caterer/:id", isAuthenticated, async (req, res) => {
    try {
      const catererId = parseInt(req.params.id);
      if (isNaN(catererId)) {
        return res.status(400).json({ error: 'Invalid caterer ID' });
      }

      const distributions = await storage.getDistributionsByCaterer(catererId);
      res.json(distributions);
    } catch (error) {
      console.error("Get distributions by caterer error:", error);
      res.status(500).json({ message: "Failed to fetch distributions" });
    }
  });

  app.post("/api/distributions", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating distribution with data:", req.body);

      // Validate the request body
      const validatedData = distributionWithItemsSchema.parse(req.body);

      // Ensure distributionDate is a Date object
      const formattedData = {
        ...validatedData,
        distributionDate: validatedData.distributionDate instanceof Date
          ? validatedData.distributionDate
          : new Date(validatedData.distributionDate)
      };

      // Create the distribution
      const distribution = await storage.createDistribution(formattedData);
      res.status(201).json(distribution);
    } catch (error) {
      console.error("Create distribution error:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid distribution data",
          error: error.errors
        });
      }

      // Provide more detailed error message to the client
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        message: "Failed to create distribution",
        error: errorMessage
      });
    }
  });

  app.patch("/api/distributions/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid distribution ID' });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const distribution = await storage.getDistribution(id);
      if (!distribution) {
        return res.status(404).json({ message: "Distribution not found" });
      }

      const updatedDistribution = await storage.updateDistributionStatus(id, status);
      res.json(updatedDistribution);
    } catch (error) {
      console.error("Update distribution status error:", error);
      res.status(500).json({ message: "Failed to update distribution status" });
    }
  });

  app.delete("/api/distributions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid distribution ID' });
      }

      const distribution = await storage.getDistribution(id);
      if (!distribution) {
        return res.status(404).json({ message: "Distribution not found" });
      }

      const success = await storage.deleteDistribution(id);
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete distribution" });
      }
    } catch (error) {
      console.error("Delete distribution error:", error);
      res.status(500).json({ message: "Failed to delete distribution" });
    }
  });

  // Caterer Payments API
  app.get("/api/caterer-payments", isAuthenticated, async (_req, res) => {
    try {
      const payments = await storage.getCatererPayments();

      // Ensure receipt_image field is present in all payments
      const processedPayments = payments.map(payment => ({
        ...payment,
        receiptImage: payment.receiptImage || null
      }));

      res.json(processedPayments);
    } catch (error) {
      console.error("Get caterer payments error:", error);
      res.status(500).json({ message: "Failed to fetch caterer payments" });
    }
  });

  // Debug endpoint to check caterer payments table
  app.get("/api/debug/caterer-payments", isAuthenticated, async (_req, res) => {
    try {
      console.log("Debug: Checking caterer_payments table");
      const conn = await storage.getConnection();
      try {
        // Check if the table exists
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);
        if ((tables as any[]).length === 0) {
          return res.json({
            exists: false,
            message: "caterer_payments table does not exist"
          });
        }

        // Get table structure
        const [columns] = await conn.execute(`SHOW COLUMNS FROM caterer_payments`);

        // Get row count
        const [countResult] = await conn.execute(`SELECT COUNT(*) as count FROM caterer_payments`);
        const count = (countResult as any[])[0].count;

        // Get sample data if any exists
        let rows = [];
        if (count > 0) {
          const [rowsResult] = await conn.execute(`
            SELECT
              cp.*,
              c.name as caterer_name
            FROM
              caterer_payments cp
            LEFT JOIN
              caterers c ON cp.caterer_id = c.id
            ORDER BY
              cp.payment_date DESC
            LIMIT 10
          `);
          rows = rowsResult;
        }

        // Map the data to the expected format
        const mappedRows = (rows as any[]).map(payment => ({
          id: payment.id,
          catererId: payment.caterer_id,
          catererName: payment.caterer_name,
          distributionId: payment.distribution_id,
          amount: payment.amount,
          paymentDate: payment.payment_date,
          paymentMode: payment.payment_mode,
          referenceNo: payment.reference_no,
          notes: payment.notes,
          createdAt: payment.created_at,
          receiptImage: payment.receipt_image || null
        }));

        res.json({
          exists: true,
          columns,
          rowCount: count,
          sampleData: rows,
          mappedData: mappedRows
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Debug caterer payments error:", error);
      res.status(500).json({ message: "Error checking caterer_payments table", error: String(error) });
    }
  });

  app.get("/api/caterer-payments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid payment ID' });
      }

      const payment = await storage.getCatererPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      // Ensure receipt_image field is present
      const processedPayment = {
        ...payment,
        receiptImage: payment.receiptImage || null
      };

      res.json(processedPayment);
    } catch (error) {
      console.error("Get caterer payment error:", error);
      res.status(500).json({ message: "Failed to fetch caterer payment" });
    }
  });

  app.get("/api/caterer-payments/caterer/:id", isAuthenticated, async (req, res) => {
    try {
      const catererId = parseInt(req.params.id);
      if (isNaN(catererId)) {
        return res.status(400).json({ error: 'Invalid caterer ID' });
      }

      const payments = await storage.getCatererPaymentsByCaterer(catererId);

      // Ensure receipt_image field is present in all payments
      const processedPayments = payments.map(payment => ({
        ...payment,
        receiptImage: payment.receiptImage || null
      }));

      res.json(processedPayments);
    } catch (error) {
      console.error("Get payments by caterer error:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.get("/api/caterer-payments/distribution/:id", isAuthenticated, async (req, res) => {
    try {
      const distributionId = parseInt(req.params.id);
      if (isNaN(distributionId)) {
        return res.status(400).json({ error: 'Invalid distribution ID' });
      }

      const payments = await storage.getCatererPaymentsByDistribution(distributionId);

      // Ensure receipt_image field is present in all payments
      const processedPayments = payments.map(payment => ({
        ...payment,
        receiptImage: payment.receiptImage || null
      }));

      res.json(processedPayments);
    } catch (error) {
      console.error("Get payments by distribution error:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/caterer-payments", isAuthenticated, async (req, res) => {
    try {
      console.log("Received payment data:", JSON.stringify(req.body, null, 2));

      // Validate the request body
      const validatedData = insertCatererPaymentSchema.parse(req.body);

      console.log("Validated payment data:", JSON.stringify(validatedData, null, 2));

      // Create the payment
      const payment = await storage.createCatererPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create caterer payment error:", error);
      res.status(500).json({ message: "Failed to create caterer payment" });
    }
  });

  // Payment Reminders API
  app.get("/api/payment-reminders", isAuthenticated, async (_req, res) => {
    try {
      const reminders = await storage.getPaymentReminders();
      res.json(reminders);
    } catch (error) {
      console.error("Get payment reminders error:", error);
      res.status(500).json({ message: "Failed to fetch payment reminders" });
    }
  });

  app.get("/api/payment-reminders/:id", isAuthenticated, async (req, res) => {
    try {
      const reminder = await storage.getPaymentReminder(req.params.id);
      if (!reminder) {
        return res.status(404).json({ message: "Payment reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      console.error("Get payment reminder error:", error);
      res.status(500).json({ message: "Failed to fetch payment reminder" });
    }
  });

  app.post("/api/payment-reminders", isAuthenticated, async (req, res) => {
    try {
      // Create a schema for payment reminder validation
      const paymentReminderSchema = z.object({
        catererId: z.number(),
        distributionId: z.number().optional(),
        amount: z.number(),
        originalDueDate: z.union([
          z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid date format"
          }).transform(val => new Date(val)),
          z.date()
        ]),
        reminderDate: z.union([
          z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid date format"
          }).transform(val => new Date(val)),
          z.date()
        ]),
        nextReminderDate: z.union([
          z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid date format"
          }).transform(val => new Date(val)),
          z.date()
        ]).optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
      });

      const validatedData = paymentReminderSchema.parse(req.body);
      const reminder = await storage.createPaymentReminder(validatedData);
      res.status(201).json(reminder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create payment reminder error:", error);
      res.status(500).json({ message: "Failed to create payment reminder" });
    }
  });

  app.patch("/api/payment-reminders/:id", isAuthenticated, async (req, res) => {
    try {
      // Create a schema for payment reminder update validation
      const updatePaymentReminderSchema = z.object({
        catererId: z.number().optional(),
        distributionId: z.number().optional(),
        amount: z.number().optional(),
        originalDueDate: z.union([
          z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid date format"
          }).transform(val => new Date(val)),
          z.date()
        ]).optional(),
        reminderDate: z.union([
          z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid date format"
          }).transform(val => new Date(val)),
          z.date()
        ]).optional(),
        nextReminderDate: z.union([
          z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid date format"
          }).transform(val => new Date(val)),
          z.date()
        ]).optional(),
        status: z.string().optional(),
        isRead: z.boolean().optional(),
        notes: z.string().optional(),
      });

      const validatedData = updatePaymentReminderSchema.parse(req.body);
      const reminder = await storage.updatePaymentReminder(req.params.id, validatedData);
      if (!reminder) {
        return res.status(404).json({ message: "Payment reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update payment reminder error:", error);
      res.status(500).json({ message: "Failed to update payment reminder" });
    }
  });

  app.delete("/api/payment-reminders/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deletePaymentReminder(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Payment reminder not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Delete payment reminder error:", error);
      res.status(500).json({ message: "Failed to delete payment reminder" });
    }
  });

  // Update next reminder date
  app.post("/api/payment-reminders/:id/next-reminder", isAuthenticated, async (req, res) => {
    try {
      const { nextReminderDate } = req.body;
      if (!nextReminderDate) {
        return res.status(400).json({ error: "Next reminder date is required" });
      }

      const reminder = await storage.updatePaymentReminder(req.params.id, {
        nextReminderDate: new Date(nextReminderDate)
      });

      if (!reminder) {
        return res.status(404).json({ message: "Payment reminder not found" });
      }

      res.json(reminder);
    } catch (error) {
      console.error("Update next reminder date error:", error);
      res.status(500).json({ message: "Failed to update next reminder date" });
    }
  });

  // Acknowledge payment reminder (permanent)
  app.post("/api/payment-reminders/:id/acknowledge", isAuthenticated, async (req, res) => {
    try {
      const reminder = await storage.updatePaymentReminder(req.params.id, {
        isAcknowledged: true,
        acknowledgedAt: new Date()
      });

      if (!reminder) {
        return res.status(404).json({ message: "Payment reminder not found" });
      }

      res.json({ success: true, reminder });
    } catch (error) {
      console.error("Acknowledge payment reminder error:", error);
      res.status(500).json({ message: "Failed to acknowledge payment reminder" });
    }
  });

  // Dismiss payment reminder (temporary - session based)
  app.post("/api/payment-reminders/:id/dismiss", isAuthenticated, async (req, res) => {
    try {
      // For dismissals, we don't update the database - this is handled client-side
      // We just return success to indicate the dismissal was processed
      res.json({ success: true, message: "Reminder dismissed temporarily" });
    } catch (error) {
      console.error("Dismiss payment reminder error:", error);
      res.status(500).json({ message: "Failed to dismiss payment reminder" });
    }
  });

  // Customer Bills API
  app.get("/api/customer-bills", isAuthenticated, async (req, res) => {
    try {
      const { page = '1', limit = '10', search, status, startDate, endDate } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const bills = await storage.getCustomerBills({
        page: pageNum,
        limit: limitNum,
        offset,
        search: search as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json(bills);
    } catch (error) {
      console.error("Get customer bills error:", error);
      res.status(500).json({ message: "Failed to fetch customer bills" });
    }
  });

  app.get("/api/customer-bills/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid customer bill ID' });
      }

      const bill = await storage.getCustomerBill(id);
      if (!bill) {
        return res.status(404).json({ message: "Customer bill not found" });
      }

      res.json(bill);
    } catch (error) {
      console.error("Get customer bill error:", error);
      res.status(500).json({ message: "Failed to fetch customer bill" });
    }
  });

  app.post("/api/customer-bills", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating customer bill with data:", req.body);

      // Extract selectedBatches from request body for inventory validation
      const { selectedBatches, ...billData } = req.body;

      // Validate the request body
      const validatedData = customerBillWithItemsSchema.parse(billData);

      // Ensure billDate is a Date object
      const formattedData = {
        ...validatedData,
        billDate: validatedData.billDate instanceof Date
          ? validatedData.billDate
          : new Date(validatedData.billDate)
      };

      const conn = await storage.getConnection();
      try {
        await conn.beginTransaction();

        // Validate inventory if batches are selected
        if (selectedBatches && Object.keys(selectedBatches).length > 0) {
          console.log("Validating inventory for customer bill...");

          for (const [productIdStr, batchData] of Object.entries(selectedBatches)) {
            const productId = parseInt(productIdStr);
            const { batchIds, quantities } = batchData as { batchIds: number[]; quantities: number[] };

            for (let i = 0; i < batchIds.length; i++) {
              const batchId = batchIds[i];
              const requiredQuantity = quantities[i];

              // Check batch availability
              const [batchRows] = await conn.execute(
                `SELECT quantity FROM inventory WHERE id = ? AND status = 'active'`,
                [batchId]
              );

              if ((batchRows as any[]).length === 0) {
                throw new Error(`Inventory batch ${batchId} not found or inactive`);
              }

              const availableQuantity = (batchRows as any[])[0].quantity;
              if (availableQuantity < requiredQuantity) {
                throw new Error(`Insufficient quantity in batch ${batchId}. Available: ${availableQuantity}, Required: ${requiredQuantity}`);
              }
            }
          }
        }

        // Create the customer bill
        const bill = await storage.createCustomerBill(formattedData, conn);

        // Ensure we have the bill ID
        if (!bill || !bill.id) {
          throw new Error("Failed to create customer bill - no ID returned");
        }

        // Store the bill ID for inventory transactions
        const billId = bill.id;
        const billNo = bill.billNo;
        const paymentMethod = bill.paymentMethod || 'Cash';

        console.log("Created customer bill with ID:", billId, "Bill No:", billNo);

        // Deduct inventory from selected batches
        if (selectedBatches && Object.keys(selectedBatches).length > 0) {
          console.log("Performing batch-specific inventory deduction for customer bill...");

          for (const [productIdStr, batchData] of Object.entries(selectedBatches)) {
            const productId = parseInt(productIdStr);
            const { batchIds, quantities } = batchData as { batchIds: number[]; quantities: number[] };

            for (let i = 0; i < batchIds.length; i++) {
              const batchId = batchIds[i];
              const deductQuantity = quantities[i];

              // Update inventory quantity
              const [currentBatch] = await conn.execute(
                `SELECT quantity, total_value FROM inventory WHERE id = ?`,
                [batchId]
              );

              if ((currentBatch as any[]).length > 0) {
                const currentQuantity = (currentBatch as any[])[0].quantity;
                const currentValue = (currentBatch as any[])[0].total_value;
                const newQuantity = Math.max(0, currentQuantity - deductQuantity);

                // Calculate new value proportionally
                const newValue = currentQuantity > 0 ? (currentValue * newQuantity) / currentQuantity : 0;

                if (newQuantity === 0) {
                  // Mark as inactive and move to history
                  await conn.execute(
                    `UPDATE inventory SET quantity = 0, total_value = 0, status = 'inactive' WHERE id = ?`,
                    [batchId]
                  );

                  console.log(`Batch ${batchId} depleted and marked as inactive`);
                } else {
                  // Update quantity and value
                  await conn.execute(
                    `UPDATE inventory SET quantity = ?, total_value = ? WHERE id = ?`,
                    [newQuantity, newValue, batchId]
                  );
                }

                // Record transaction in inventory_transactions table
                try {
                  // Check if inventory_transactions table exists, create if not
                  const [tables] = await conn.execute(`SHOW TABLES LIKE 'inventory_transactions'`);
                  if ((tables as any[]).length === 0) {
                    console.log("Creating inventory_transactions table...");
                    await conn.execute(`
                      CREATE TABLE inventory_transactions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        inventory_id INT NOT NULL,
                        transaction_type VARCHAR(50) NOT NULL,
                        quantity DECIMAL(10,3) NOT NULL,
                        reference_type VARCHAR(50),
                        reference_id INT,
                        notes TEXT,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (inventory_id) REFERENCES inventory(id)
                      )
                    `);
                  }

                  await conn.execute(
                    `INSERT INTO inventory_transactions (
                      inventory_id, transaction_type, quantity, reference_type, reference_id, notes, created_at
                    ) VALUES (?, 'deduction', ?, 'customer_bill', ?, ?, NOW())`,
                    [batchId, deductQuantity, billId, `Customer sale - Bill #${billNo || 'Unknown'} - Payment: ${paymentMethod}`]
                  );
                } catch (transactionError) {
                  console.warn("Failed to record inventory transaction:", transactionError);
                  // Continue without failing the entire operation
                }

                console.log(`Deducted ${deductQuantity} from batch ${batchId}, new quantity: ${newQuantity}`);
              }
            }
          }
        }

        await conn.commit();
        res.status(201).json(bill);
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Create customer bill error:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid customer bill data",
          error: error.errors
        });
      }

      // Provide more detailed error message to the client
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        message: "Failed to create customer bill",
        error: errorMessage
      });
    }
  });

  app.put("/api/customer-bills/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid customer bill ID' });
      }

      // Validate the request body
      const validatedData = customerBillWithItemsSchema.partial().parse(req.body);

      // Update the customer bill
      const bill = await storage.updateCustomerBill(id, validatedData);
      if (!bill) {
        return res.status(404).json({ message: "Customer bill not found" });
      }

      res.json(bill);
    } catch (error) {
      console.error("Update customer bill error:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid customer bill data",
          error: error.errors
        });
      }

      res.status(500).json({ message: "Failed to update customer bill" });
    }
  });

  app.delete("/api/customer-bills/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid customer bill ID' });
      }

      const success = await storage.deleteCustomerBill(id);
      if (!success) {
        return res.status(404).json({ message: "Customer bill not found" });
      }

      res.status(204).end();
    } catch (error) {
      console.error("Delete customer bill error:", error);
      res.status(500).json({ message: "Failed to delete customer bill" });
    }
  });

  // Get caterer balance
  app.get("/api/caterers/:id/balance", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid caterer ID' });
      }

      const caterer = await storage.getCaterer(id);
      if (!caterer) {
        return res.status(404).json({ error: 'Caterer not found' });
      }

      // Calculate real-time balance from distributions and payments
      const distributions = await storage.getDistributionsByCaterer(id);
      const payments = await storage.getCatererPaymentsByCaterer(id);

      const totalBilled = distributions.reduce((sum, dist) => {
        const amount = parseFloat(dist.grandTotal || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const totalPaid = payments.reduce((sum, payment) => {
        const amount = parseFloat(payment.amount || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const balanceDue = Math.max(0, totalBilled - totalPaid);
      const totalOrders = distributions.length;

      // Get the latest balance data with real-time calculations
      const balanceData = {
        balanceDue: balanceDue,
        totalBilled: totalBilled,
        totalOrders: totalOrders,
        totalPaid: totalPaid,
        lastPaymentDate: payments.length > 0 ? payments[0].paymentDate : undefined
      };

      res.json(balanceData);
    } catch (error) {
      console.error('Error fetching caterer balance:', error);
      res.status(500).json({ error: 'Failed to fetch caterer balance' });
    }
  });

  // Expense management routes
  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching expenses");
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      console.log(`Fetching expense with ID: ${id}`);
      const expense = await storage.getExpense(id);

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json(expense);
    } catch (error) {
      console.error("Get expense error:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  // Expense receipt image upload endpoint
  app.post("/api/expenses/upload-receipt", isAuthenticated, upload.single('receiptImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Get the relative path for storage in the database
      const imagePath = `/api/uploads/expenseimg/${path.basename(req.file.path)}`;
      console.log("Expense receipt image uploaded to:", imagePath);

      // Return the image URL
      res.json({
        url: imagePath,
        filename: path.basename(req.file.path),
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Expense receipt image upload error:", error);
      res.status(500).json({ message: "Failed to upload receipt image" });
    }
  });

  // Asset receipt image upload endpoint
  app.post("/api/assets/upload-receipt", isAuthenticated, upload.single('receiptImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Get the relative path for storage in the database
      const imagePath = `/api/uploads/assets/${path.basename(req.file.path)}`;
      console.log("Asset receipt image uploaded to:", imagePath);

      // Return the image URL
      res.json({
        url: imagePath,
        filename: path.basename(req.file.path),
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Asset receipt image upload error:", error);
      res.status(500).json({ message: "Failed to upload asset receipt image" });
    }
  });

  // Asset main image upload endpoint
  app.post("/api/assets/upload-image", isAuthenticated, upload.single('assetImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Get the relative path for storage in the database
      const imagePath = `/api/uploads/assets/${path.basename(req.file.path)}`;
      console.log("Asset main image uploaded to:", imagePath);

      // Return the image URL
      res.json({
        url: imagePath,
        filename: path.basename(req.file.path),
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Asset main image upload error:", error);
      res.status(500).json({ message: "Failed to upload asset main image" });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating expense with data:", req.body);

      // Validate the request body
      const validatedData = insertExpenseSchema.parse(req.body);
      console.log("Validated expense data:", validatedData);

      const expense = await storage.createExpense(validatedData);
      console.log("Expense created successfully:", expense);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      console.error("Create expense error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        message: "Failed to create expense",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      console.log(`Updating expense with ID: ${id}`, req.body);

      const expense = await storage.updateExpense(id, req.body);

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json(expense);
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      console.log(`Deleting expense with ID: ${id}`);

      const success = await storage.deleteExpense(id);

      if (!success) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }

      console.log(`Deleting expense with ID: ${id}`);

      const success = await storage.deleteExpense(id);

      if (!success) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Asset management routes
  app.get("/api/assets", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching assets");
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      console.error("Get assets error:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid asset ID' });
      }

      console.log(`Fetching asset with ID: ${id}`);
      const asset = await storage.getAsset(id);

      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      res.json(asset);
    } catch (error) {
      console.error("Get asset error:", error);
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating asset with data:", req.body);

      // Validate the request body
      const validatedData = insertAssetSchema.parse(req.body);
      console.log("Validated asset data:", validatedData);

      const asset = await storage.createAsset(validatedData);
      console.log("Asset created successfully:", asset);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      console.error("Create asset error:", error);
      res.status(500).json({
        message: "Failed to create asset",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid asset ID' });
      }

      console.log(`Updating asset with ID: ${id}`, req.body);

      const asset = await storage.updateAsset(id, req.body);

      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      res.json(asset);
    } catch (error) {
      console.error("Update asset error:", error);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid asset ID' });
      }

      console.log(`Deleting asset with ID: ${id}`);

      const success = await storage.deleteAsset(id);

      if (!success) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
      console.error("Delete asset error:", error);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

}
