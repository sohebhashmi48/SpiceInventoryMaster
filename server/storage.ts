import mysql from "mysql2/promise";
import {
  User, InsertUser,
  Supplier, InsertSupplier,
  Vendor, InsertVendor, // For backward compatibility
  Category, InsertCategory,
  Product, InsertProduct,
  Spice, InsertSpice, // For backward compatibility
  Inventory, InsertInventory,
  Invoice, InsertInvoice,
  InvoiceItem, InsertInvoiceItem,
  Transaction, InsertTransaction,
  Alert, InsertAlert,
  Purchase, InsertPurchase,
  PurchaseItem, InsertPurchaseItem,
  PurchaseWithItems,
  Caterer, InsertCaterer,
  Distribution, InsertDistribution,
  DistributionItem, InsertDistributionItem,
  CatererPayment, InsertCatererPayment,
  DistributionWithItems
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session, { Store } from "express-session";
import { nanoid } from "nanoid";

const MemoryStore = createMemoryStore(session);

// Define a global interface to store pending payment transactions
declare global {
  var pendingPaymentTransaction: {
    supplierId: number;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    purchaseId: number;
  } | null;
}

// Initialize the global variable
global.pendingPaymentTransaction = null;

// MySQL Connection Pool
let pool: mysql.Pool;
try {
  pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: 'Sudo', // Replace with your MySQL password
    database: 'spice_inventory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('MySQL connection pool created successfully');
} catch (error) {
  console.error('Failed to create MySQL connection pool:', error);
  // Create a dummy pool for fallback
  pool = {
    getConnection: () => Promise.resolve({
      execute: () => Promise.resolve([[]]),
      release: () => {}
    })
  } as unknown as mysql.Pool;
}

export interface IStorage {
  // Database connection
  getConnection(): Promise<mysql.PoolConnection>;

  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Supplier management
  getSupplier(id: number): Promise<Supplier | undefined>;
  getSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;

  // Category management
  getCategory(id: number): Promise<Category | undefined>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Product management
  getProduct(id: number): Promise<Spice | undefined>;
  getProducts(): Promise<Spice[]>;
  createProduct(product: InsertSpice): Promise<Spice>;
  updateProduct(id: number, product: Partial<Spice>): Promise<Spice | undefined>;
  getProductsByCategory(categoryId: number): Promise<Spice[]>;
  deleteProduct(id: number): Promise<boolean>;

  // Inventory management
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  getInventory(): Promise<Inventory[]>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  getLowStockItems(threshold: number): Promise<Inventory[]>;
  getExpiringItems(daysThreshold: number): Promise<Inventory[]>;
  updateInventoryQuantity(spiceId: number, quantity: number, isAddition: boolean): Promise<boolean>;

  // Invoice management
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined>;
  getInvoicesBySupplier(supplierId: number): Promise<Invoice[]>;

  // Invoice items
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;

  // Transactions
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsBySupplier(supplierId: number, type?: string): Promise<Transaction[]>;

  // Alerts
  getAlert(id: number): Promise<Alert | undefined>;
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlertStatus(id: number, status: string): Promise<Alert | undefined>;
  deleteAlert(id: number): Promise<boolean>;

  // Purchase management
  getPurchase(id: number): Promise<Purchase | undefined>;
  getPurchases(): Promise<Purchase[]>;
  createPurchase(purchase: PurchaseWithItems): Promise<Purchase>;
  deletePurchase(id: number): Promise<boolean>;

  // Caterer management
  getCaterer(id: number): Promise<Caterer | undefined>;
  getCaterers(): Promise<Caterer[]>;
  createCaterer(caterer: InsertCaterer): Promise<Caterer>;
  updateCaterer(id: number, caterer: Partial<Caterer>): Promise<Caterer | undefined>;
  deleteCaterer(id: number): Promise<boolean>;

  // Distribution management (Caterer Billing)
  getDistribution(id: number): Promise<Distribution | undefined>;
  getDistributions(): Promise<Distribution[]>;
  createDistribution(distribution: DistributionWithItems): Promise<Distribution>;
  updateDistributionStatus(id: number, status: string): Promise<Distribution | undefined>;
  getDistributionsByCaterer(catererId: number): Promise<Distribution[]>;
  deleteDistribution(id: number): Promise<boolean>;

  // Distribution items
  getDistributionItems(distributionId: number): Promise<DistributionItem[]>;

  // Caterer payments
  getCatererPayment(id: number): Promise<CatererPayment | undefined>;
  getCatererPayments(): Promise<CatererPayment[]>;
  createCatererPayment(payment: InsertCatererPayment): Promise<CatererPayment>;
  getCatererPaymentsByCaterer(catererId: number): Promise<CatererPayment[]>;

  // Session store
  sessionStore: Store;
}

export class MemStorage {
  private users: Map<number, User>;
  private suppliers: Map<number, Supplier>;
  private categories: Map<number, Category>;
  private products: Map<number, Spice>;
  private inventory: Map<number, Inventory>;
  private invoices: Map<number, Invoice>;
  private invoiceItems: Map<number, InvoiceItem>;
  private transactions: Map<number, Transaction>;
  private alerts: Map<number, Alert>;
  private purchases: Map<number, Purchase>;
  private purchaseItems: Map<number, PurchaseItem>;
  private currentUserId: number;
  private currentSupplierId: number;
  private currentCategoryId: number;
  private currentProductId: number;
  private currentInventoryId: number;
  private currentInvoiceId: number;
  private currentInvoiceItemId: number;
  private currentTransactionId: number;
  private currentAlertId: number;
  private currentPurchaseId: number;
  private currentPurchaseItemId: number;
  sessionStore: Store;

  constructor() {
    this.users = new Map();
    this.suppliers = new Map();
    this.categories = new Map();
    this.products = new Map();
    this.inventory = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.transactions = new Map();
    this.alerts = new Map();
    this.purchases = new Map();
    this.purchaseItems = new Map();
    this.currentUserId = 1;
    this.currentSupplierId = 1;
    this.currentCategoryId = 1;
    this.currentProductId = 1;
    this.currentInventoryId = 1;
    this.currentInvoiceId = 1;
    this.currentInvoiceItemId = 1;
    this.currentTransactionId = 1;
    this.currentAlertId = 1;
    this.currentPurchaseId = 1;
    this.currentPurchaseItemId = 1;
    this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });
  }

  // Stub implementations for missing methods causing TS errors

  async getPurchasesBySupplier(supplierId: number): Promise<Purchase[]> {
    return [];
  }

  async getInventory(): Promise<Inventory[]> {
    const conn = await pool.getConnection();
    try {
      console.log("Fetching inventory items from database");

      // Check if inventory table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'inventory'`);
      if ((tables as any[]).length === 0) {
        console.log("Inventory table doesn't exist, creating it...");
        await conn.execute(`
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
          )
        `);
        console.log("Inventory table created successfully");
        return []; // Return empty array since we just created the table
      }

      // Join with products and suppliers to get their names
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
          i.status = 'active'
        ORDER BY
          i.purchase_date DESC
      `);

      console.log("Retrieved inventory items:", rows);

      // Map database fields to camelCase for the client
      const inventoryItems = (rows as any[]).map(item => {
        return {
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          supplierId: item.supplier_id,
          supplierName: item.supplier_name,
          batchNumber: item.batch_number,
          quantity: item.quantity,
          unit: item.product_unit,
          unitPrice: item.unit_price,
          totalValue: item.total_value,
          expiryDate: item.expiry_date,
          purchaseDate: item.purchase_date,
          barcode: item.barcode,
          notes: item.notes,
          status: item.status
        };
      });

      return inventoryItems as Inventory[];
    } catch (error) {
      console.error("Error fetching inventory:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching inventory item with ID: ${id}`);

      // Join with products and suppliers to get their names
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
          i.id = ?
      `, [id]);

      const item = (rows as any[])[0];

      if (!item) {
        return undefined;
      }

      // Map database fields to camelCase for the client
      return {
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        supplierId: item.supplier_id,
        supplierName: item.supplier_name,
        batchNumber: item.batch_number,
        quantity: item.quantity,
        unit: item.product_unit,
        unitPrice: item.unit_price,
        totalValue: item.total_value,
        expiryDate: item.expiry_date,
        purchaseDate: item.purchase_date,
        barcode: item.barcode,
        notes: item.notes,
        status: item.status
      } as Inventory;
    } catch (error) {
      console.error(`Error fetching inventory item with ID ${id}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async getLowStockItems(threshold: number): Promise<Inventory[]> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching low stock items with threshold: ${threshold}`);

      // Check if inventory table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'inventory'`);
      if ((tables as any[]).length === 0) {
        console.log("Inventory table doesn't exist yet");
        return [];
      }

      // Join with products and suppliers to get their names
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
          i.status = 'active'
          AND i.quantity <= ?
        ORDER BY
          i.quantity ASC
      `, [threshold]);

      console.log(`Retrieved ${(rows as any[]).length} low stock items`);

      // Map database fields to camelCase for the client
      const inventoryItems = (rows as any[]).map(item => {
        return {
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          supplierId: item.supplier_id,
          supplierName: item.supplier_name,
          batchNumber: item.batch_number,
          quantity: item.quantity,
          unit: item.product_unit,
          unitPrice: item.unit_price,
          totalValue: item.total_value,
          expiryDate: item.expiry_date,
          purchaseDate: item.purchase_date,
          barcode: item.barcode,
          notes: item.notes,
          status: item.status
        };
      });

      return inventoryItems as Inventory[];
    } catch (error) {
      console.error(`Error fetching low stock items:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async getExpiringItems(daysThreshold: number): Promise<Inventory[]> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching expiring items within ${daysThreshold} days`);

      // Check if inventory table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'inventory'`);
      if ((tables as any[]).length === 0) {
        console.log("Inventory table doesn't exist yet");
        return [];
      }

      // Calculate the date threshold
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
      const formattedThresholdDate = thresholdDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

      // Join with products and suppliers to get their names
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
          i.status = 'active'
          AND i.expiry_date <= ?
          AND i.expiry_date >= CURDATE()
        ORDER BY
          i.expiry_date ASC
      `, [formattedThresholdDate]);

      console.log(`Retrieved ${(rows as any[]).length} expiring items`);

      // Map database fields to camelCase for the client
      const inventoryItems = (rows as any[]).map(item => {
        return {
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          supplierId: item.supplier_id,
          supplierName: item.supplier_name,
          batchNumber: item.batch_number,
          quantity: item.quantity,
          unit: item.product_unit,
          unitPrice: item.unit_price,
          totalValue: item.total_value,
          expiryDate: item.expiry_date,
          purchaseDate: item.purchase_date,
          barcode: item.barcode,
          notes: item.notes,
          status: item.status
        };
      });

      return inventoryItems as Inventory[];
    } catch (error) {
      console.error(`Error fetching expiring items:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async getPurchases(): Promise<Purchase[]> {
    return [];
  }

  async getPurchase(id: number): Promise<Purchase | undefined> {
    return undefined;
  }

  async createPurchase(purchase: PurchaseWithItems): Promise<Purchase> {
    const conn = await pool.getConnection();
    try {
      console.log("Creating purchase with data:", purchase);

      // Start a transaction
      await conn.beginTransaction();

      // Insert the purchase record
      const purchaseFields = [];
      const purchasePlaceholders = [];
      const purchaseValues = [];

      // Add required fields
      purchaseFields.push('company_name', 'company_address', 'bill_no', 'page_no', 'purchase_date', 'total_amount', 'total_gst_amount', 'grand_total', 'status');
      purchasePlaceholders.push('?', '?', '?', '?', '?', '?', '?', '?', '?');
      purchaseValues.push(
        purchase.companyName,
        purchase.companyAddress,
        purchase.billNo,
        purchase.pageNo,
        purchase.purchaseDate,
        purchase.totalAmount,
        purchase.totalGstAmount,
        purchase.grandTotal,
        purchase.status || 'active'
      );

      // Add optional fields
      if (purchase.supplierId !== undefined) {
        purchaseFields.push('supplier_id');
        purchasePlaceholders.push('?');
        purchaseValues.push(purchase.supplierId);
      }

      if (purchase.notes !== undefined) {
        purchaseFields.push('notes');
        purchasePlaceholders.push('?');
        purchaseValues.push(purchase.notes);
      }

      // Insert the purchase record
      const purchaseQuery = `INSERT INTO purchases (${purchaseFields.join(', ')}) VALUES (${purchasePlaceholders.join(', ')})`;
      const [purchaseResult] = await conn.execute(purchaseQuery, purchaseValues);
      const purchaseId = (purchaseResult as any).insertId;

      // Insert purchase items
      if (purchase.items && purchase.items.length > 0) {
        for (const item of purchase.items) {
          const itemFields = ['purchase_id', 'item_name', 'quantity', 'unit', 'rate', 'gst_percentage', 'gst_amount', 'amount'];
          const itemPlaceholders = ['?', '?', '?', '?', '?', '?', '?', '?'];
          const itemValues = [
            purchaseId,
            item.itemName,
            item.quantity,
            item.unit,
            item.rate,
            item.gstPercentage,
            item.gstAmount,
            item.amount
          ];

          const itemQuery = `INSERT INTO purchase_items (${itemFields.join(', ')}) VALUES (${itemPlaceholders.join(', ')})`;
          await conn.execute(itemQuery, itemValues);
        }
      }

      // If this is a paid purchase and we have supplier information, update the supplier's balance
      // Process payment if this is a paid purchase
      if (purchase.isPaid && purchase.supplierId && purchase.paymentAmount) {
        try {
          // Store payment data for processing after the transaction is committed
          const paymentData = {
            supplierId: purchase.supplierId,
            amount: parseFloat(purchase.paymentAmount.toString()),
            paymentMethod: purchase.paymentMethod || 'Cash',
            paymentDate: purchase.paymentDate instanceof Date ? purchase.paymentDate : new Date(),
            purchaseId: purchaseId
          };

          if (purchase.paymentMethod === 'Credit') {
            // For credit payment, check if supplier has enough credit limit
            const [supplierRows] = await conn.execute(
              `SELECT credit_limit, balance_due FROM suppliers WHERE id = ?`,
              [purchase.supplierId]
            );
            const supplier = (supplierRows as any[])[0];

            if (!supplier) {
              throw new Error("Supplier not found");
            }

            const creditLimit = parseFloat(supplier.credit_limit?.toString() || "0");
            const currentBalanceDue = parseFloat(supplier.balance_due?.toString() || "0");
            const paymentAmount = paymentData.amount;

            // Check if using credit would exceed the credit limit
            if (currentBalanceDue + paymentAmount > creditLimit) {
              console.warn(`Credit payment would exceed supplier's credit limit. Current balance: ${currentBalanceDue}, Payment: ${paymentAmount}, Credit limit: ${creditLimit}`);
              // We'll still allow the purchase but log a warning
            }

            // Update supplier's balance_due (increase it when using credit)
            await conn.execute(
              `UPDATE suppliers SET
               balance_due = balance_due + ?
               WHERE id = ?`,
              [paymentAmount, purchase.supplierId]
            );

            // We'll create the transaction record after the main transaction is committed
          } else {
            // For cash/bank/other payments, update supplier's total_paid
            await conn.execute(
              `UPDATE suppliers SET
               total_paid = total_paid + ?
               WHERE id = ?`,
              [paymentData.amount, purchase.supplierId]
            );

            // We'll create the transaction record after the main transaction is committed
          }

          // Store the payment data in a global variable to process after commit
          global.pendingPaymentTransaction = paymentData;

        } catch (error) {
          console.error("Error processing payment update:", error);
          // Continue with the purchase creation even if payment processing fails
        }
      }

      // Add items to inventory - optimized for faster processing
      if (purchase.items && purchase.items.length > 0 && purchase.supplierId) {
        try {
          console.log("Adding purchase items to inventory (optimized)...");

          // Check if inventory table exists
          const [tables] = await conn.execute(`SHOW TABLES LIKE 'inventory'`);
          if ((tables as any[]).length === 0) {
            console.log("Inventory table doesn't exist, creating it...");
            await conn.execute(`
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
              )
            `);
            console.log("Inventory table created successfully");
          }

          // First, get all product IDs in a single query to reduce database calls
          const itemNames = purchase.items.map(item => item.itemName);
          const [productRows] = await conn.execute(
            `SELECT id, name FROM products WHERE name IN (${itemNames.map(() => '?').join(',')})`,
            itemNames
          );

          // Create a map of product names to IDs for quick lookup
          const productMap = new Map();
          (productRows as any[]).forEach(product => {
            productMap.set(product.name, product.id);
          });

          // Prepare batch inserts for inventory and product updates
          const inventoryInserts = [];
          const productUpdates = [];
          const newProducts = [];

          // Calculate expiry date (default to 1 year from now)
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          const formattedExpiryDate = expiryDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

          // Format purchase date
          const purchaseDate = purchase.purchaseDate instanceof Date
            ? purchase.purchaseDate
            : new Date();
          const formattedPurchaseDate = purchaseDate.toISOString().split('T')[0];

          // Process each item
          for (const item of purchase.items) {
            let productId = productMap.get(item.itemName);

            if (!productId) {
              // Product doesn't exist, add to list for batch creation
              newProducts.push({
                name: item.itemName,
                unit: item.unit,
                rate: item.rate
              });
            } else {
              // Product exists, prepare inventory insert and stock update
              const batchNumber = `BATCH-${purchaseId}-${Date.now()}-${productId}`;

              inventoryInserts.push([
                productId,
                purchase.supplierId,
                batchNumber,
                item.quantity,
                item.rate,
                item.amount,
                formattedExpiryDate,
                formattedPurchaseDate,
                `Added from purchase #${purchaseId}`,
                'active'
              ]);

              productUpdates.push([item.quantity, productId]);
            }
          }

          // Create any new products in a batch if needed
          if (newProducts.length > 0) {
            console.log(`Creating ${newProducts.length} new products...`);

            // Create new products one by one (can't easily batch this due to needing the IDs)
            for (const newProduct of newProducts) {
              const [newProductResult] = await conn.execute(
                `INSERT INTO products (name, category_id, unit, price) VALUES (?, 1, ?, ?)`,
                [newProduct.name, newProduct.unit, newProduct.rate]
              );

              const productId = (newProductResult as any).insertId;
              console.log(`Created new product with ID: ${productId}`);

              // Now prepare the inventory insert and stock update for this new product
              const batchNumber = `BATCH-${purchaseId}-${Date.now()}-${productId}`;

              // Find the matching item to get quantity and amount
              const matchingItem = purchase.items.find(item => item.itemName === newProduct.name);
              if (matchingItem) {
                inventoryInserts.push([
                  productId,
                  purchase.supplierId,
                  batchNumber,
                  matchingItem.quantity,
                  matchingItem.rate,
                  matchingItem.amount,
                  formattedExpiryDate,
                  formattedPurchaseDate,
                  `Added from purchase #${purchaseId}`,
                  'active'
                ]);

                productUpdates.push([matchingItem.quantity, productId]);
              }
            }
          }

          // Insert all inventory items in a batch if there are any
          if (inventoryInserts.length > 0) {
            console.log(`Adding ${inventoryInserts.length} items to inventory...`);

            // Use a prepared statement for better performance
            const inventoryStmt = await conn.prepare(`
              INSERT INTO inventory (
                product_id, supplier_id, batch_number, quantity, unit_price,
                total_value, expiry_date, purchase_date, notes, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            // Execute all inserts
            for (const params of inventoryInserts) {
              await inventoryStmt.execute(params);
            }

            // Close the prepared statement
            await inventoryStmt.close();
          }

          // Update all product stock quantities in a batch if there are any
          if (productUpdates.length > 0) {
            console.log(`Updating stock quantities for ${productUpdates.length} products...`);

            // Use a prepared statement for better performance
            const updateStmt = await conn.prepare(`
              UPDATE products SET stocks_qty = stocks_qty + ? WHERE id = ?
            `);

            // Execute all updates
            for (const params of productUpdates) {
              await updateStmt.execute(params);
            }

            // Close the prepared statement
            await updateStmt.close();
          }

          console.log("Inventory update completed successfully");
        } catch (error) {
          console.error("Error adding items to inventory:", error);
          // Continue with the purchase creation even if inventory update fails
        }
      }

      // Commit the transaction
      await conn.commit();

      // Process any pending payment transaction after the main transaction is committed
      if (global.pendingPaymentTransaction) {
        try {
          const paymentData = global.pendingPaymentTransaction;
          console.log(`Processing payment transaction after commit: ${paymentData.paymentMethod} payment of ${paymentData.amount} for purchase #${paymentData.purchaseId}`);

          // Create a transaction record outside the main transaction
          await this.createTransaction({
            supplierId: paymentData.supplierId,
            amount: paymentData.amount.toString(),
            transactionDate: paymentData.paymentDate,
            type: paymentData.paymentMethod === 'Credit' ? "credit" : "payment",
            notes: `${paymentData.paymentMethod === 'Credit' ? "Credit used" : "Payment"} for purchase #${paymentData.purchaseId}${
              paymentData.paymentMethod !== 'Credit' ? ` via ${paymentData.paymentMethod}` : ''
            }`
          });

          console.log("Payment transaction processed successfully");
        } catch (error) {
          console.error("Error processing payment transaction after commit:", error);
          // This is non-critical, so we don't throw the error
        } finally {
          // Clear the pending payment transaction
          global.pendingPaymentTransaction = null;
        }
      }

      // Fetch the created purchase
      const [rows] = await conn.execute(`SELECT * FROM purchases WHERE id = ?`, [purchaseId]);
      const dbPurchase = (rows as any[])[0];

      if (!dbPurchase) {
        throw new Error("Failed to retrieve created purchase");
      }

      // Map database fields to camelCase for the client
      const createdPurchase: Purchase = {
        id: dbPurchase.id,
        companyName: dbPurchase.company_name,
        companyAddress: dbPurchase.company_address,
        billNo: dbPurchase.bill_no,
        pageNo: dbPurchase.page_no,
        supplierId: dbPurchase.supplier_id,
        purchaseDate: dbPurchase.purchase_date,
        totalAmount: dbPurchase.total_amount,
        totalGstAmount: dbPurchase.total_gst_amount,
        grandTotal: dbPurchase.grand_total,
        notes: dbPurchase.notes,
        status: dbPurchase.status,
        createdAt: dbPurchase.created_at
      };

      return createdPurchase;
    } catch (error) {
      // Rollback the transaction in case of error
      await conn.rollback();
      console.error("Error creating purchase:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async deletePurchase(id: number): Promise<boolean> {
    return false;
  }

  async getCaterers(): Promise<Caterer[]> {
    return [];
  }

  async getCaterer(id: number): Promise<Caterer | undefined> {
    return undefined;
  }

  async createCaterer(caterer: InsertCaterer): Promise<Caterer> {
    throw new Error("Not implemented");
  }

  async updateCaterer(id: number, caterer: Partial<Caterer>): Promise<Caterer | undefined> {
    return undefined;
  }

  async deleteCaterer(id: number): Promise<boolean> {
    return false;
  }

  async getDistributions(): Promise<Distribution[]> {
    return [];
  }

  async getDistribution(id: number): Promise<Distribution | undefined> {
    return undefined;
  }

  async getDistributionItems(distributionId: number): Promise<DistributionItem[]> {
    return [];
  }

  async getDistributionsByCaterer(catererId: number): Promise<Distribution[]> {
    return [];
  }

  async createDistribution(distribution: DistributionWithItems): Promise<Distribution> {
    throw new Error("Not implemented");
  }

  async updateDistributionStatus(id: number, status: string): Promise<Distribution | undefined> {
    return undefined;
  }

  async deleteDistribution(id: number): Promise<boolean> {
    return false;
  }

  async getCatererPayments(): Promise<CatererPayment[]> {
    return [];
  }

  async getCatererPayment(id: number): Promise<CatererPayment | undefined> {
    return undefined;
  }

  async getCatererPaymentsByCaterer(catererId: number): Promise<CatererPayment[]> {
    return [];
  }

  async createCatererPayment(payment: InsertCatererPayment): Promise<CatererPayment> {
    throw new Error("Not implemented");
  }

  // Get a database connection from the pool
  async getConnection(): Promise<mysql.PoolConnection> {
    return await pool.getConnection();
  }

  // Supplier Management
  async getSupplier(id: number): Promise<Supplier | undefined> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(`SELECT * FROM suppliers WHERE id = ?`, [id]);
      const dbSupplier = (rows as any[])[0];

      if (!dbSupplier) {
        return undefined;
      }

      // Parse tags from JSON if they exist
      let tags = [];
      try {
        if (dbSupplier.tags) {
          if (typeof dbSupplier.tags === 'string') {
            try {
              // First try to parse as JSON
              tags = JSON.parse(dbSupplier.tags);
            } catch (error) {
              console.error("Error parsing supplier tags:", error);
              // If JSON parsing fails, try to handle as comma-separated string
              tags = dbSupplier.tags.split(',').map((tag: string) => tag.trim());

              // Update the database with the correct JSON format
              try {
                const jsonTags = JSON.stringify(tags);
                conn.execute(
                  `UPDATE suppliers SET tags = ? WHERE id = ?`,
                  [jsonTags, dbSupplier.id]
                ).catch(err => console.error("Failed to update tags format:", err));
              } catch (updateError) {
                console.error("Failed to format tags for update:", updateError);
              }
            }
          } else if (Array.isArray(dbSupplier.tags)) {
            tags = dbSupplier.tags;
          }
        }
      } catch (error) {
        console.error("Error handling supplier tags:", error);
        tags = [];
      }

      // Map database fields to camelCase for the client
      const supplier = {
        id: dbSupplier.id,
        name: dbSupplier.name,
        contactName: dbSupplier.contact_name,
        email: dbSupplier.email,
        phone: dbSupplier.phone,
        address: dbSupplier.address,
        isActive: dbSupplier.is_active === 1,
        paymentTerms: dbSupplier.payment_terms,
        creditLimit: dbSupplier.credit_limit,
        balanceDue: dbSupplier.balance_due,
        totalPaid: dbSupplier.total_paid,
        notes: dbSupplier.notes,
        rating: dbSupplier.rating,
        tags: tags,
        createdAt: dbSupplier.created_at,
        updatedAt: dbSupplier.updated_at
      };

      return supplier as Supplier;
    } finally {
      conn.release();
    }
  }

  async getSuppliers(): Promise<Supplier[]> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(`SELECT * FROM suppliers`);

      // Map database fields to camelCase for the client
      const suppliers = (rows as any[]).map(supplier => {
        let tags = [];
        if (supplier.tags) {
          try {
            // First try to parse as JSON
            tags = JSON.parse(supplier.tags);
          } catch (error) {
            console.error("Error parsing supplier tags:", error);
            // If JSON parsing fails, try to handle as comma-separated string
            if (typeof supplier.tags === 'string') {
              tags = supplier.tags.split(',').map((tag: string) => tag.trim());

              // Update the database with the correct JSON format
              try {
                const jsonTags = JSON.stringify(tags);
                conn.execute(
                  `UPDATE suppliers SET tags = ? WHERE id = ?`,
                  [jsonTags, supplier.id]
                ).catch(err => console.error("Failed to update tags format:", err));
              } catch (updateError) {
                console.error("Failed to format tags for update:", updateError);
              }
            } else {
              tags = [];
            }
          }
        }

        return {
          id: supplier.id,
          name: supplier.name,
          contactName: supplier.contact_name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          isActive: supplier.is_active === 1,
          paymentTerms: supplier.payment_terms,
          creditLimit: supplier.credit_limit,
          balanceDue: supplier.balance_due,
          totalPaid: supplier.total_paid,
          notes: supplier.notes,
          rating: supplier.rating,
          tags: tags,
          createdAt: supplier.created_at,
          updatedAt: supplier.updated_at
        };
      });

      return suppliers as Supplier[];
    } finally {
      conn.release();
    }
  }

  async getSupplierPurchaseHistory(supplierId: number): Promise<any[]> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT p.id as purchaseId, p.purchase_date, pi.product_id, pi.quantity, pi.unit_price
         FROM purchases p
         JOIN purchase_items pi ON p.id = pi.purchase_id
         WHERE p.supplier_id = ?
         ORDER BY p.purchase_date DESC`,
        [supplierId]
      );
      return rows as any[];
    } finally {
      conn.release();
    }
  }

  async getAllPurchaseHistory(): Promise<any[]> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT p.id as purchaseId, p.purchase_date, p.supplier_id, pi.product_id, pi.quantity, pi.unit_price
         FROM purchases p
         JOIN purchase_items pi ON p.id = pi.purchase_id
         ORDER BY p.purchase_date DESC`
      );
      return rows as any[];
    } finally {
      conn.release();
    }
  }

  async getProductPurchaseHistory(supplierId: number, productId: number): Promise<any[]> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT p.id as purchaseId, p.purchase_date, pi.product_id, pi.quantity, pi.unit_price
         FROM purchases p
         JOIN purchase_items pi ON p.id = pi.purchase_id
         WHERE p.supplier_id = ? AND pi.product_id = ?
         ORDER BY p.purchase_date DESC`,
        [supplierId, productId]
      );
      return rows as any[];
    } finally {
      conn.release();
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const conn = await pool.getConnection();
    try {
      console.log("Creating supplier with data:", supplier);

      // Check if the suppliers table exists and has the expected columns
      let hasTagsColumn = false;
      try {
        const [columns] = await conn.execute(`SHOW COLUMNS FROM suppliers`);
        hasTagsColumn = (columns as any[]).some(col => col.Field === 'tags');
        if (!hasTagsColumn) {
          await conn.execute(`ALTER TABLE suppliers ADD COLUMN tags JSON DEFAULT '[]'`);
          hasTagsColumn = true;
        }
      } catch (error) {
        console.error("Error checking supplier table structure:", error);
      }

      const fields = [];
      const placeholders = [];
      const values = [];

      fields.push('name');
      placeholders.push('?');
      values.push(supplier.name);

      if (supplier.contactName !== undefined) {
        fields.push('contact_name');
        placeholders.push('?');
        values.push(supplier.contactName);
      }

      if (supplier.phone !== undefined) {
        fields.push('phone');
        placeholders.push('?');
        values.push(supplier.phone);
      }

      if (supplier.email !== undefined) {
        fields.push('email');
        placeholders.push('?');
        values.push(supplier.email);
      }

      if (supplier.address !== undefined) {
        fields.push('address');
        placeholders.push('?');
        values.push(supplier.address);
      }

      fields.push('is_active');
      placeholders.push('?');
      values.push(supplier.isActive !== undefined ? (supplier.isActive ? 1 : 0) : 1);

      if (supplier.creditLimit !== undefined) {
        fields.push('credit_limit');
        placeholders.push('?');
        values.push(supplier.creditLimit);
      }

      fields.push('balance_due');
      placeholders.push('?');
      values.push(supplier.balanceDue || 0);

      fields.push('total_paid');
      placeholders.push('?');
      values.push(supplier.totalPaid || 0);

      if (supplier.notes !== undefined) {
        fields.push('notes');
        placeholders.push('?');
        values.push(supplier.notes);
      }

      if (supplier.rating !== undefined) {
        fields.push('rating');
        placeholders.push('?');
        values.push(supplier.rating);
      }

      if (supplier.tags !== undefined) {
        fields.push('tags');
        placeholders.push('?');
        values.push(JSON.stringify(supplier.tags));
      }

      const query = `INSERT INTO suppliers (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      const [result] = await conn.execute(query, values);
      const insertId = (result as any).insertId;
      const [rows] = await conn.execute(`SELECT * FROM suppliers WHERE id = ?`, [insertId]);
      const dbSupplier = (rows as any[])[0];

      let tags = [];
      if (dbSupplier.tags) {
        try {
          // First try to parse as JSON
          tags = JSON.parse(dbSupplier.tags);
        } catch (error) {
          console.error("Error parsing supplier tags:", error);
          // If JSON parsing fails, try to handle as comma-separated string
          if (typeof dbSupplier.tags === 'string') {
            tags = dbSupplier.tags.split(',').map((tag: string) => tag.trim());

            // Update the database with the correct JSON format
            try {
              const jsonTags = JSON.stringify(tags);
              conn.execute(
                `UPDATE suppliers SET tags = ? WHERE id = ?`,
                [jsonTags, dbSupplier.id]
              ).catch(err => console.error("Failed to update tags format:", err));
            } catch (updateError) {
              console.error("Failed to format tags for update:", updateError);
            }
          } else {
            tags = [];
          }
        }
      }

      const newSupplier = {
        id: dbSupplier.id,
        name: dbSupplier.name,
        contactName: dbSupplier.contact_name,
        email: dbSupplier.email,
        phone: dbSupplier.phone,
        address: dbSupplier.address,
        isActive: dbSupplier.is_active === 1,
        paymentTerms: dbSupplier.payment_terms,
        creditLimit: dbSupplier.credit_limit,
        balanceDue: dbSupplier.balance_due,
        totalPaid: dbSupplier.total_paid,
        notes: dbSupplier.notes,
        rating: dbSupplier.rating,
        tags: tags,
        createdAt: dbSupplier.created_at,
        updatedAt: dbSupplier.updated_at
      };

      return newSupplier as Supplier;
    } finally {
      conn.release();
    }
  }

  async updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | undefined> {
    const conn = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      if (supplier.name !== undefined) {
        fields.push('name = ?');
        values.push(supplier.name);
      }
      if (supplier.contactName !== undefined) {
        fields.push('contact_name = ?');
        values.push(supplier.contactName);
      }
      if (supplier.email !== undefined) {
        fields.push('email = ?');
        values.push(supplier.email);
      }
      if (supplier.phone !== undefined) {
        fields.push('phone = ?');
        values.push(supplier.phone);
      }
      if (supplier.address !== undefined) {
        fields.push('address = ?');
        values.push(supplier.address);
      }
      if (supplier.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(supplier.isActive ? 1 : 0);
      }
      if (supplier.paymentTerms !== undefined) {
        fields.push('payment_terms = ?');
        values.push(supplier.paymentTerms);
      }
      if (supplier.creditLimit !== undefined) {
        fields.push('credit_limit = ?');
        values.push(supplier.creditLimit);
      }
      if (supplier.balanceDue !== undefined) {
        fields.push('balance_due = ?');
        values.push(supplier.balanceDue);
      }
      if (supplier.totalPaid !== undefined) {
        fields.push('total_paid = ?');
        values.push(supplier.totalPaid);
      }
      if (supplier.notes !== undefined) {
        fields.push('notes = ?');
        values.push(supplier.notes);
      }
      if (supplier.rating !== undefined) {
        fields.push('rating = ?');
        values.push(supplier.rating);
      }
      if (supplier.tags !== undefined) {
        fields.push('tags = ?');
        values.push(JSON.stringify(supplier.tags));
      }

      if (fields.length === 0) {
        return undefined;
      }

      values.push(id);
      const query = `UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`;
      const [result] = await conn.execute(query, values);
      const affectedRows = (result as any).affectedRows;

      if (affectedRows === 0) {
        return undefined;
      }

      const [rows] = await conn.execute(`SELECT * FROM suppliers WHERE id = ?`, [id]);
      const dbSupplier = (rows as any[])[0];

      let tags = [];
      if (dbSupplier.tags) {
        try {
          // First try to parse as JSON
          tags = JSON.parse(dbSupplier.tags);
        } catch (error) {
          console.error("Error parsing supplier tags:", error);
          // If JSON parsing fails, try to handle as comma-separated string
          if (typeof dbSupplier.tags === 'string') {
            tags = dbSupplier.tags.split(',').map((tag: string) => tag.trim());

            // Update the database with the correct JSON format
            try {
              const jsonTags = JSON.stringify(tags);
              conn.execute(
                `UPDATE suppliers SET tags = ? WHERE id = ?`,
                [jsonTags, dbSupplier.id]
              ).catch(err => console.error("Failed to update tags format:", err));
            } catch (updateError) {
              console.error("Failed to format tags for update:", updateError);
            }
          } else {
            tags = [];
          }
        }
      }

      const updatedSupplier = {
        id: dbSupplier.id,
        name: dbSupplier.name,
        contactName: dbSupplier.contact_name,
        email: dbSupplier.email,
        phone: dbSupplier.phone,
        address: dbSupplier.address,
        isActive: dbSupplier.is_active === 1,
        paymentTerms: dbSupplier.payment_terms,
        creditLimit: dbSupplier.credit_limit,
        balanceDue: dbSupplier.balance_due,
        totalPaid: dbSupplier.total_paid,
        notes: dbSupplier.notes,
        rating: dbSupplier.rating,
        tags: tags,
        createdAt: dbSupplier.created_at,
        updatedAt: dbSupplier.updated_at
      };

      return updatedSupplier as Supplier;
    } finally {
      conn.release();
    }
  }

  async deleteSupplier(id: number, forceDelete: boolean = false): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      console.log(`Deleting supplier ${id}, forceDelete=${forceDelete}`);

      // Start a transaction
      await conn.beginTransaction();

      if (forceDelete) {
        console.log(`Force deleting supplier ${id} - using direct method with foreign key checks disabled`);

        try {
          // Temporarily disable foreign key checks
          console.log("Disabling foreign key checks");
          await conn.execute("SET FOREIGN_KEY_CHECKS=0");

          // Delete purchase items related to this supplier's purchases
          console.log(`Deleting purchase items for supplier ${id}`);
          // Delete inventory items for this supplier
          console.log(`Deleting inventory items for supplier ${id}`);
          await conn.execute(`DELETE FROM inventory WHERE supplier_id = ?`, [id]);

          // Delete purchase items
          await conn.execute(`
            DELETE pi FROM purchase_items pi
            JOIN purchases p ON pi.purchase_id = p.id
            WHERE p.supplier_id = ?
          `, [id]);

          // Delete purchases
          console.log(`Deleting purchases for supplier ${id}`);
          await conn.execute(`DELETE FROM purchases WHERE supplier_id = ?`, [id]);

          // Delete transactions
          console.log(`Deleting transactions for supplier ${id}`);
          await conn.execute(`DELETE FROM transactions WHERE supplier_id = ?`, [id]);

          // Delete the supplier
          console.log(`Deleting supplier ${id} from suppliers table`);
          const [result] = await conn.execute(`DELETE FROM suppliers WHERE id = ?`, [id]);
          const affectedRows = (result as any).affectedRows;

          // Re-enable foreign key checks
          console.log("Re-enabling foreign key checks");
          await conn.execute("SET FOREIGN_KEY_CHECKS=1");

          // Commit the transaction
          await conn.commit();
          console.log(`Transaction committed successfully for supplier ${id}`);

          return affectedRows > 0;
        } catch (error) {
          console.error(`Error in force delete for supplier ${id}:`, error);

          // Make sure to re-enable foreign key checks even if there's an error
          try {
            await conn.execute("SET FOREIGN_KEY_CHECKS=1");
          } catch (fkError) {
            console.error("Error re-enabling foreign key checks:", fkError);
          }

          await conn.rollback();
          throw error;
        }
      } else {
        // Regular delete (without force)
        console.log(`Regular delete for supplier ${id}`);

        // Try to delete the supplier
        const [result] = await conn.execute(`DELETE FROM suppliers WHERE id = ?`, [id]);
        const affectedRows = (result as any).affectedRows;

        // Commit the transaction
        await conn.commit();
        console.log(`Transaction committed successfully for supplier ${id}`);

        return affectedRows > 0;
      }
    } catch (error) {
      // Rollback in case of error
      console.error(`Error in deleteSupplier for ID ${id}:`, error);
      try {
        await conn.rollback();
        console.log(`Transaction rolled back for supplier ${id}`);
      } catch (rollbackError) {
        console.error(`Error rolling back transaction:`, rollbackError);
      }
      throw error;
    } finally {
      conn.release();
    }
  }

  // Category Management
  async getCategory(id: number): Promise<Category | undefined> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(`SELECT * FROM categories WHERE id = ?`, [id]);
      const dbCategory = (rows as any[])[0];

      if (!dbCategory) {
        return undefined;
      }

      // Map database fields to camelCase for the client
      const category = {
        id: dbCategory.id,
        name: dbCategory.name,
        description: dbCategory.description
      };

      return category as Category;
    } finally {
      conn.release();
    }
  }

  async getCategories(): Promise<Category[]> {
    const conn = await pool.getConnection();
    try {
      try {
        // Check if the categories table exists
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'categories'`);
        if ((tables as any[]).length === 0) {
          console.log("Categories table doesn't exist, creating it...");
          await conn.execute(`
            CREATE TABLE categories (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL UNIQUE,
              description TEXT
            )
          `);
          console.log("Categories table created successfully");
          return []; // Return empty array since we just created the table
        }

        const [rows] = await conn.execute(`SELECT * FROM categories`);
        console.log("Retrieved categories:", rows);

        // Map database fields to camelCase for the client
        const categories = (rows as any[]).map(category => {
          return {
            id: category.id,
            name: category.name,
            description: category.description
          };
        });

        return categories as Category[];
      } catch (err) {
        const error = err as Error;
        console.error("Error in getCategories:", error);
        throw error;
      }
    } finally {
      conn.release();
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const conn = await pool.getConnection();
    try {
      console.log("Creating category with data:", category);

      try {
        // Check if the categories table exists
        try {
          const [tables] = await conn.execute(`SHOW TABLES LIKE 'categories'`);
          if ((tables as any[]).length === 0) {
            console.log("Categories table doesn't exist, creating it...");
            await conn.execute(`
              CREATE TABLE categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT
              )
            `);
            console.log("Categories table created successfully");
          }
        } catch (error) {
          const tableError = error as Error;
          console.error("Error checking/creating categories table:", tableError);
          throw new Error(`Table check error: ${tableError.message}`);
        }

        const fields = [];
        const placeholders = [];
        const values = [];

        fields.push('name');
        placeholders.push('?');
        values.push(category.name);

        if (category.description !== undefined && category.description !== null) {
          fields.push('description');
          placeholders.push('?');
          values.push(category.description);
        }

        console.log("Executing query with fields:", fields);
        console.log("Values:", values);

        const query = `INSERT INTO categories (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        console.log("SQL Query:", query);

        const [result] = await conn.execute(query, values);
        console.log("Insert result:", result);

        const insertId = (result as any).insertId;
        const [rows] = await conn.execute(`SELECT * FROM categories WHERE id = ?`, [insertId]);
        const dbCategory = (rows as any[])[0];
        console.log("Retrieved category:", dbCategory);

        const newCategory = {
          id: dbCategory.id,
          name: dbCategory.name,
          description: dbCategory.description
        };

        return newCategory as Category;
      } catch (err) {
        const error = err as Error;
        console.error("Error in createCategory:", error);
        // Check if the error is related to the table structure
        if (error.message && error.message.includes("Unknown column")) {
          console.error("Table structure issue detected. Error details:", error.message);
        }
        throw error; // Re-throw to be caught by the outer try-catch
      }
    } catch (outerError) {
      console.error("Failed to create category:", outerError);
      throw outerError; // Re-throw to be handled by the caller
    } finally {
      conn.release();
    }
  }

  // Product Management
  async getProduct(id: number): Promise<Spice | undefined> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(`SELECT * FROM products WHERE id = ?`, [id]);
      const dbProduct = (rows as any[])[0];

      if (!dbProduct) {
        return undefined;
      }

      // Map database fields to camelCase for the client
      const product = {
        id: dbProduct.id,
        name: dbProduct.name,
        categoryId: dbProduct.category_id,
        origin: dbProduct.origin,
        description: dbProduct.description,
        price: dbProduct.price,
        unit: dbProduct.unit,
        stocksQty: dbProduct.stocks_qty,
        isActive: dbProduct.is_active === 1,
        imagePath: dbProduct.image_path
      };

      return product as Spice;
    } finally {
      conn.release();
    }
  }

  // For backward compatibility
  async getSpice(id: number): Promise<Spice | undefined> {
    return this.getProduct(id);
  }

  async getProducts(): Promise<Spice[]> {
    const conn = await pool.getConnection();
    try {
      try {
        // Check if the products table exists
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'products'`);
        if ((tables as any[]).length === 0) {
          console.log("Products table doesn't exist, creating it...");
          await conn.execute(`
            CREATE TABLE products (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              category_id INT NOT NULL,
              origin VARCHAR(255),
              description TEXT,
              price DECIMAL(10,2) DEFAULT 0,
              unit VARCHAR(50) DEFAULT 'kg',
              stocks_qty INT DEFAULT 0,
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              image_path VARCHAR(255)
            )
          `);
          console.log("Products table created successfully");
          return []; // Return empty array since we just created the table
        }

        const [rows] = await conn.execute(`SELECT * FROM products`);
        console.log("Retrieved products:", rows);

        // Map database fields to camelCase for the client
        const products = (rows as any[]).map(product => {
          return {
            id: product.id,
            name: product.name,
            categoryId: product.category_id,
            origin: product.origin,
            description: product.description,
            price: product.price,
            unit: product.unit,
            stocksQty: product.stocks_qty,
            isActive: product.is_active === 1,
            imagePath: product.image_path
          };
        });

        return products as Spice[];
      } catch (err) {
        const error = err as Error;
        console.error("Error in getProducts:", error);
        throw error;
      }
    } finally {
      conn.release();
    }
  }

  // For backward compatibility
  async getSpices(): Promise<Spice[]> {
    return this.getProducts();
  }

  async createProduct(product: InsertSpice): Promise<Spice> {
    const conn = await pool.getConnection();
    try {
      console.log("Creating product with data:", JSON.stringify(product, null, 2));

      try {
        // First, ensure the products table exists with the correct structure
        try {
          // Check if table exists
          const [tables] = await conn.execute(`SHOW TABLES LIKE 'products'`);

          if ((tables as any[]).length === 0) {
            console.log("Products table doesn't exist, creating it...");
            await conn.execute(`
              CREATE TABLE products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category_id INT NOT NULL,
                origin VARCHAR(255),
                description TEXT,
                price DECIMAL(10,2) DEFAULT 0,
                unit VARCHAR(50) DEFAULT 'kg',
                stocks_qty INT DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                image_path VARCHAR(255)
              )
            `);
            console.log("Products table created successfully");
          } else {
            // Table exists, check its structure
            console.log("Products table exists, checking structure...");
            const [columns] = await conn.execute(`DESCRIBE products`);
            console.log("Current table structure:", columns);

            // Check for required columns and add them if missing
            const columnNames = (columns as any[]).map(col => col.Field);

            if (!columnNames.includes('category_id')) {
              console.log("Adding missing column: category_id");
              await conn.execute(`ALTER TABLE products ADD COLUMN category_id INT NOT NULL DEFAULT 1`);
            }

            if (!columnNames.includes('is_active')) {
              console.log("Adding missing column: is_active");
              await conn.execute(`ALTER TABLE products ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE`);
            }

            if (!columnNames.includes('stocks_qty')) {
              console.log("Adding missing column: stocks_qty");
              await conn.execute(`ALTER TABLE products ADD COLUMN stocks_qty INT DEFAULT 0`);
            }

            if (!columnNames.includes('image_path')) {
              console.log("Adding missing column: image_path");
              await conn.execute(`ALTER TABLE products ADD COLUMN image_path VARCHAR(255)`);
            }
          }
        } catch (error) {
          const tableError = error as Error;
          console.error("Error checking/creating products table:", tableError);
          throw new Error(`Table check error: ${tableError.message}`);
        }

        // Validate required fields
        if (!product.name) {
          throw new Error("Product name is required");
        }

        if (product.categoryId === undefined || product.categoryId === null) {
          console.warn("Category ID is missing, using default category ID 1");
          product.categoryId = 1;
        }

        // Prepare fields for insertion
        const fields = [];
        const placeholders = [];
        const values = [];

        // Required fields
        fields.push('name');
        placeholders.push('?');
        values.push(product.name);

        fields.push('category_id');
        placeholders.push('?');
        values.push(product.categoryId);

        // Optional fields with type conversion
        if (product.origin !== undefined) {
          fields.push('origin');
          placeholders.push('?');
          values.push(String(product.origin));
        }

        if (product.description !== undefined) {
          fields.push('description');
          placeholders.push('?');
          values.push(String(product.description));
        }

        if (product.price !== undefined) {
          fields.push('price');
          placeholders.push('?');
          // Convert to number and handle potential NaN
          const price = Number(product.price);
          values.push(isNaN(price) ? 0 : price);
        }

        if (product.unit !== undefined) {
          fields.push('unit');
          placeholders.push('?');
          values.push(String(product.unit));
        }

        if (product.stocksQty !== undefined) {
          fields.push('stocks_qty');
          placeholders.push('?');
          // Convert to integer and handle potential NaN
          const stocksQty = parseInt(String(product.stocksQty));
          values.push(isNaN(stocksQty) ? 0 : stocksQty);
        }

        fields.push('is_active');
        placeholders.push('?');
        values.push(product.isActive !== undefined ? (product.isActive ? 1 : 0) : 1);

        if (product.imagePath !== undefined) {
          fields.push('image_path');
          placeholders.push('?');
          values.push(String(product.imagePath));
        }

        console.log("Executing query with fields:", fields);
        console.log("Values:", values);

        // Construct and execute the query
        const query = `INSERT INTO products (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        console.log("SQL Query:", query);

        try {
          const [result] = await conn.execute(query, values);
          console.log("Insert result:", result);

          const insertId = (result as any).insertId;
          if (!insertId) {
            throw new Error("Failed to get insert ID after product creation");
          }

          // Retrieve the newly created product
          const [rows] = await conn.execute(`SELECT * FROM products WHERE id = ?`, [insertId]);
          const dbProduct = (rows as any[])[0];

          if (!dbProduct) {
            throw new Error(`Product with ID ${insertId} not found after creation`);
          }

          console.log("Retrieved product:", dbProduct);

          // Map database fields to camelCase for the client
          const newProduct = {
            id: dbProduct.id,
            name: dbProduct.name,
            categoryId: dbProduct.category_id,
            origin: dbProduct.origin,
            description: dbProduct.description,
            price: dbProduct.price,
            unit: dbProduct.unit,
            stocksQty: dbProduct.stocks_qty,
            isActive: dbProduct.is_active === 1,
            imagePath: dbProduct.image_path
          };

          return newProduct as Spice;
        } catch (sqlError) {
          const error = sqlError as Error;
          console.error("SQL execution error:", error);

          // Check for specific MySQL errors
          if (error.message.includes("Duplicate entry")) {
            throw new Error("A product with this name already exists");
          } else if (error.message.includes("foreign key constraint")) {
            throw new Error("The specified category does not exist");
          }

          throw error;
        }
      } catch (err) {
        const error = err as Error;
        console.error("Error in createProduct:", error);

        // Provide more specific error messages based on the error type
        if (error.message && error.message.includes("Unknown column")) {
          console.error("Table structure issue detected. Error details:", error.message);

          // Try to extract the column name from the error message
          const match = error.message.match(/Unknown column '([^']+)'/);
          if (match && match[1]) {
            const columnName = match[1];
            throw new Error(`Missing column in products table: ${columnName}. Please contact the administrator.`);
          }
        }

        throw error; // Re-throw to be caught by the outer try-catch
      }
    } catch (outerError) {
      console.error("Failed to create product:", outerError);
      throw outerError; // Re-throw to be handled by the caller
    } finally {
      conn.release();
    }
  }

  // For backward compatibility
  async createSpice(product: InsertSpice): Promise<Spice> {
    return this.createProduct(product);
  }

  async updateProduct(id: number, product: Partial<Spice>): Promise<Spice | undefined> {
    const conn = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      if (product.name !== undefined) {
        fields.push('name = ?');
        values.push(product.name);
      }
      if (product.categoryId !== undefined) {
        fields.push('category_id = ?');
        values.push(product.categoryId);
      }
      if (product.origin !== undefined) {
        fields.push('origin = ?');
        values.push(product.origin);
      }
      if (product.description !== undefined) {
        fields.push('description = ?');
        values.push(product.description);
      }
      if (product.price !== undefined) {
        fields.push('price = ?');
        values.push(product.price);
      }
      if (product.unit !== undefined) {
        fields.push('unit = ?');
        values.push(product.unit);
      }
      if (product.stocksQty !== undefined) {
        fields.push('stocks_qty = ?');
        values.push(product.stocksQty);
      }
      if (product.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(product.isActive ? 1 : 0);
      }
      if (product.imagePath !== undefined) {
        fields.push('image_path = ?');
        values.push(product.imagePath);
      }

      if (fields.length === 0) {
        return undefined;
      }

      values.push(id);
      const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
      const [result] = await conn.execute(query, values);
      const affectedRows = (result as any).affectedRows;

      if (affectedRows === 0) {
        return undefined;
      }

      const [rows] = await conn.execute(`SELECT * FROM products WHERE id = ?`, [id]);
      const dbProduct = (rows as any[])[0];

      const updatedProduct = {
        id: dbProduct.id,
        name: dbProduct.name,
        categoryId: dbProduct.category_id,
        origin: dbProduct.origin,
        description: dbProduct.description,
        price: dbProduct.price,
        unit: dbProduct.unit,
        stocksQty: dbProduct.stocks_qty,
        isActive: dbProduct.is_active === 1,
        imagePath: dbProduct.image_path
      };

      return updatedProduct as Spice;
    } finally {
      conn.release();
    }
  }

  // For backward compatibility
  async updateSpice(id: number, product: Partial<Spice>): Promise<Spice | undefined> {
    return this.updateProduct(id, product);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute(`DELETE FROM products WHERE id = ?`, [id]);
      const affectedRows = (result as any).affectedRows;
      return affectedRows > 0;
    } finally {
      conn.release();
    }
  }

  // For backward compatibility
  async deleteSpice(id: number): Promise<boolean> {
    return this.deleteProduct(id);
  }

  async getProductsByCategory(categoryId: number): Promise<Spice[]> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(`SELECT * FROM products WHERE category_id = ?`, [categoryId]);

      // Map database fields to camelCase for the client
      const products = (rows as any[]).map(product => {
        return {
          id: product.id,
          name: product.name,
          categoryId: product.category_id,
          origin: product.origin,
          description: product.description,
          price: product.price,
          unit: product.unit,
          stocksQty: product.stocks_qty,
          isActive: product.is_active === 1,
          imagePath: product.image_path
        };
      });

      return products as Spice[];
    } finally {
      conn.release();
    }
  }

  // For backward compatibility
  async getSpicesByCategory(categoryId: number): Promise<Spice[]> {
    return this.getProductsByCategory(categoryId);
  }

  // Get average price for a product from inventory
  async getProductAveragePrice(productName: string): Promise<number | null> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching average price for product: ${productName}`);

      // First, check if inventory table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'inventory'`);
      if ((tables as any[]).length === 0) {
        console.log("Inventory table doesn't exist yet");
        return null;
      }

      // Get the product ID from the name
      const [productRows] = await conn.execute(
        `SELECT id FROM products WHERE name = ?`,
        [productName]
      );

      if ((productRows as any[]).length === 0) {
        console.log(`No product found with name: ${productName}`);
        return null;
      }

      const productId = (productRows as any[])[0].id;

      // Calculate average unit price from inventory for this product
      const [avgPriceRows] = await conn.execute(
        `SELECT AVG(unit_price) as avg_price
         FROM inventory
         WHERE product_id = ? AND status = 'active'`,
        [productId]
      );

      const avgPrice = (avgPriceRows as any[])[0].avg_price;
      console.log(`Average price for product ${productName} (ID: ${productId}): ${avgPrice}`);

      return avgPrice ? parseFloat(avgPrice) : null;
    } catch (error) {
      console.error(`Error fetching average price for product ${productName}:`, error);
      return null;
    } finally {
      conn.release();
    }
  }

  // Transaction Management
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(`SELECT * FROM transactions WHERE id = ?`, [id]);
      const dbTransaction = (rows as any[])[0];

      if (!dbTransaction) {
        return undefined;
      }

      // Map database fields to camelCase for the client
      const transaction = {
        id: dbTransaction.id,
        supplierId: dbTransaction.supplier_id,
        invoiceId: dbTransaction.invoice_id,
        amount: dbTransaction.amount,
        transactionDate: dbTransaction.transaction_date,
        type: dbTransaction.type,
        notes: dbTransaction.notes
      };

      return transaction as Transaction;
    } finally {
      conn.release();
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(`SELECT * FROM transactions`);

      // Map database fields to camelCase for the client
      const transactions = (rows as any[]).map(transaction => {
        return {
          id: transaction.id,
          supplierId: transaction.supplier_id,
          invoiceId: transaction.invoice_id,
          amount: transaction.amount,
          transactionDate: transaction.transaction_date,
          type: transaction.type,
          notes: transaction.notes
        };
      });

      return transactions as Transaction[];
    } finally {
      conn.release();
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const conn = await pool.getConnection();
    try {
      console.log("Creating transaction with data:", transaction);

      // Check if the transactions table exists
      try {
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'transactions'`);
        if ((tables as any[]).length === 0) {
          console.log("Transactions table doesn't exist, creating it...");
          await conn.execute(`
            CREATE TABLE transactions (
              id INT AUTO_INCREMENT PRIMARY KEY,
              supplier_id INT NOT NULL,
              invoice_id INT,
              amount DECIMAL(10,2) NOT NULL,
              transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              type VARCHAR(50) NOT NULL,
              notes TEXT
            )
          `);
          console.log("Transactions table created successfully");
        }
      } catch (error) {
        console.error("Error checking transactions table:", error);
        throw error;
      }

      // Prepare fields for insertion
      const fields = [];
      const placeholders = [];
      const values = [];

      // Required fields
      fields.push('supplier_id');
      placeholders.push('?');
      values.push(transaction.supplierId);

      fields.push('amount');
      placeholders.push('?');
      values.push(transaction.amount);

      fields.push('type');
      placeholders.push('?');
      values.push(transaction.type);

      // Optional fields
      if (transaction.invoiceId !== undefined) {
        fields.push('invoice_id');
        placeholders.push('?');
        values.push(transaction.invoiceId);
      }

      if (transaction.transactionDate !== undefined) {
        fields.push('transaction_date');
        placeholders.push('?');
        values.push(transaction.transactionDate);
      }

      if (transaction.notes !== undefined) {
        fields.push('notes');
        placeholders.push('?');
        values.push(transaction.notes);
      }

      // Construct and execute the query
      const query = `INSERT INTO transactions (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      const [result] = await conn.execute(query, values);
      const insertId = (result as any).insertId;

      // Retrieve the newly created transaction
      const [rows] = await conn.execute(`SELECT * FROM transactions WHERE id = ?`, [insertId]);
      const dbTransaction = (rows as any[])[0];

      // Map database fields to camelCase for the client
      const newTransaction = {
        id: dbTransaction.id,
        supplierId: dbTransaction.supplier_id,
        invoiceId: dbTransaction.invoice_id,
        amount: dbTransaction.amount,
        transactionDate: dbTransaction.transaction_date,
        type: dbTransaction.type,
        notes: dbTransaction.notes
      };

      return newTransaction as Transaction;
    } finally {
      conn.release();
    }
  }

  async getTransactionsBySupplier(supplierId: number, type?: string): Promise<Transaction[]> {
    const conn = await pool.getConnection();
    try {
      let query = `SELECT * FROM transactions WHERE supplier_id = ?`;
      const params = [supplierId];

      if (type) {
        query += ` AND type = ?`;
        params.push(type as any);
      }

      query += ` ORDER BY transaction_date DESC`;

      const [rows] = await conn.execute(query, params);

      // Map database fields to camelCase for the client
      const transactions = (rows as any[]).map(transaction => {
        return {
          id: transaction.id,
          supplierId: transaction.supplier_id,
          invoiceId: transaction.invoice_id,
          amount: transaction.amount,
          transactionDate: transaction.transaction_date,
          type: transaction.type,
          notes: transaction.notes
        };
      });

      return transactions as Transaction[];
    } finally {
      conn.release();
    }
  }
}

// Create and export a singleton instance of MemStorage
export const storage = new MemStorage();

