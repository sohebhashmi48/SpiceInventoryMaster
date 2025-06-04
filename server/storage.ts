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
  DistributionWithItems,
  CustomerBill, InsertCustomerBill,
  CustomerBillItem, InsertCustomerBillItem,
  CustomerBillWithItems
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session, { Store } from "express-session";
import { nanoid } from "nanoid";
import crypto from "crypto";

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
  getInventoryAnalytics(): Promise<any>;

  // Inventory history management
  getInventoryHistory(inventoryId?: number, productId?: number): Promise<any[]>;
  createInventoryHistoryEntry(entry: any): Promise<any>;

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

  // Payment reminders
  getPaymentReminders(): Promise<PaymentReminder[]>;
  getPaymentReminder(id: string): Promise<PaymentReminder | undefined>;
  createPaymentReminder(reminder: InsertPaymentReminder): Promise<PaymentReminder>;
  updatePaymentReminder(id: string, updates: Partial<PaymentReminder>): Promise<PaymentReminder | undefined>;
  deletePaymentReminder(id: string): Promise<boolean>;

  // Customer billing
  getCustomerBills(options?: {
    page?: number;
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: CustomerBill[]; pagination: any }>;
  getCustomerBill(id: number): Promise<CustomerBill | undefined>;
  createCustomerBill(bill: CustomerBillWithItems): Promise<CustomerBill>;
  updateCustomerBill(id: number, bill: Partial<CustomerBillWithItems>): Promise<CustomerBill | undefined>;
  deleteCustomerBill(id: number): Promise<boolean>;
}

export interface PaymentReminder {
  id: string;
  catererId: number;
  distributionId?: number;
  amount: number;
  originalDueDate: Date;
  reminderDate: Date;
  nextReminderDate?: Date;
  status: 'pending' | 'overdue' | 'due_today' | 'upcoming';
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertPaymentReminder {
  catererId: number;
  distributionId?: number;
  amount: number;
  originalDueDate: Date;
  reminderDate: Date;
  nextReminderDate?: Date;
  status?: string;
  notes?: string;
}

export class MemStorage implements IStorage {
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
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching purchases for supplier ID: ${supplierId}`);

      // Check if the purchases table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'purchases'`);
      if ((tables as any[]).length === 0) {
        console.log("Purchases table doesn't exist yet");
        return [];
      }

      const [rows] = await conn.execute(`
        SELECT p.*, s.name as supplier_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.supplier_id = ?
        ORDER BY p.purchase_date DESC
      `, [supplierId]);

      // Map database fields to camelCase for the client
      const purchases = (rows as any[]).map(purchase => {
        return {
          id: purchase.id,
          companyName: purchase.company_name,
          companyAddress: purchase.company_address,
          billNo: purchase.bill_no,
          pageNo: purchase.page_no,
          supplierId: purchase.supplier_id,
          supplierName: purchase.supplier_name,
          purchaseDate: purchase.purchase_date,
          totalAmount: purchase.total_amount,
          totalGstAmount: purchase.total_gst_amount,
          grandTotal: purchase.grand_total,
          notes: purchase.notes,
          receiptImage: purchase.receipt_image,
          status: purchase.status,
          createdAt: purchase.created_at
        };
      });

      return purchases as Purchase[];
    } catch (error) {
      console.error(`Error fetching purchases for supplier ID ${supplierId}:`, error);
      throw error;
    } finally {
      conn.release();
    }
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
      // Only show active items with quantity > 0 by default
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
          AND i.quantity > 0
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

  async getInventoryAnalytics(): Promise<any> {
    const conn = await this.getConnection();
    try {
      // Get product distribution by category
      const [categoryDistribution] = await conn.execute(`
        SELECT c.name as category, COUNT(p.id) as count
        FROM products p
        JOIN categories c ON p.category_id = c.id
        GROUP BY p.category_id
        ORDER BY count DESC
      `);

      // Get stock levels (low stock vs adequate stock)
      const [stockLevels] = await conn.execute(`
        SELECT
          SUM(CASE WHEN stocks_qty <= 10 THEN 1 ELSE 0 END) as lowStock,
          SUM(CASE WHEN stocks_qty > 10 THEN 1 ELSE 0 END) as adequateStock
        FROM products
      `);

      // Get top 10 products by quantity
      const [topProducts] = await conn.execute(`
        SELECT name, stocks_qty, unit
        FROM products
        ORDER BY stocks_qty DESC
        LIMIT 10
      `);

      // Get total inventory value
      const [totalValue] = await conn.execute(`
        SELECT SUM(i.quantity * i.unit_price) as totalValue
        FROM inventory i
      `);

      // Get low stock count
      const [lowStockCount] = await conn.execute(`
        SELECT COUNT(*) as count
        FROM products
        WHERE stocks_qty <= 10
      `);

      // Get most and least stocked products
      const [mostStocked] = await conn.execute(`
        SELECT name, stocks_qty, unit
        FROM products
        WHERE stocks_qty > 0
        ORDER BY stocks_qty DESC
        LIMIT 1
      `);

      const [leastStocked] = await conn.execute(`
        SELECT name, stocks_qty, unit
        FROM products
        WHERE stocks_qty > 0
        ORDER BY stocks_qty ASC
        LIMIT 1
      `);

      // Get inventory trends over time (last 6 months)
      const [inventoryTrends] = await conn.execute(`
        SELECT
          DATE_FORMAT(purchase_date, '%Y-%m') as month,
          SUM(quantity) as totalQuantity,
          SUM(quantity * unit_price) as totalValue
        FROM inventory
        WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(purchase_date, '%Y-%m')
        ORDER BY month ASC
      `);

      // 1. Profit Margins & Cost Analysis
      const [profitMargins] = await conn.execute(`
        SELECT
          p.id,
          p.name,
          p.unit,
          AVG(i.unit_price) as avgPurchasePrice,
          p.market_price as sellingPrice,
          (p.market_price - AVG(i.unit_price)) as profitPerUnit,
          ((p.market_price - AVG(i.unit_price)) / NULLIF(AVG(i.unit_price), 0) * 100) as marginPercentage
        FROM
          products p
        JOIN
          inventory i ON p.id = i.product_id
        GROUP BY
          p.id, p.name, p.unit, p.market_price
        HAVING
          AVG(i.unit_price) > 0
        ORDER BY
          marginPercentage DESC
        LIMIT 10
      `);

      // 2. Expiry & Storage Insights
      const [expiryInsights] = await conn.execute(`
        SELECT
          p.name,
          i.quantity,
          p.unit,
          i.expiry_date,
          DATEDIFF(i.expiry_date, CURDATE()) as daysUntilExpiry
        FROM
          inventory i
        JOIN
          products p ON i.product_id = p.id
        WHERE
          i.expiry_date IS NOT NULL
          AND i.expiry_date > CURDATE()
          AND i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
        ORDER BY
          daysUntilExpiry ASC
        LIMIT 10
      `);

      // 3. Supplier Reliability Metrics
      // This is a simplified version since we don't have actual delivery dates
      const [supplierReliability] = await conn.execute(`
        SELECT
          s.name as supplierName,
          COUNT(i.id) as totalOrders,
          SUM(i.quantity) as totalQuantity,
          AVG(i.unit_price) as avgUnitPrice
        FROM
          inventory i
        JOIN
          suppliers s ON i.supplier_id = s.id
        GROUP BY
          s.id, s.name
        ORDER BY
          totalOrders DESC
        LIMIT 5
      `);

      // 4. Product Purchase Frequency
      const [purchaseFrequency] = await conn.execute(`
        SELECT
          p.name,
          COUNT(DISTINCT pi.purchase_id) as purchaseCount,
          SUM(pi.quantity) as totalQuantity,
          p.unit
        FROM
          purchase_items pi
        JOIN
          products p ON pi.item_name = p.name
        GROUP BY
          p.name, p.unit
        ORDER BY
          purchaseCount DESC
        LIMIT 10
      `);

      // 5. Product Co-purchase Analysis (simplified)
      // This query finds products that are frequently purchased together
      const [coPurchaseAnalysis] = await conn.execute(`
        SELECT
          p1.name as product1,
          p2.name as product2,
          COUNT(DISTINCT pi1.purchase_id) as purchasedTogether
        FROM
          purchase_items pi1
        JOIN
          purchase_items pi2 ON pi1.purchase_id = pi2.purchase_id AND pi1.id < pi2.id
        JOIN
          products p1 ON pi1.item_name = p1.name
        JOIN
          products p2 ON pi2.item_name = p2.name
        GROUP BY
          p1.name, p2.name
        HAVING
          COUNT(DISTINCT pi1.purchase_id) > 1
        ORDER BY
          purchasedTogether DESC
        LIMIT 10
      `);

      return {
        // Basic metrics
        categoryDistribution,
        stockLevels: (stockLevels as any[])[0],
        topProducts,
        inventoryTrends,
        metrics: {
          totalValue: (totalValue as any[])[0]?.totalValue || 0,
          lowStockCount: (lowStockCount as any[])[0]?.count || 0,
          mostStocked: (mostStocked as any[])[0] || null,
          leastStocked: (leastStocked as any[])[0] || null
        },

        // Advanced analytics
        profitMargins,
        expiryInsights,
        supplierReliability,
        purchaseFrequency,
        coPurchaseAnalysis
      };
    } catch (error) {
      console.error("Error fetching inventory analytics:", error);
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
    const conn = await pool.getConnection();
    try {
      console.log("Fetching all purchases");

      // Check if the purchases table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'purchases'`);
      if ((tables as any[]).length === 0) {
        console.log("Purchases table doesn't exist yet");
        return [];
      }

      const [rows] = await conn.execute(`
        SELECT p.*, s.name as supplier_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.purchase_date DESC
      `);

      // Map database fields to camelCase for the client
      const purchases = (rows as any[]).map(purchase => {
        return {
          id: purchase.id,
          companyName: purchase.company_name,
          companyAddress: purchase.company_address,
          billNo: purchase.bill_no,
          pageNo: purchase.page_no,
          supplierId: purchase.supplier_id,
          supplierName: purchase.supplier_name,
          purchaseDate: purchase.purchase_date,
          totalAmount: purchase.total_amount,
          totalGstAmount: purchase.total_gst_amount,
          grandTotal: purchase.grand_total,
          notes: purchase.notes,
          receiptImage: purchase.receipt_image,
          status: purchase.status,
          createdAt: purchase.created_at
        };
      });

      return purchases as Purchase[];
    } catch (error) {
      console.error("Error fetching purchases:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async getPurchase(id: number): Promise<Purchase | undefined> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching purchase with ID: ${id}`);

      // Check if the purchases table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'purchases'`);
      if ((tables as any[]).length === 0) {
        console.log("Purchases table doesn't exist yet");
        return undefined;
      }

      const [rows] = await conn.execute(`
        SELECT p.*, s.name as supplier_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id = ?
      `, [id]);

      const dbPurchase = (rows as any[])[0];

      if (!dbPurchase) {
        return undefined;
      }

      // Get purchase items
      const [itemRows] = await conn.execute(`
        SELECT * FROM purchase_items WHERE purchase_id = ?
      `, [id]);

      // Map database fields to camelCase for the client
      const purchase = {
        id: dbPurchase.id,
        companyName: dbPurchase.company_name,
        companyAddress: dbPurchase.company_address,
        billNo: dbPurchase.bill_no,
        pageNo: dbPurchase.page_no,
        supplierId: dbPurchase.supplier_id,
        supplierName: dbPurchase.supplier_name,
        purchaseDate: dbPurchase.purchase_date,
        totalAmount: dbPurchase.total_amount,
        totalGstAmount: dbPurchase.total_gst_amount,
        grandTotal: dbPurchase.grand_total,
        notes: dbPurchase.notes,
        receiptImage: dbPurchase.receipt_image,
        status: dbPurchase.status,
        createdAt: dbPurchase.created_at,
        items: (itemRows as any[]).map(item => ({
          id: item.id,
          purchaseId: item.purchase_id,
          itemName: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          gstPercentage: item.gst_percentage,
          gstAmount: item.gst_amount,
          amount: item.amount
        }))
      };

      return purchase as Purchase;
    } catch (error) {
      console.error(`Error fetching purchase with ID ${id}:`, error);
      throw error;
    } finally {
      conn.release();
    }
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

      // Add receipt image if provided
      if (purchase.receiptImage !== undefined) {
        purchaseFields.push('receipt_image');
        purchasePlaceholders.push('?');
        purchaseValues.push(purchase.receiptImage);
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
        receiptImage: dbPurchase.receipt_image,
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
    const conn = await pool.getConnection();
    try {
      console.log(`Deleting purchase with ID: ${id}`);

      // Start a transaction
      await conn.beginTransaction();

      try {
        // First, delete the purchase items
        await conn.execute(`DELETE FROM purchase_items WHERE purchase_id = ?`, [id]);

        // Then, delete the purchase
        const [result] = await conn.execute(`DELETE FROM purchases WHERE id = ?`, [id]);
        const affectedRows = (result as any).affectedRows;

        // Commit the transaction
        await conn.commit();

        return affectedRows > 0;
      } catch (error) {
        // Rollback the transaction in case of error
        await conn.rollback();
        console.error(`Error deleting purchase with ID ${id}:`, error);
        throw error;
      }
    } finally {
      conn.release();
    }
  }

  async getCaterers(): Promise<Caterer[]> {
    const conn = await pool.getConnection();
    try {
      // Check if the caterers table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterers'`);
      if ((tables as any[]).length === 0) {
        console.log("Caterers table doesn't exist yet");
        return [];
      }

      // Fetch all caterers
      const [rows] = await conn.execute(`SELECT * FROM caterers ORDER BY name`);

      // Map database fields to camelCase for the client
      const caterers = (rows as any[]).map(caterer => ({
        id: caterer.id,
        name: caterer.name,
        contactName: caterer.contact_name,
        email: caterer.email,
        phone: caterer.phone,
        address: caterer.address,
        city: caterer.city,
        state: caterer.state,
        pincode: caterer.pincode,
        gstNumber: caterer.gst_number,
        isActive: caterer.is_active === 1,
        creditLimit: caterer.credit_limit,
        balanceDue: caterer.balance_due,
        totalPaid: caterer.total_paid,
        totalBilled: caterer.total_billed,
        totalOrders: caterer.total_orders,
        shopCardImage: caterer.shop_card_image,
        notes: caterer.notes,
        createdAt: caterer.created_at,
        updatedAt: caterer.updated_at
      }));

      return caterers as Caterer[];
    } catch (error) {
      console.error("Error fetching caterers:", error);
      return [];
    } finally {
      conn.release();
    }
  }

  async getCaterer(id: number): Promise<Caterer | undefined> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching caterer with ID: ${id}`);

      // Check if the caterers table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterers'`);
      if ((tables as any[]).length === 0) {
        console.log("Caterers table doesn't exist yet, creating it...");

        // Create the caterers table if it doesn't exist
        await conn.execute(`
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
            shop_card_image VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        console.log("Created caterers table");
        return undefined;
      }

      // Fetch the caterer by ID
      const [rows] = await conn.execute(`SELECT * FROM caterers WHERE id = ?`, [id]);
      const dbCaterer = (rows as any[])[0];

      if (!dbCaterer) {
        console.log(`Caterer with ID ${id} not found in database`);
        return undefined;
      }

      console.log(`Found caterer with ID ${id}:`, dbCaterer);

      // Map database fields to camelCase for the client
      const caterer: Caterer = {
        id: dbCaterer.id,
        name: dbCaterer.name,
        contactName: dbCaterer.contact_name,
        email: dbCaterer.email,
        phone: dbCaterer.phone,
        address: dbCaterer.address,
        city: dbCaterer.city,
        state: dbCaterer.state,
        pincode: dbCaterer.pincode,
        gstNumber: dbCaterer.gst_number,
        isActive: dbCaterer.is_active === 1,
        creditLimit: dbCaterer.credit_limit,
        balanceDue: dbCaterer.balance_due,
        totalPaid: dbCaterer.total_paid,
        totalBilled: dbCaterer.total_billed,
        totalOrders: dbCaterer.total_orders,
        shopCardImage: dbCaterer.shop_card_image,
        notes: dbCaterer.notes,
        createdAt: dbCaterer.created_at,
        updatedAt: dbCaterer.updated_at
      };

      return caterer;
    } catch (error) {
      console.error(`Error fetching caterer with ID ${id}:`, error);
      return undefined;
    } finally {
      conn.release();
    }
  }

  async createCaterer(caterer: InsertCaterer): Promise<Caterer> {
    const conn = await pool.getConnection();
    try {
      console.log("Creating new caterer:", caterer);

      // Check if the caterers table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterers'`);
      if ((tables as any[]).length === 0) {
        // Create the caterers table if it doesn't exist
        await conn.execute(`
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
            shop_card_image VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        console.log("Created caterers table");
      }

      // Prepare the SQL query
      const query = `
        INSERT INTO caterers (
          name, contact_name, email, phone, address, city, state, pincode,
          gst_number, is_active, credit_limit, shop_card_image, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Prepare the values
      const values = [
        caterer.name,
        caterer.contactName || null,
        caterer.email || null,
        caterer.phone || null,
        caterer.address || null,
        caterer.city || null,
        caterer.state || null,
        caterer.pincode || null,
        caterer.gstNumber || null,
        caterer.isActive === false ? 0 : 1,
        caterer.creditLimit || 0,
        caterer.shopCardImage || null,
        caterer.notes || null
      ];

      // Execute the query
      const [result] = await conn.execute(query, values);
      const insertId = (result as any).insertId;

      // Fetch the newly created caterer
      const [rows] = await conn.execute(`SELECT * FROM caterers WHERE id = ?`, [insertId]);
      const dbCaterer = (rows as any[])[0];

      if (!dbCaterer) {
        throw new Error("Failed to retrieve created caterer");
      }

      // Map database fields to camelCase for the client
      const newCaterer: Caterer = {
        id: dbCaterer.id,
        name: dbCaterer.name,
        contactName: dbCaterer.contact_name,
        email: dbCaterer.email,
        phone: dbCaterer.phone,
        address: dbCaterer.address,
        city: dbCaterer.city,
        state: dbCaterer.state,
        pincode: dbCaterer.pincode,
        gstNumber: dbCaterer.gst_number,
        isActive: dbCaterer.is_active === 1,
        creditLimit: dbCaterer.credit_limit,
        balanceDue: dbCaterer.balance_due,
        totalPaid: dbCaterer.total_paid,
        totalBilled: dbCaterer.total_billed,
        totalOrders: dbCaterer.total_orders,
        shopCardImage: dbCaterer.shop_card_image,
        notes: dbCaterer.notes,
        createdAt: dbCaterer.created_at,
        updatedAt: dbCaterer.updated_at
      };

      console.log("Created caterer:", newCaterer);
      return newCaterer;
    } catch (error) {
      console.error("Error creating caterer:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async updateCaterer(id: number, caterer: Partial<Caterer>): Promise<Caterer | undefined> {
    const conn = await pool.getConnection();
    try {
      // Check if the caterers table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterers'`);
      if ((tables as any[]).length === 0) {
        console.log("Caterers table doesn't exist yet");
        return undefined;
      }

      // Check if the caterer exists
      const [existingRows] = await conn.execute(`SELECT * FROM caterers WHERE id = ?`, [id]);
      if ((existingRows as any[]).length === 0) {
        console.log(`Caterer with ID ${id} not found`);
        return undefined;
      }

      // Build the update query dynamically based on provided fields
      const updateFields = [];
      const values = [];

      if (caterer.name !== undefined) {
        updateFields.push('name = ?');
        values.push(caterer.name);
      }

      if (caterer.contactName !== undefined) {
        updateFields.push('contact_name = ?');
        values.push(caterer.contactName);
      }

      if (caterer.email !== undefined) {
        updateFields.push('email = ?');
        values.push(caterer.email);
      }

      if (caterer.phone !== undefined) {
        updateFields.push('phone = ?');
        values.push(caterer.phone);
      }

      if (caterer.address !== undefined) {
        updateFields.push('address = ?');
        values.push(caterer.address);
      }

      if (caterer.city !== undefined) {
        updateFields.push('city = ?');
        values.push(caterer.city);
      }

      if (caterer.state !== undefined) {
        updateFields.push('state = ?');
        values.push(caterer.state);
      }

      if (caterer.pincode !== undefined) {
        updateFields.push('pincode = ?');
        values.push(caterer.pincode);
      }

      if (caterer.gstNumber !== undefined) {
        updateFields.push('gst_number = ?');
        values.push(caterer.gstNumber);
      }

      if (caterer.isActive !== undefined) {
        updateFields.push('is_active = ?');
        values.push(caterer.isActive ? 1 : 0);
      }

      if (caterer.creditLimit !== undefined) {
        updateFields.push('credit_limit = ?');
        values.push(caterer.creditLimit);
      }

      if (caterer.balanceDue !== undefined) {
        updateFields.push('balance_due = ?');
        values.push(caterer.balanceDue);
      }

      if (caterer.totalPaid !== undefined) {
        updateFields.push('total_paid = ?');
        values.push(caterer.totalPaid);
      }

      if (caterer.totalBilled !== undefined) {
        updateFields.push('total_billed = ?');
        values.push(caterer.totalBilled);
      }

      if (caterer.totalOrders !== undefined) {
        updateFields.push('total_orders = ?');
        values.push(caterer.totalOrders);
      }

      if (caterer.shopCardImage !== undefined) {
        updateFields.push('shop_card_image = ?');
        values.push(caterer.shopCardImage);
      }

      if (caterer.notes !== undefined) {
        updateFields.push('notes = ?');
        values.push(caterer.notes);
      }

      // If no fields to update, return the existing caterer
      if (updateFields.length === 0) {
        return this.getCaterer(id);
      }

      // Add ID to values for the WHERE clause
      values.push(id);

      // Execute the update query
      const query = `UPDATE caterers SET ${updateFields.join(', ')} WHERE id = ?`;
      await conn.execute(query, values);

      // Return the updated caterer
      return this.getCaterer(id);
    } catch (error) {
      console.error(`Error updating caterer with ID ${id}:`, error);
      return undefined;
    } finally {
      conn.release();
    }
  }

  async deleteCaterer(id: number, options?: { force?: boolean, cascade?: boolean }): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      console.log(`Deleting caterer with ID ${id}, options:`, options);

      // Check if the caterers table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterers'`);
      if ((tables as any[]).length === 0) {
        console.log("Caterers table doesn't exist yet");
        return false;
      }

      // Check if the caterer exists
      const [existingRows] = await conn.execute(`SELECT * FROM caterers WHERE id = ?`, [id]);
      if ((existingRows as any[]).length === 0) {
        console.log(`Caterer with ID ${id} not found`);
        return false;
      }

      // Start a transaction
      await conn.beginTransaction();

      // Check if the caterer has any related records
      if (!options?.force && !options?.cascade) {
        const hasRelatedRecords = await this.catererHasRelatedRecords(id);
        if (hasRelatedRecords) {
          console.log(`Caterer with ID ${id} has related records and cannot be deleted without force or cascade option`);
          await conn.rollback();
          return false;
        }
      }

      if (options?.cascade) {
        console.log(`Cascade deleting related records for caterer ${id}`);

        // Delete caterer payments
        const [paymentTables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);
        if ((paymentTables as any[]).length > 0) {
          console.log(`Deleting payments for caterer ${id}`);
          await conn.execute(`DELETE FROM caterer_payments WHERE caterer_id = ?`, [id]);
        }

        // Delete distribution items and distributions
        const [distTables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
        if ((distTables as any[]).length > 0) {
          // First, get all distribution IDs for this caterer
          const [distRows] = await conn.execute(
            `SELECT id FROM distributions WHERE caterer_id = ?`,
            [id]
          );
          const distributionIds = (distRows as any[]).map(row => row.id);

          // Delete distribution items if any distributions exist
          if (distributionIds.length > 0) {
            const [itemTables] = await conn.execute(`SHOW TABLES LIKE 'distribution_items'`);
            if ((itemTables as any[]).length > 0) {
              console.log(`Deleting distribution items for caterer ${id}`);
              for (const distId of distributionIds) {
                await conn.execute(`DELETE FROM distribution_items WHERE distribution_id = ?`, [distId]);
              }
            }
          }

          // Delete distributions
          console.log(`Deleting distributions for caterer ${id}`);
          await conn.execute(`DELETE FROM distributions WHERE caterer_id = ?`, [id]);
        }
      } else if (options?.force) {
        console.log(`Force deleting caterer ${id} - using direct method with foreign key checks disabled`);

        // Temporarily disable foreign key checks
        await conn.execute("SET FOREIGN_KEY_CHECKS=0");

        // Delete caterer payments
        const [paymentTables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);
        if ((paymentTables as any[]).length > 0) {
          console.log(`Force deleting payments for caterer ${id}`);
          await conn.execute(`DELETE FROM caterer_payments WHERE caterer_id = ?`, [id]);
        }

        // Delete distribution items and distributions
        const [distTables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
        if ((distTables as any[]).length > 0) {
          // First, get all distribution IDs for this caterer
          const [distRows] = await conn.execute(
            `SELECT id FROM distributions WHERE caterer_id = ?`,
            [id]
          );
          const distributionIds = (distRows as any[]).map(row => row.id);

          // Delete distribution items if any distributions exist
          if (distributionIds.length > 0) {
            const [itemTables] = await conn.execute(`SHOW TABLES LIKE 'distribution_items'`);
            if ((itemTables as any[]).length > 0) {
              console.log(`Force deleting distribution items for caterer ${id}`);
              for (const distId of distributionIds) {
                await conn.execute(`DELETE FROM distribution_items WHERE distribution_id = ?`, [distId]);
              }
            }
          }

          // Delete distributions
          console.log(`Force deleting distributions for caterer ${id}`);
          await conn.execute(`DELETE FROM distributions WHERE caterer_id = ?`, [id]);
        }

        // Re-enable foreign key checks
        await conn.execute("SET FOREIGN_KEY_CHECKS=1");
      }

      // Delete the caterer
      console.log(`Deleting caterer ${id} from caterers table`);
      const [result] = await conn.execute(`DELETE FROM caterers WHERE id = ?`, [id]);
      const affectedRows = (result as any).affectedRows;

      // Commit the transaction
      await conn.commit();
      console.log(`Transaction committed successfully for caterer ${id}`);

      return affectedRows > 0;
    } catch (error) {
      // Rollback in case of error
      console.error(`Error in deleteCaterer for ID ${id}:`, error);
      try {
        await conn.rollback();
        console.log(`Transaction rolled back for caterer ${id}`);
      } catch (rollbackError) {
        console.error(`Error rolling back transaction:`, rollbackError);
      }
      return false;
    } finally {
      conn.release();
    }
  }

  // Helper method to check if a caterer has related records
  async catererHasRelatedRecords(catererId: number): Promise<boolean> {
    const relatedRecords = await this.getCatererRelatedRecordsCounts(catererId);
    return relatedRecords.totalCount > 0;
  }

  // Get detailed counts of related records for a caterer
  async getCatererRelatedRecordsCounts(catererId: number): Promise<{
    distributionsCount: number;
    paymentsCount: number;
    totalCount: number;
  }> {
    const conn = await pool.getConnection();
    try {
      let distributionsCount = 0;
      let paymentsCount = 0;

      // Check if distributions table exists
      const [distTables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
      if ((distTables as any[]).length > 0) {
        // Check if caterer has any distributions
        const [distRows] = await conn.execute(
          `SELECT COUNT(*) as count FROM distributions WHERE caterer_id = ?`,
          [catererId]
        );
        distributionsCount = (distRows as any[])[0].count;
      }

      // Check if caterer_payments table exists
      const [paymentTables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);
      if ((paymentTables as any[]).length > 0) {
        // Check if caterer has any payments
        const [paymentRows] = await conn.execute(
          `SELECT COUNT(*) as count FROM caterer_payments WHERE caterer_id = ?`,
          [catererId]
        );
        paymentsCount = (paymentRows as any[])[0].count;
      }

      return {
        distributionsCount,
        paymentsCount,
        totalCount: distributionsCount + paymentsCount
      };
    } catch (error) {
      console.error(`Error checking related records for caterer ${catererId}:`, error);
      // If there's an error, assume there are related records to be safe
      return {
        distributionsCount: 1,
        paymentsCount: 1,
        totalCount: 2
      };
    } finally {
      conn.release();
    }
  }

  async getDistributions(): Promise<Distribution[]> {
    const conn = await pool.getConnection();
    try {
      console.log("Fetching all distributions");

      // Check if distributions table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
      if ((tables as any[]).length === 0) {
        console.log("Distributions table doesn't exist yet");
        return [];
      }

      // Join with caterers to get their names
      const [rows] = await conn.execute(`
        SELECT
          d.*,
          c.name as caterer_name
        FROM
          distributions d
        LEFT JOIN
          caterers c ON d.caterer_id = c.id
        ORDER BY
          d.distribution_date DESC
      `);

      console.log(`Retrieved ${(rows as any[]).length} distributions`);

      // Map database fields to camelCase for the client
      const distributions = (rows as any[]).map(dist => {
        // Check if receipt_image column exists in the result
        const hasReceiptImage = 'receipt_image' in dist;

        return {
          id: dist.id,
          billNo: dist.bill_no,
          catererId: dist.caterer_id,
          catererName: dist.caterer_name,
          distributionDate: dist.distribution_date,
          totalAmount: dist.total_amount,
          totalGstAmount: dist.total_gst_amount,
          grandTotal: dist.grand_total,
          amountPaid: dist.amount_paid,
          paymentMode: dist.payment_mode,
          paymentDate: dist.payment_date,
          balanceDue: dist.balance_due,
          notes: dist.notes,
          status: dist.status,
          createdAt: dist.created_at,
          // Add receipt image if it exists
          ...(hasReceiptImage && { receiptImage: dist.receipt_image })
        };
      });

      return distributions as Distribution[];
    } catch (error) {
      console.error("Error fetching distributions:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async getDistribution(id: number): Promise<Distribution | undefined> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching distribution with ID: ${id}`);

      // Check if distributions table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
      if ((tables as any[]).length === 0) {
        console.log("Distributions table doesn't exist yet");
        return undefined;
      }

      // Join with caterers to get their names
      const [rows] = await conn.execute(`
        SELECT
          d.*,
          c.name as caterer_name
        FROM
          distributions d
        LEFT JOIN
          caterers c ON d.caterer_id = c.id
        WHERE
          d.id = ?
      `, [id]);

      const dist = (rows as any[])[0];

      if (!dist) {
        return undefined;
      }

      // Check if receipt_image column exists in the result
      const hasReceiptImage = 'receipt_image' in dist;

      // Map database fields to camelCase for the client
      return {
        id: dist.id,
        billNo: dist.bill_no,
        catererId: dist.caterer_id,
        catererName: dist.caterer_name,
        distributionDate: dist.distribution_date,
        totalAmount: dist.total_amount,
        totalGstAmount: dist.total_gst_amount,
        grandTotal: dist.grand_total,
        amountPaid: dist.amount_paid,
        paymentMode: dist.payment_mode,
        paymentDate: dist.payment_date,
        balanceDue: dist.balance_due,
        notes: dist.notes,
        status: dist.status,
        createdAt: dist.created_at,
        // Add receipt image if it exists
        ...(hasReceiptImage && { receiptImage: dist.receipt_image })
      } as Distribution;
    } catch (error) {
      console.error(`Error fetching distribution with ID ${id}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async getDistributionItems(distributionId: number): Promise<DistributionItem[]> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching items for distribution ID: ${distributionId}`);

      // Check if distribution_items table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'distribution_items'`);
      if ((tables as any[]).length === 0) {
        console.log("Distribution_items table doesn't exist yet");
        return [];
      }

      // Join with products to get their names
      const [rows] = await conn.execute(`
        SELECT
          di.*,
          p.name as product_name,
          p.unit as product_unit
        FROM
          distribution_items di
        LEFT JOIN
          products p ON di.product_id = p.id
        WHERE
          di.distribution_id = ?
        ORDER BY
          di.id ASC
      `, [distributionId]);

      console.log(`Retrieved ${(rows as any[]).length} distribution items`);

      // Map database fields to camelCase for the client
      const items = (rows as any[]).map(item => {
        return {
          id: item.id,
          distributionId: item.distribution_id,
          productId: item.product_id,
          productName: item.product_name,
          itemName: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          gstPercentage: item.gst_percentage,
          gstAmount: item.gst_amount,
          amount: item.amount,
          createdAt: item.created_at
        };
      });

      return items as DistributionItem[];
    } catch (error) {
      console.error(`Error fetching items for distribution ID ${distributionId}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async getDistributionsByCaterer(catererId: number): Promise<Distribution[]> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching distributions for caterer ID: ${catererId}`);

      // Check if distributions table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
      if ((tables as any[]).length === 0) {
        console.log("Distributions table doesn't exist yet");
        return [];
      }

      // Join with caterers to get their names
      const [rows] = await conn.execute(`
        SELECT
          d.*,
          c.name as caterer_name
        FROM
          distributions d
        LEFT JOIN
          caterers c ON d.caterer_id = c.id
        WHERE
          d.caterer_id = ?
        ORDER BY
          d.distribution_date DESC
      `, [catererId]);

      console.log(`Retrieved ${(rows as any[]).length} distributions for caterer ${catererId}`);

      // Map database fields to camelCase for the client
      const distributions = (rows as any[]).map(dist => {
        // Check if receipt_image column exists in the result
        const hasReceiptImage = 'receipt_image' in dist;

        return {
          id: dist.id,
          billNo: dist.bill_no,
          catererId: dist.caterer_id,
          catererName: dist.caterer_name,
          distributionDate: dist.distribution_date,
          totalAmount: dist.total_amount,
          totalGstAmount: dist.total_gst_amount,
          grandTotal: dist.grand_total,
          amountPaid: dist.amount_paid,
          paymentMode: dist.payment_mode,
          paymentDate: dist.payment_date,
          balanceDue: dist.balance_due,
          notes: dist.notes,
          status: dist.status,
          createdAt: dist.created_at,
          // Add receipt image if it exists
          ...(hasReceiptImage && { receiptImage: dist.receipt_image })
        };
      });

      return distributions as Distribution[];
    } catch (error) {
      console.error(`Error fetching distributions for caterer ID ${catererId}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async createDistribution(distribution: DistributionWithItems): Promise<Distribution> {
    const conn = await pool.getConnection();
    try {
      console.log("Creating distribution with data:", JSON.stringify(distribution, null, 2));

      // Start a transaction
      await conn.beginTransaction();

      try {
        // Check if distributions table exists
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
        if ((tables as any[]).length === 0) {
          console.log("Distributions table doesn't exist, creating it...");
          await conn.execute(`
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
              payment_date TIMESTAMP NULL,
              balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
              notes TEXT,
              status VARCHAR(50) NOT NULL DEFAULT 'active',
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log("Distributions table created successfully");
        }

        // Check if distribution_items table exists
        const [itemTables] = await conn.execute(`SHOW TABLES LIKE 'distribution_items'`);
        if ((itemTables as any[]).length === 0) {
          console.log("Distribution_items table doesn't exist, creating it...");
          await conn.execute(`
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
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log("Distribution_items table created successfully");
        }

        // Check if caterer_payments table exists
        const [paymentTables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);
        if ((paymentTables as any[]).length === 0) {
          console.log("Caterer_payments table doesn't exist, creating it...");
          await conn.execute(`
            CREATE TABLE caterer_payments (
              id INT AUTO_INCREMENT PRIMARY KEY,
              caterer_id INT NOT NULL,
              distribution_id INT,
              amount DECIMAL(10,2) NOT NULL DEFAULT 0,
              payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              payment_mode VARCHAR(50) NOT NULL DEFAULT 'cash',
              notes TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log("Caterer_payments table created successfully");
        }

        // Sanitize and validate the bill number
        let billNo = distribution.billNo;

        // If bill number is not provided or invalid, generate a new one
        if (!billNo || billNo.trim() === '') {
          const date = new Date();
          const year = date.getFullYear().toString();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          billNo = `CB-${year}${month}${day}-${randomDigits}`;
        }

        // Ensure bill number is unique
        const [existingBills] = await conn.execute(
          `SELECT bill_no FROM distributions WHERE bill_no = ?`,
          [billNo]
        );

        if ((existingBills as any[]).length > 0) {
          // If bill number already exists, append a unique suffix
          const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          billNo = `${billNo}-${randomSuffix}`;
        }

        // Validate and sanitize all parameters to prevent undefined values
        const catererId = distribution.catererId || 0;
        const distributionDate = distribution.distributionDate ? new Date(distribution.distributionDate) : new Date();
        const totalAmount = distribution.totalAmount ? parseFloat(distribution.totalAmount) : 0;
        const totalGstAmount = distribution.totalGstAmount ? parseFloat(distribution.totalGstAmount) : 0;
        const grandTotal = distribution.grandTotal ? parseFloat(distribution.grandTotal) : 0;
        const amountPaid = distribution.amountPaid ? parseFloat(distribution.amountPaid) : 0;
        const paymentMode = distribution.paymentMode || null;
        const balanceDue = distribution.balanceDue ? parseFloat(distribution.balanceDue) : 0;
        const status = distribution.status || 'active';
        const notes = distribution.notes || null;

        console.log("Sanitized parameters:", {
          billNo,
          catererId,
          distributionDate,
          totalAmount,
          totalGstAmount,
          grandTotal,
          amountPaid,
          paymentMode,
          balanceDue,
          status,
          notes
        });

        // Check if the distributions table has a receipt_image column
        let hasReceiptImageColumn = false;
        try {
          const [columns] = await conn.execute(`SHOW COLUMNS FROM distributions LIKE 'receipt_image'`);
          hasReceiptImageColumn = (columns as any[]).length > 0;

          if (!hasReceiptImageColumn) {
            console.log("Adding receipt_image column to distributions table");
            await conn.execute(`ALTER TABLE distributions ADD COLUMN receipt_image VARCHAR(255) NULL`);
            hasReceiptImageColumn = true;
          }
        } catch (error) {
          console.error("Error checking for receipt_image column:", error);
          // Continue without receipt_image column
        }

        // Get receipt image from distribution data if available
        const receiptImage = distribution.receiptImage || null;

        // Insert distribution with validated bill number
        const [distributionResult] = await conn.execute(
          hasReceiptImageColumn
            ? `
              INSERT INTO distributions (
                bill_no,
                caterer_id,
                distribution_date,
                total_amount,
                total_gst_amount,
                grand_total,
                amount_paid,
                payment_mode,
                balance_due,
                status,
                notes,
                receipt_image
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
            : `
              INSERT INTO distributions (
                bill_no,
                caterer_id,
                distribution_date,
                total_amount,
                total_gst_amount,
                grand_total,
                amount_paid,
                payment_mode,
                balance_due,
                status,
                notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
          hasReceiptImageColumn
            ? [
                billNo,
                catererId,
                distributionDate,
                totalAmount,
                totalGstAmount,
                grandTotal,
                amountPaid,
                paymentMode,
                balanceDue,
                status,
                notes,
                receiptImage
              ]
            : [
                billNo,
                catererId,
                distributionDate,
                totalAmount,
                totalGstAmount,
                grandTotal,
                amountPaid,
                paymentMode,
                balanceDue,
                status,
                notes
              ]
        );

        // MySQL2 returns an object with insertId property
        const distributionId = (distributionResult as any).insertId;

        // Verify that we have a valid distribution ID
        if (!distributionId) {
          throw new Error("Failed to get distribution ID after insertion");
        }

        console.log(`Created distribution with ID: ${distributionId}`);

        // Insert distribution items
        if (distribution.items && Array.isArray(distribution.items)) {
          console.log(`Processing ${distribution.items.length} distribution items`);

          for (const item of distribution.items) {
            console.log("Processing item:", item);

            // Validate and sanitize item parameters
            const productId = item.productId || (item as any).spiceId || 0; // Support both productId and spiceId
            const itemName = item.itemName || '';
            const quantity = item.quantity ? parseFloat(item.quantity.toString()) : 0;
            const unit = item.unit || 'kg';
            const rate = item.rate ? parseFloat(item.rate.toString()) : 0;
            const gstPercentage = item.gstPercentage ? parseFloat(item.gstPercentage.toString()) : 0;
            const gstAmount = item.gstAmount ? parseFloat(item.gstAmount.toString()) : 0;
            const amount = item.amount ? parseFloat(item.amount.toString()) : 0;

            // Log the values being inserted for debugging
            console.log("Inserting distribution item with values:", {
              distributionId,
              productId,
              itemName,
              quantity,
              unit,
              rate,
              gstPercentage,
              gstAmount,
              amount
            });

            // Ensure all values are defined and not undefined
            const params = [
              distributionId || 0,
              productId || 0,
              itemName || '',
              quantity || 0,
              unit || 'kg',
              rate || 0,
              gstPercentage || 0,
              gstAmount || 0,
              amount || 0
            ];

            // Check for any undefined values before executing the query
            if (params.some(param => param === undefined)) {
              console.error("Found undefined parameters:", params);
              throw new Error("Cannot execute query with undefined parameters");
            }

            await conn.execute(`
              INSERT INTO distribution_items (
                distribution_id,
                product_id,
                item_name,
                quantity,
                unit,
                rate,
                gst_percentage,
                gst_amount,
                amount
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, params);
          }
        }

        // Check if caterer exists and update their balance
        const [catererExists] = await conn.execute(
          `SELECT id FROM caterers WHERE id = ?`,
          [catererId]
        );

        if ((catererExists as any[]).length > 0) {
          // Update caterer's balance due and total billed
          await conn.execute(`
            UPDATE caterers
            SET
              balance_due = balance_due + ?,
              total_billed = COALESCE(total_billed, 0) + ?,
              total_orders = COALESCE(total_orders, 0) + 1
            WHERE id = ?
          `, [
            balanceDue,
            grandTotal,
            catererId
          ]);

          // If amount paid is greater than 0, create a payment record
          if (amountPaid > 0) {
            // Prepare payment parameters, ensuring no undefined values
            const paymentParams = [
              catererId,
              distributionId,
              amountPaid,
              new Date(),
              paymentMode || 'cash',
              `Payment for bill ${billNo}`
            ];

            // Check for any undefined values before executing the query
            if (paymentParams.some(param => param === undefined)) {
              console.error("Found undefined parameters in payment creation:", paymentParams);
              // Replace undefined values with appropriate defaults
              for (let i = 0; i < paymentParams.length; i++) {
                if (paymentParams[i] === undefined) {
                  switch (i) {
                    case 0: paymentParams[i] = 0; break; // catererId
                    case 1: paymentParams[i] = 0; break; // distributionId
                    case 2: paymentParams[i] = 0; break; // amountPaid
                    case 3: paymentParams[i] = new Date(); break; // paymentDate
                    case 4: paymentParams[i] = 'cash'; break; // paymentMode
                    case 5: paymentParams[i] = ''; break; // notes
                  }
                }
              }
            }

            console.log("Creating payment record with parameters:", paymentParams);

            await conn.execute(`
              INSERT INTO caterer_payments (
                caterer_id,
                distribution_id,
                amount,
                payment_date,
                payment_mode,
                notes
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, paymentParams);

            // Update caterer's total paid and balance due
            await conn.execute(`
              UPDATE caterers
              SET
                total_paid = COALESCE(total_paid, 0) + ?,
                balance_due = GREATEST(0, COALESCE(balance_due, 0) - ?)
              WHERE id = ?
            `, [
              amountPaid,
              amountPaid,
              catererId
            ]);

            // If this distribution is now fully paid, remove any payment reminders for it
            if (status === 'paid') {
              console.log(`Distribution ${distributionId} is fully paid during creation, removing any existing payment reminders`);
              await conn.execute(`
                DELETE FROM payment_reminders
                WHERE distribution_id = ?
              `, [distributionId]);
            }
          }
        } else {
          console.warn(`Caterer with ID ${catererId} not found. Skipping caterer updates.`);
        }

        // Commit the transaction
        await conn.commit();

        // Get the created distribution
        const [rows] = await conn.execute(`SELECT * FROM distributions WHERE id = ?`, [distributionId]);
        const dbDistribution = (rows as any[])[0];

        if (!dbDistribution) {
          throw new Error(`Failed to retrieve created distribution with ID ${distributionId}`);
        }

        // Check if receipt_image column exists in the result
        const hasReceiptImage = 'receipt_image' in dbDistribution;

        // Map database fields to camelCase for the client
        const createdDistribution = {
          id: dbDistribution.id,
          billNo: dbDistribution.bill_no,
          catererId: dbDistribution.caterer_id,
          distributionDate: dbDistribution.distribution_date,
          totalAmount: dbDistribution.total_amount,
          totalGstAmount: dbDistribution.total_gst_amount,
          grandTotal: dbDistribution.grand_total,
          amountPaid: dbDistribution.amount_paid,
          paymentMode: dbDistribution.payment_mode,
          paymentDate: dbDistribution.payment_date,
          balanceDue: dbDistribution.balance_due,
          notes: dbDistribution.notes,
          status: dbDistribution.status,
          createdAt: dbDistribution.created_at,
          // Add receipt image if it exists
          ...(hasReceiptImage && { receiptImage: dbDistribution.receipt_image })
        };

        return createdDistribution as Distribution;
      } catch (error) {
        // Rollback the transaction in case of error
        await conn.rollback();
        console.error("Error in createDistribution:", error);

        // Provide more detailed error information
        if (error instanceof Error) {
          const errorMessage = `Failed to create distribution: ${error.message}`;
          console.error(errorMessage);
          if (error.stack) {
            console.error(error.stack);
          }
          throw new Error(errorMessage);
        } else {
          throw new Error(`Failed to create distribution: Unknown error`);
        }
      }
    } finally {
      conn.release();
    }
  }

  async updateDistributionStatus(id: number, status: string): Promise<Distribution | undefined> {
    const conn = await pool.getConnection();
    try {
      console.log(`Updating distribution status for ID ${id} to ${status}`);

      // Check if distributions table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
      if ((tables as any[]).length === 0) {
        console.log("Distributions table doesn't exist yet");
        return undefined;
      }

      // Update the status
      await conn.execute(`
        UPDATE distributions
        SET status = ?
        WHERE id = ?
      `, [status, id]);

      // Get the updated distribution
      return this.getDistribution(id);
    } catch (error) {
      console.error(`Error updating distribution status for ID ${id}:`, error);
      return undefined;
    } finally {
      conn.release();
    }
  }

  async deleteDistribution(id: number): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      console.log(`Deleting distribution with ID ${id}`);

      // Check if distributions table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'distributions'`);
      if ((tables as any[]).length === 0) {
        console.log("Distributions table doesn't exist yet");
        return false;
      }

      // Start a transaction
      await conn.beginTransaction();

      try {
        // Delete payment reminders for this distribution first
        await conn.execute(`
          DELETE FROM payment_reminders
          WHERE distribution_id = ?
        `, [id]);

        // Delete distribution items
        await conn.execute(`
          DELETE FROM distribution_items
          WHERE distribution_id = ?
        `, [id]);

        // Delete the distribution
        const [result] = await conn.execute(`
          DELETE FROM distributions
          WHERE id = ?
        `, [id]);

        // Commit the transaction
        await conn.commit();

        // Check if any rows were affected
        return (result as any).affectedRows > 0;
      } catch (error) {
        // Rollback the transaction in case of error
        await conn.rollback();
        console.error(`Error deleting distribution with ID ${id}:`, error);
        return false;
      }
    } catch (error) {
      console.error(`Error deleting distribution with ID ${id}:`, error);
      return false;
    } finally {
      conn.release();
    }
  }

  async getCatererPayments(): Promise<CatererPayment[]> {
    const conn = await pool.getConnection();
    try {
      // Check if caterer_payments table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);

      if ((tables as any[]).length === 0) {
        console.log("Caterer_payments table doesn't exist yet");
        return [];
      }

      // Join with caterers to get their names
      const [rows] = await conn.execute(`
        SELECT
          cp.*,
          c.name as caterer_name
        FROM
          caterer_payments cp
        LEFT JOIN
          caterers c ON cp.caterer_id = c.id
        ORDER BY
          cp.payment_date DESC
      `);

      // Map database fields to camelCase for the client
      const payments = (rows as any[]).map(payment => {
        // Create the payment object with all fields
        const paymentObj = {
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
        };

        return paymentObj;
      });

      return payments as CatererPayment[];
    } catch (error) {
      console.error("Error fetching caterer payments:", error);
      return [];
    } finally {
      conn.release();
    }
  }

  async getCatererPayment(id: number): Promise<CatererPayment | undefined> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching caterer payment with ID ${id}`);

      // Check if caterer_payments table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);
      if ((tables as any[]).length === 0) {
        console.log("Caterer_payments table doesn't exist yet");
        return undefined;
      }

      // Join with caterers to get their names
      const [rows] = await conn.execute(`
        SELECT
          cp.*,
          c.name as caterer_name
        FROM
          caterer_payments cp
        LEFT JOIN
          caterers c ON cp.caterer_id = c.id
        WHERE
          cp.id = ?
      `, [id]);

      const payment = (rows as any[])[0];

      if (!payment) {
        return undefined;
      }

      console.log("Processing single payment row:", payment);

      // Map database fields to camelCase for the client
      const paymentObj = {
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
      };

      console.log("Mapped single payment object:", paymentObj);
      return paymentObj as CatererPayment;
    } catch (error) {
      console.error(`Error fetching caterer payment with ID ${id}:`, error);
      return undefined;
    } finally {
      conn.release();
    }
  }

  async getCatererPaymentsByCaterer(catererId: number): Promise<CatererPayment[]> {
    const conn = await pool.getConnection();
    try {
      // Check if caterer_payments table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);
      if ((tables as any[]).length === 0) {
        console.log("Caterer_payments table doesn't exist yet");
        return [];
      }

      // Get payments for the caterer
      const [rows] = await conn.execute(`
        SELECT
          cp.*,
          c.name as caterer_name
        FROM
          caterer_payments cp
        LEFT JOIN
          caterers c ON cp.caterer_id = c.id
        WHERE
          cp.caterer_id = ?
        ORDER BY
          cp.payment_date DESC
      `, [catererId]);

      // Map database fields to camelCase for the client
      const payments = (rows as any[]).map(payment => {
        // Create the payment object with all fields
        const paymentObj = {
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
        };

        return paymentObj;
      });

      return payments as CatererPayment[];
    } catch (error) {
      console.error(`Error fetching payments for caterer ID ${catererId}:`, error);
      return [];
    } finally {
      conn.release();
    }
  }

  async getCatererPaymentsByDistribution(distributionId: number): Promise<CatererPayment[]> {
    const conn = await pool.getConnection();
    try {
      console.log(`Fetching payments for distribution ID: ${distributionId}`);

      // Check if caterer_payments table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);
      if ((tables as any[]).length === 0) {
        console.log("Caterer_payments table doesn't exist yet");
        return [];
      }

      // Get payments for the distribution
      const [rows] = await conn.execute(`
        SELECT
          cp.*,
          c.name as caterer_name
        FROM
          caterer_payments cp
        LEFT JOIN
          caterers c ON cp.caterer_id = c.id
        WHERE
          cp.distribution_id = ?
        ORDER BY
          cp.payment_date DESC
      `, [distributionId]);

      console.log(`Retrieved ${(rows as any[]).length} payments for distribution ${distributionId}`);

      // Map database fields to camelCase for the client
      const payments = (rows as any[]).map(payment => {
        // Create the payment object with all fields
        const paymentObj = {
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
        };

        return paymentObj;
      });

      return payments as CatererPayment[];
    } catch (error) {
      console.error(`Error fetching payments for distribution ID ${distributionId}:`, error);
      return [];
    } finally {
      conn.release();
    }
  }

  async createCatererPayment(payment: InsertCatererPayment): Promise<CatererPayment> {
    const conn = await pool.getConnection();
    try {
      // Start a transaction
      await conn.beginTransaction();

      try {
        // Check if caterer_payments table exists
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'caterer_payments'`);
        if ((tables as any[]).length === 0) {
          await conn.execute(`
            CREATE TABLE caterer_payments (
              id INT AUTO_INCREMENT PRIMARY KEY,
              caterer_id INT NOT NULL,
              distribution_id INT,
              amount DECIMAL(10,2) NOT NULL,
              payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              payment_mode VARCHAR(50) NOT NULL,
              reference_no VARCHAR(100),
              notes TEXT,
              receipt_image VARCHAR(255),
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `);
        } else {
          // Check if receipt_image column exists
          try {
            const [columns] = await conn.execute(`SHOW COLUMNS FROM caterer_payments LIKE 'receipt_image'`);
            if ((columns as any[]).length === 0) {
              await conn.execute(`ALTER TABLE caterer_payments ADD COLUMN receipt_image VARCHAR(255) NULL`);
            }
          } catch (error) {
            console.error("Error checking for receipt_image column:", error);
            // Continue without receipt_image column
          }
        }

        // Validate and sanitize all parameters
        const catererId = payment.catererId;
        const distributionId = payment.distributionId || null;
        const amount = payment.amount.toString();
        const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
        const paymentMode = payment.paymentMode;
        const referenceNo = payment.referenceNo || null;
        const notes = payment.notes || null;
        const receiptImage = payment.receiptImage || null;

        // Insert the payment
        const [result] = await conn.execute(`
          INSERT INTO caterer_payments (
            caterer_id,
            distribution_id,
            amount,
            payment_date,
            payment_mode,
            reference_no,
            notes,
            receipt_image
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          catererId,
          distributionId,
          amount,
          paymentDate,
          paymentMode,
          referenceNo,
          notes,
          receiptImage
        ]);

        const paymentId = (result as any).insertId;

        // Update the caterer's total_paid and balance_due
        await conn.execute(`
          UPDATE caterers
          SET
            total_paid = COALESCE(total_paid, 0) + ?,
            balance_due = GREATEST(0, COALESCE(balance_due, 0) - ?)
          WHERE id = ?
        `, [amount, amount, catererId]);

        // If this payment is for a distribution, update the distribution's amount_paid and balance_due
        if (distributionId) {
          // Get the current distribution
          const [distributionRows] = await conn.execute(`
            SELECT * FROM distributions WHERE id = ?
          `, [distributionId]);

          const distribution = (distributionRows as any[])[0];

          if (distribution) {
            const currentAmountPaid = parseFloat(distribution.amount_paid) || 0;
            const grandTotal = parseFloat(distribution.grand_total) || 0;
            const newAmountPaid = parseFloat(currentAmountPaid) + parseFloat(amount);
            const newBalanceDue = Math.max(0, grandTotal - newAmountPaid);
            const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

            // Update the distribution
            await conn.execute(`
              UPDATE distributions
              SET
                amount_paid = ?,
                balance_due = ?,
                status = ?
              WHERE id = ?
            `, [
              newAmountPaid,
              newBalanceDue,
              newStatus,
              distributionId
            ]);

            // If the distribution is now fully paid, remove any payment reminders for it
            if (newStatus === 'paid') {
              console.log(`Distribution ${distributionId} is now fully paid, removing payment reminders`);
              await conn.execute(`
                DELETE FROM payment_reminders
                WHERE distribution_id = ?
              `, [distributionId]);
            }
          }
        }

        // Commit the transaction
        await conn.commit();

        // Get the created payment
        const [rows] = await conn.execute(`
          SELECT
            cp.*,
            c.name as caterer_name
          FROM
            caterer_payments cp
          LEFT JOIN
            caterers c ON cp.caterer_id = c.id
          WHERE
            cp.id = ?
        `, [paymentId]);

        const createdPayment = (rows as any[])[0];

        if (!createdPayment) {
          throw new Error(`Failed to retrieve created payment with ID ${paymentId}`);
        }

        // Map database fields to camelCase for the client
        const paymentObj = {
          id: createdPayment.id,
          catererId: createdPayment.caterer_id,
          catererName: createdPayment.caterer_name,
          distributionId: createdPayment.distribution_id,
          amount: createdPayment.amount,
          paymentDate: createdPayment.payment_date,
          paymentMode: createdPayment.payment_mode,
          referenceNo: createdPayment.reference_no,
          notes: createdPayment.notes,
          createdAt: createdPayment.created_at,
          receiptImage: createdPayment.receipt_image || null
        };
        return paymentObj as CatererPayment;
      } catch (error) {
        // Rollback the transaction in case of error
        await conn.rollback();
        console.error("Error in createCatererPayment:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error creating caterer payment:", error);
      throw error;
    } finally {
      conn.release();
    }
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

      // Fix for tags parsing
      try {
        if (dbSupplier.tags) {
          // If it's already an array, use it directly
          if (Array.isArray(dbSupplier.tags)) {
            tags = dbSupplier.tags;
          }
          // If it's a string, try to parse it as JSON
          else if (typeof dbSupplier.tags === 'string') {
            if (dbSupplier.tags.trim() === '') {
              // Empty string, set to empty array
              tags = [];

              // Update the database with the correct JSON format
              conn.execute(
                `UPDATE suppliers SET tags = '[]' WHERE id = ?`,
                [dbSupplier.id]
              ).catch(err => console.error("Failed to update empty tags:", err));
            } else {
              try {
                // Try to parse as JSON
                tags = JSON.parse(dbSupplier.tags);
              } catch (jsonError) {
                // If JSON parsing fails, try to handle as comma-separated string
                tags = dbSupplier.tags.split(',').map((tag: string) => tag.trim());

                // Update the database with the correct JSON format
                const jsonTags = JSON.stringify(tags);
                conn.execute(
                  `UPDATE suppliers SET tags = ? WHERE id = ?`,
                  [jsonTags, dbSupplier.id]
                ).catch(err => console.error("Failed to update tags format:", err));
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error handling tags for supplier ${dbSupplier.id}:`, error);
        // Set to empty array as fallback
        tags = [];

        // Fix the database entry
        conn.execute(
          `UPDATE suppliers SET tags = '[]' WHERE id = ?`,
          [dbSupplier.id]
        ).catch(err => console.error("Failed to reset tags:", err));
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

        // Fix for tags parsing
        try {
          if (supplier.tags) {
            // If it's already an array, use it directly
            if (Array.isArray(supplier.tags)) {
              tags = supplier.tags;
            }
            // If it's a string, try to parse it as JSON
            else if (typeof supplier.tags === 'string') {
              if (supplier.tags.trim() === '') {
                // Empty string, set to empty array
                tags = [];

                // Update the database with the correct JSON format
                conn.execute(
                  `UPDATE suppliers SET tags = '[]' WHERE id = ?`,
                  [supplier.id]
                ).catch(err => console.error("Failed to update empty tags:", err));
              } else {
                try {
                  // Try to parse as JSON
                  tags = JSON.parse(supplier.tags);
                } catch (jsonError) {
                  // If JSON parsing fails, try to handle as comma-separated string
                  tags = supplier.tags.split(',').map((tag: string) => tag.trim());

                  // Update the database with the correct JSON format
                  const jsonTags = JSON.stringify(tags);
                  conn.execute(
                    `UPDATE suppliers SET tags = ? WHERE id = ?`,
                    [jsonTags, supplier.id]
                  ).catch(err => console.error("Failed to update tags format:", err));
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error handling tags for supplier ${supplier.id}:`, error);
          // Set to empty array as fallback
          tags = [];

          // Fix the database entry
          conn.execute(
            `UPDATE suppliers SET tags = '[]' WHERE id = ?`,
            [supplier.id]
          ).catch(err => console.error("Failed to reset tags:", err));
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
          supplierImage: supplier.supplier_image,
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
      console.log(`Getting purchase history for supplier ID: ${supplierId}`);

      // First, check if the purchases table exists
      try {
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'purchases'`);
        if ((tables as any[]).length === 0) {
          console.log("Purchases table doesn't exist yet");
          return [];
        }

        // Check if purchase_items table exists
        const [itemTables] = await conn.execute(`SHOW TABLES LIKE 'purchase_items'`);
        if ((itemTables as any[]).length === 0) {
          console.log("Purchase_items table doesn't exist yet");
          return [];
        }

        // Get purchases for this supplier with detailed information
        const query = `
          SELECT
            p.id as purchaseId,
            p.purchase_date,
            p.supplier_id,
            p.bill_no as billNo,
            p.page_no as pageNo,
            p.total_amount as purchaseTotalAmount,
            p.total_gst_amount as purchaseTotalGstAmount,
            p.grand_total as purchaseGrandTotal,
            p.notes,
            p.receipt_image as receiptImage,
            p.status,
            p.created_at as purchaseCreatedAt,
            s.id as supplierId,
            s.name as supplierName,
            s.contact_name as supplierContactName,
            s.email as supplierEmail,
            s.phone as supplierPhone,
            s.address as supplierAddress,
            pi.id as itemId,
            pi.item_name as productName,
            pi.quantity,
            pi.rate as price,
            pi.unit,
            pi.gst_percentage as gstPercentage,
            pi.gst_amount as gstAmount,
            pi.amount as totalAmount
          FROM purchases p
          JOIN purchase_items pi ON p.id = pi.purchase_id
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE p.supplier_id = ?
          ORDER BY p.purchase_date DESC, p.id DESC
        `;

        console.log("Executing query:", query);
        const [rows] = await conn.execute(query, [supplierId]);

        // Transform the data to include proper types
        const result = (rows as any[]).map(row => ({
          purchaseId: row.purchaseId,
          purchase_date: row.purchase_date,
          supplier_id: row.supplier_id,
          billNo: row.billNo,
          pageNo: row.pageNo,
          purchaseTotalAmount: parseFloat(row.purchaseTotalAmount),
          purchaseTotalGstAmount: parseFloat(row.purchaseTotalGstAmount),
          purchaseGrandTotal: parseFloat(row.purchaseGrandTotal),
          notes: row.notes,
          receiptImage: row.receiptImage,
          status: row.status,
          purchaseCreatedAt: row.purchaseCreatedAt,
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          supplierContactName: row.supplierContactName,
          supplierEmail: row.supplierEmail,
          supplierPhone: row.supplierPhone,
          supplierAddress: row.supplierAddress,
          itemId: row.itemId,
          productName: row.productName,
          quantity: parseFloat(row.quantity),
          price: parseFloat(row.price),
          unit: row.unit,
          gstPercentage: parseFloat(row.gstPercentage),
          gstAmount: parseFloat(row.gstAmount),
          totalAmount: parseFloat(row.totalAmount)
        }));

        console.log(`Retrieved ${result.length} purchase history records for supplier ${supplierId}`);
        return result;
      } catch (error) {
        console.error(`Error in getSupplierPurchaseHistory for supplier ${supplierId}:`, error);
        throw error;
      }
    } finally {
      conn.release();
    }
  }

  async getAllPurchaseHistory(): Promise<any[]> {
    const conn = await pool.getConnection();
    try {
      console.log("Getting all purchase history");

      // First, check if the purchases table exists
      try {
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'purchases'`);
        if ((tables as any[]).length === 0) {
          console.log("Purchases table doesn't exist yet");
          return [];
        }

        // Check if purchase_items table exists
        const [itemTables] = await conn.execute(`SHOW TABLES LIKE 'purchase_items'`);
        if ((itemTables as any[]).length === 0) {
          console.log("Purchase_items table doesn't exist yet");
          return [];
        }

        // Get all purchases with detailed information
        const query = `
          SELECT
            p.id as purchaseId,
            p.purchase_date,
            p.supplier_id,
            p.bill_no as billNo,
            p.page_no as pageNo,
            p.total_amount as purchaseTotalAmount,
            p.total_gst_amount as purchaseTotalGstAmount,
            p.grand_total as purchaseGrandTotal,
            p.notes,
            p.receipt_image as receiptImage,
            p.status,
            p.created_at as purchaseCreatedAt,
            s.id as supplierId,
            s.name as supplierName,
            s.contact_name as supplierContactName,
            s.email as supplierEmail,
            s.phone as supplierPhone,
            s.address as supplierAddress,
            pi.id as itemId,
            pi.item_name as productName,
            pi.quantity,
            pi.rate as price,
            pi.unit,
            pi.gst_percentage as gstPercentage,
            pi.gst_amount as gstAmount,
            pi.amount as totalAmount
          FROM purchases p
          JOIN purchase_items pi ON p.id = pi.purchase_id
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          ORDER BY p.purchase_date DESC, p.id DESC
        `;

        console.log("Executing query:", query);
        const [rows] = await conn.execute(query);

        // Transform the data to include proper types
        const result = (rows as any[]).map(row => ({
          purchaseId: row.purchaseId,
          purchase_date: row.purchase_date,
          supplier_id: row.supplier_id,
          billNo: row.billNo,
          pageNo: row.pageNo,
          purchaseTotalAmount: parseFloat(row.purchaseTotalAmount),
          purchaseTotalGstAmount: parseFloat(row.purchaseTotalGstAmount),
          purchaseGrandTotal: parseFloat(row.purchaseGrandTotal),
          notes: row.notes,
          receiptImage: row.receiptImage,
          status: row.status,
          purchaseCreatedAt: row.purchaseCreatedAt,
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          supplierContactName: row.supplierContactName,
          supplierEmail: row.supplierEmail,
          supplierPhone: row.supplierPhone,
          supplierAddress: row.supplierAddress,
          itemId: row.itemId,
          productName: row.productName,
          quantity: parseFloat(row.quantity),
          price: parseFloat(row.price),
          unit: row.unit,
          gstPercentage: parseFloat(row.gstPercentage),
          gstAmount: parseFloat(row.gstAmount),
          totalAmount: parseFloat(row.totalAmount)
        }));

        console.log(`Retrieved ${result.length} purchase history records`);
        return result;
      } catch (error) {
        console.error("Error in getAllPurchaseHistory:", error);
        throw error;
      }
    } finally {
      conn.release();
    }
  }

  async getProductPurchaseHistory(supplierId: number, productName: string): Promise<any[]> {
    const conn = await pool.getConnection();
    try {
      console.log(`Getting purchase history for supplier ID: ${supplierId} and product: ${productName}`);

      // First, check if the purchases table exists
      try {
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'purchases'`);
        if ((tables as any[]).length === 0) {
          console.log("Purchases table doesn't exist yet");
          return [];
        }

        // Check if purchase_items table exists
        const [itemTables] = await conn.execute(`SHOW TABLES LIKE 'purchase_items'`);
        if ((itemTables as any[]).length === 0) {
          console.log("Purchase_items table doesn't exist yet");
          return [];
        }

        // Get purchases for this supplier and product
        const query = `
          SELECT
            p.id as purchaseId,
            p.purchase_date,
            p.supplier_id,
            p.bill_no as billNo,
            p.receipt_image as receiptImage,
            s.name as supplierName,
            pi.item_name as productName,
            pi.quantity,
            pi.rate as price,
            pi.unit,
            pi.gst_percentage as gstPercentage,
            pi.gst_amount as gstAmount,
            pi.amount as totalAmount
          FROM purchases p
          JOIN purchase_items pi ON p.id = pi.purchase_id
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE p.supplier_id = ? AND pi.item_name = ?
          ORDER BY p.purchase_date DESC
        `;

        console.log("Executing query:", query);
        const [rows] = await conn.execute(query, [supplierId, productName]);
        console.log(`Purchase history results for supplier ${supplierId} and product ${productName}:`, rows);

        return rows as any[];
      } catch (error) {
        console.error(`Error in getProductPurchaseHistory for supplier ${supplierId} and product ${productName}:`, error);
        throw error;
      }
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

      if (supplier.supplierImage !== undefined) {
        fields.push('supplier_image');
        placeholders.push('?');
        values.push(supplier.supplierImage);
      }

      const query = `INSERT INTO suppliers (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      const [result] = await conn.execute(query, values);
      const insertId = (result as any).insertId;
      const [rows] = await conn.execute(`SELECT * FROM suppliers WHERE id = ?`, [insertId]);
      const dbSupplier = (rows as any[])[0];

      let tags = [];

      // Fix for tags parsing
      try {
        if (dbSupplier.tags) {
          // If it's already an array, use it directly
          if (Array.isArray(dbSupplier.tags)) {
            tags = dbSupplier.tags;
          }
          // If it's a string, try to parse it as JSON
          else if (typeof dbSupplier.tags === 'string') {
            if (dbSupplier.tags.trim() === '') {
              // Empty string, set to empty array
              tags = [];

              // Update the database with the correct JSON format
              conn.execute(
                `UPDATE suppliers SET tags = '[]' WHERE id = ?`,
                [dbSupplier.id]
              ).catch(err => console.error("Failed to update empty tags:", err));
            } else {
              try {
                // Try to parse as JSON
                tags = JSON.parse(dbSupplier.tags);
              } catch (jsonError) {
                // If JSON parsing fails, try to handle as comma-separated string
                tags = dbSupplier.tags.split(',').map((tag: string) => tag.trim());

                // Update the database with the correct JSON format
                const jsonTags = JSON.stringify(tags);
                conn.execute(
                  `UPDATE suppliers SET tags = ? WHERE id = ?`,
                  [jsonTags, dbSupplier.id]
                ).catch(err => console.error("Failed to update tags format:", err));
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error handling tags for supplier ${dbSupplier.id}:`, error);
        // Set to empty array as fallback
        tags = [];

        // Fix the database entry
        conn.execute(
          `UPDATE suppliers SET tags = '[]' WHERE id = ?`,
          [dbSupplier.id]
        ).catch(err => console.error("Failed to reset tags:", err));
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
        supplierImage: dbSupplier.supplier_image,
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
      if (supplier.supplierImage !== undefined) {
        fields.push('supplier_image = ?');
        values.push(supplier.supplierImage);
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
          if (typeof dbSupplier.tags === 'string' && dbSupplier.tags.trim() !== '') {
            tags = JSON.parse(dbSupplier.tags);
          }
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
        supplierImage: dbSupplier.supplier_image,
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
              description TEXT,
              image_path VARCHAR(255) DEFAULT NULL
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
            description: category.description,
            imagePath: category.image_path
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
        marketPrice: dbProduct.market_price || 0,
        retailPrice: dbProduct.retail_price || 0,
        catererPrice: dbProduct.caterer_price || 0,
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
              market_price DECIMAL(10,2) DEFAULT 0,
              retail_price DECIMAL(10,2) DEFAULT 0,
              caterer_price DECIMAL(10,2) DEFAULT 0,
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
            marketPrice: product.market_price || 0,
            retailPrice: product.retail_price || 0,
            catererPrice: product.caterer_price || 0,
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
                market_price DECIMAL(10,2) DEFAULT 0,
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

            if (!columnNames.includes('market_price')) {
              console.log("Adding missing column: market_price");
              await conn.execute(`ALTER TABLE products ADD COLUMN market_price DECIMAL(10,2) DEFAULT 0`);
            }

            if (!columnNames.includes('market_price')) {
              console.log("Adding missing column: market_price");
              await conn.execute(`ALTER TABLE products ADD COLUMN market_price DECIMAL(10,2) DEFAULT 0`);
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

        if (product.marketPrice !== undefined) {
          fields.push('market_price');
          placeholders.push('?');
          // Convert to number and handle potential NaN
          const marketPrice = Number(product.marketPrice);
          values.push(isNaN(marketPrice) ? 0 : marketPrice);
        }

        if (product.retailPrice !== undefined) {
          fields.push('retail_price');
          placeholders.push('?');
          // Convert to number and handle potential NaN
          const retailPrice = Number(product.retailPrice);
          values.push(isNaN(retailPrice) ? 0 : retailPrice);
        }

        if (product.catererPrice !== undefined) {
          fields.push('caterer_price');
          placeholders.push('?');
          // Convert to number and handle potential NaN
          const catererPrice = Number(product.catererPrice);
          values.push(isNaN(catererPrice) ? 0 : catererPrice);
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
            marketPrice: dbProduct.market_price || 0,
            retailPrice: dbProduct.retail_price || 0,
            catererPrice: dbProduct.caterer_price || 0,
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
      if (product.marketPrice !== undefined) {
        fields.push('market_price = ?');
        values.push(product.marketPrice);
      }

      if (product.retailPrice !== undefined) {
        fields.push('retail_price = ?');
        values.push(product.retailPrice);
      }

      if (product.catererPrice !== undefined) {
        fields.push('caterer_price = ?');
        values.push(product.catererPrice);
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
        marketPrice: dbProduct.market_price || 0,
        retailPrice: dbProduct.retail_price || 0,
        catererPrice: dbProduct.caterer_price || 0,
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
          marketPrice: product.market_price || 0,
          retailPrice: product.retail_price || 0,
          catererPrice: product.caterer_price || 0,
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
        // Check if the invoice exists before adding it to avoid foreign key constraint errors
        try {
          const [invoiceRows] = await conn.execute(`SELECT id FROM invoices WHERE id = ?`, [transaction.invoiceId]);
          if ((invoiceRows as any[]).length > 0) {
            fields.push('invoice_id');
            placeholders.push('?');
            values.push(transaction.invoiceId);
          } else {
            console.log(`Invoice ID ${transaction.invoiceId} does not exist, skipping this field`);
          }
        } catch (error) {
          console.error(`Error checking invoice ID ${transaction.invoiceId}:`, error);
          // Skip adding the invoice_id field if there's an error
        }
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

  // Payment reminders implementation
  async getPaymentReminders(): Promise<PaymentReminder[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute(`
        SELECT * FROM payment_reminders
        ORDER BY reminder_date ASC
      `);
      return (rows as any[]).map(this.mapPaymentReminderFromDb);
    } finally {
      conn.release();
    }
  }

  async getPaymentReminder(id: string): Promise<PaymentReminder | undefined> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute(
        'SELECT * FROM payment_reminders WHERE id = ?',
        [id]
      );
      const reminder = (rows as any[])[0];
      return reminder ? this.mapPaymentReminderFromDb(reminder) : undefined;
    } finally {
      conn.release();
    }
  }

  async createPaymentReminder(reminder: InsertPaymentReminder): Promise<PaymentReminder> {
    const conn = await this.getConnection();
    try {
      const id = crypto.randomUUID();

      // Format dates for MySQL (YYYY-MM-DD format)
      const formatDateForMySQL = (date: Date | string) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toISOString().split('T')[0];
      };

      await conn.execute(
        `INSERT INTO payment_reminders (
          id, caterer_id, distribution_id, amount,
          original_due_date, reminder_date, next_reminder_date,
          status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          reminder.catererId,
          reminder.distributionId || null,
          reminder.amount,
          formatDateForMySQL(reminder.originalDueDate),
          formatDateForMySQL(reminder.reminderDate),
          reminder.nextReminderDate ? formatDateForMySQL(reminder.nextReminderDate) : null,
          reminder.status || 'pending',
          reminder.notes || null
        ]
      );

      const [rows] = await conn.execute(
        'SELECT * FROM payment_reminders WHERE id = ?',
        [id]
      );
      return this.mapPaymentReminderFromDb((rows as any[])[0]);
    } finally {
      conn.release();
    }
  }

  async updatePaymentReminder(id: string, updates: Partial<PaymentReminder>): Promise<PaymentReminder | undefined> {
    const conn = await this.getConnection();
    try {
      // Format dates for MySQL (YYYY-MM-DD format)
      const formatDateForMySQL = (date: Date | string) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toISOString().split('T')[0];
      };

      // Manual field mapping to ensure correct database column names
      const fieldMappings: { [key: string]: string } = {
        'catererId': 'caterer_id',
        'distributionId': 'distribution_id',
        'originalDueDate': 'original_due_date',
        'reminderDate': 'reminder_date',
        'nextReminderDate': 'next_reminder_date',
        'isRead': 'is_read',
        'isAcknowledged': 'is_acknowledged',
        'acknowledgedAt': 'acknowledged_at',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at'
      };

      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        const dbField = fieldMappings[key] || key;
        fields.push(`${dbField} = ?`);

        // Format date values for MySQL
        if ((value instanceof Date || typeof value === 'string') && (key === 'originalDueDate' || key === 'reminderDate' || key === 'nextReminderDate')) {
          values.push(formatDateForMySQL(value));
        } else {
          values.push(value);
        }
      });

      if (fields.length === 0) return undefined;

      const setClause = fields.join(', ');
      const query = `UPDATE payment_reminders SET ${setClause} WHERE id = ?`;

      console.log('Updating payment reminder:', { id, query, values });
      await conn.execute(query, [...values, id]);

      const [rows] = await conn.execute(
        'SELECT * FROM payment_reminders WHERE id = ?',
        [id]
      );
      const reminder = (rows as any[])[0];
      return reminder ? this.mapPaymentReminderFromDb(reminder) : undefined;
    } catch (error) {
      console.error('Error updating payment reminder:', error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async deletePaymentReminder(id: string): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      const [result] = await conn.execute(
        'DELETE FROM payment_reminders WHERE id = ?',
        [id]
      );
      return (result as any).affectedRows > 0;
    } finally {
      conn.release();
    }
  }

  private mapPaymentReminderFromDb(row: any): PaymentReminder {
    return {
      id: row.id,
      catererId: row.caterer_id,
      distributionId: row.distribution_id,
      amount: parseFloat(row.amount),
      originalDueDate: new Date(row.original_due_date),
      reminderDate: new Date(row.reminder_date),
      nextReminderDate: row.next_reminder_date ? new Date(row.next_reminder_date) : undefined,
      status: row.status,
      isRead: Boolean(row.is_read),
      isAcknowledged: Boolean(row.is_acknowledged),
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute('SELECT * FROM users WHERE id = ?', [id]);
      return (rows as any[])[0];
    } finally {
      conn.release();
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute('SELECT * FROM users WHERE username = ?', [username]);
      return (rows as any[])[0];
    } finally {
      conn.release();
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const conn = await this.getConnection();
    try {
      const [result] = await conn.execute(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [user.username, user.password, user.role]
      );
      const id = (result as any).insertId;
      const [rows] = await conn.execute('SELECT * FROM users WHERE id = ?', [id]);
      return (rows as any[])[0];
    } finally {
      conn.release();
    }
  }

  async getUsers(): Promise<User[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute('SELECT * FROM users');
      return rows as User[];
    } finally {
      conn.release();
    }
  }

  // Inventory management
  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const conn = await this.getConnection();
    try {
      const [result] = await conn.execute(
        `INSERT INTO inventory (
          product_id, supplier_id, batch_number, quantity,
          unit_price, expiry_date, purchase_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.productId,
          item.supplierId,
          item.batchNumber,
          item.quantity,
          item.unitPrice,
          item.expiryDate,
          item.purchaseDate || new Date(),
          item.notes || null
        ]
      );
      const id = (result as any).insertId;
      const [rows] = await conn.execute('SELECT * FROM inventory WHERE id = ?', [id]);
      return (rows as any[])[0];
    } finally {
      conn.release();
    }
  }

  async updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory | undefined> {
    const conn = await this.getConnection();
    try {
      const fields = Object.keys(item).map(key => this.toSnakeCase(key));
      const values = Object.values(item);

      if (fields.length === 0) return undefined;

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      await conn.execute(
        `UPDATE inventory SET ${setClause} WHERE id = ?`,
        [...values, id]
      );

      const [rows] = await conn.execute('SELECT * FROM inventory WHERE id = ?', [id]);
      return (rows as any[])[0];
    } finally {
      conn.release();
    }
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      const [result] = await conn.execute('DELETE FROM inventory WHERE id = ?', [id]);
      return (result as any).affectedRows > 0;
    } finally {
      conn.release();
    }
  }

  async updateInventoryQuantity(productId: number, quantity: number, isAddition: boolean): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT quantity FROM inventory WHERE product_id = ? AND status = "active" LIMIT 1',
        [productId]
      );

      if ((rows as any[]).length === 0) {
        await conn.rollback();
        return false;
      }

      const currentQuantity = parseFloat((rows as any[])[0].quantity);
      const newQuantity = isAddition ? currentQuantity + quantity : Math.max(0, currentQuantity - quantity);

      await conn.execute(
        'UPDATE inventory SET quantity = ? WHERE product_id = ? AND status = "active"',
        [newQuantity, productId]
      );

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // Invoice management
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute('SELECT * FROM invoices WHERE id = ?', [id]);
      return (rows as any[])[0];
    } finally {
      conn.release();
    }
  }

  async getInvoices(): Promise<Invoice[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute('SELECT * FROM invoices');
      return rows as Invoice[];
    } finally {
      conn.release();
    }
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const conn = await this.getConnection();
    try {
      const [result] = await conn.execute(
        `INSERT INTO invoices (
          supplier_id, invoice_number, invoice_date,
          total_amount, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          invoice.supplierId,
          invoice.invoiceNumber,
          invoice.invoiceDate,
          invoice.totalAmount,
          invoice.status || 'pending',
          invoice.notes || null
        ]
      );
      const id = (result as any).insertId;
      const [rows] = await conn.execute('SELECT * FROM invoices WHERE id = ?', [id]);
      return (rows as any[])[0];
    } finally {
      conn.release();
    }
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const conn = await this.getConnection();
    try {
      await conn.execute(
        'UPDATE invoices SET status = ? WHERE id = ?',
        [status, id]
      );
      const [rows] = await conn.execute('SELECT * FROM invoices WHERE id = ?', [id]);
      return (rows as any[])[0];
    } finally {
      conn.release();
    }
  }

  async getInvoicesBySupplier(supplierId: number): Promise<Invoice[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute(
        'SELECT * FROM invoices WHERE supplier_id = ?',
        [supplierId]
      );
      return rows as Invoice[];
    } finally {
      conn.release();
    }
  }

  // Invoice items
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute(
        'SELECT * FROM invoice_items WHERE invoice_id = ?',
        [invoiceId]
      );
      return rows as InvoiceItem[];
    } finally {
      conn.release();
    }
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const conn = await this.getConnection();
    try {
      const [result] = await conn.execute(
        `INSERT INTO invoice_items (
          invoice_id, product_id, quantity,
          unit_price, total_amount
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          item.invoiceId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.totalAmount
        ]
      );
      const id = (result as any).insertId;
      const [rows] = await conn.execute('SELECT * FROM invoice_items WHERE id = ?', [id]);
      return (rows as any[])[0];
    } finally {
      conn.release();
    }
  }

  // Inventory history management
  async getInventoryHistory(inventoryId?: number, productId?: number): Promise<any[]> {
    const conn = await this.getConnection();
    try {
      // Check if inventory_history table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'inventory_history'`);
      if ((tables as any[]).length === 0) {
        console.log("Inventory history table doesn't exist yet");
        return [];
      }

      let query = `
        SELECT
          ih.*,
          p.name as product_name,
          s.name as supplier_name
        FROM inventory_history ih
        LEFT JOIN products p ON ih.product_id = p.id
        LEFT JOIN suppliers s ON ih.supplier_id = s.id
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      if (inventoryId) {
        conditions.push('ih.inventory_id = ?');
        params.push(inventoryId);
      }

      if (productId) {
        conditions.push('ih.product_id = ?');
        params.push(productId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY ih.created_at DESC';

      const [rows] = await conn.execute(query, params);

      // Map database fields to camelCase for the client
      const historyItems = (rows as any[]).map(item => ({
        id: item.id,
        inventoryId: item.inventory_id,
        productId: item.product_id,
        productName: item.product_name,
        supplierId: item.supplier_id,
        supplierName: item.supplier_name,
        changeType: item.change_type,
        fieldChanged: item.field_changed,
        oldValue: item.old_value,
        newValue: item.new_value,
        quantityBefore: item.quantity_before,
        quantityAfter: item.quantity_after,
        reason: item.reason,
        userId: item.user_id,
        userName: item.user_name,
        createdAt: item.created_at
      }));

      return historyItems;
    } catch (error) {
      console.error("Error fetching inventory history:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async createInventoryHistoryEntry(entry: any): Promise<any> {
    const conn = await this.getConnection();
    try {
      // Check if inventory_history table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'inventory_history'`);
      if ((tables as any[]).length === 0) {
        console.log("Inventory history table doesn't exist, skipping history entry");
        return null;
      }

      const [result] = await conn.execute(
        `INSERT INTO inventory_history (
          inventory_id, product_id, supplier_id, change_type,
          field_changed, old_value, new_value, quantity_before,
          quantity_after, reason, user_id, user_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.inventoryId,
          entry.productId,
          entry.supplierId,
          entry.changeType,
          entry.fieldChanged || null,
          entry.oldValue || null,
          entry.newValue || null,
          entry.quantityBefore || null,
          entry.quantityAfter || null,
          entry.reason || null,
          entry.userId || null,
          entry.userName || 'system'
        ]
      );

      const id = (result as any).insertId;
      const [rows] = await conn.execute('SELECT * FROM inventory_history WHERE id = ?', [id]);
      return (rows as any[])[0];
    } catch (error) {
      console.error("Error creating inventory history entry:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  // Customer billing methods
  async getCustomerBills(options: {
    page?: number;
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ data: CustomerBill[]; pagination: any }> {
    const conn = await this.getConnection();
    try {
      const { page = 1, limit = 10, offset = 0, search, status, startDate, endDate } = options;

      // Check if customer_bills table exists
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'customer_bills'`);
      if ((tables as any[]).length === 0) {
        console.log("Customer bills table doesn't exist yet");
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        };
      }

      // Build WHERE conditions
      const conditions: string[] = [];
      const params: any[] = [];

      if (search) {
        conditions.push('(client_name LIKE ? OR client_mobile LIKE ? OR bill_no LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }

      if (startDate) {
        conditions.push('bill_date >= ?');
        params.push(startDate);
      }

      if (endDate) {
        conditions.push('bill_date <= ?');
        params.push(endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const [countResult] = await conn.execute(
        `SELECT COUNT(*) as total FROM customer_bills ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get bills with pagination
      const [rows] = await conn.execute(
        `SELECT * FROM customer_bills ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const bills = (rows as any[]).map(bill => ({
        id: bill.id,
        billNo: bill.bill_no,
        billDate: bill.bill_date,
        clientName: bill.client_name,
        clientMobile: bill.client_mobile,
        clientEmail: bill.client_email,
        clientAddress: bill.client_address,
        totalAmount: bill.total_amount,
        marketTotal: bill.market_total,
        savings: bill.savings,
        itemCount: bill.item_count,
        paymentMethod: bill.payment_method,
        status: bill.status,
        createdAt: bill.created_at,
        updatedAt: bill.updated_at,
      }));

      return {
        data: bills as CustomerBill[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      };
    } catch (error) {
      console.error("Error fetching customer bills:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async getCustomerBill(id: number): Promise<CustomerBill | undefined> {
    const conn = await this.getConnection();
    try {
      // Get the bill
      const [billRows] = await conn.execute(
        'SELECT * FROM customer_bills WHERE id = ?',
        [id]
      );

      const bill = (billRows as any[])[0];
      if (!bill) {
        return undefined;
      }

      // Get the bill items
      const [itemRows] = await conn.execute(
        'SELECT * FROM customer_bill_items WHERE bill_id = ? ORDER BY id',
        [id]
      );

      const items = (itemRows as any[]).map(item => ({
        id: item.id,
        billId: item.bill_id,
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        pricePerKg: item.price_per_kg,
        marketPricePerKg: item.market_price_per_kg,
        total: item.total,
        createdAt: item.created_at,
      }));

      return {
        id: bill.id,
        billNo: bill.bill_no,
        billDate: bill.bill_date,
        clientName: bill.client_name,
        clientMobile: bill.client_mobile,
        clientEmail: bill.client_email,
        clientAddress: bill.client_address,
        totalAmount: bill.total_amount,
        marketTotal: bill.market_total,
        savings: bill.savings,
        itemCount: bill.item_count,
        paymentMethod: bill.payment_method,
        status: bill.status,
        createdAt: bill.created_at,
        updatedAt: bill.updated_at,
        items,
      } as any;
    } catch (error) {
      console.error(`Error fetching customer bill with ID ${id}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async createCustomerBill(bill: CustomerBillWithItems, existingConn?: any): Promise<CustomerBill> {
    const conn = existingConn || await this.getConnection();
    const shouldManageTransaction = !existingConn;

    try {
      if (shouldManageTransaction) {
        await conn.beginTransaction();
      }

      // Check if customer_bills table exists, create if not
      const [tables] = await conn.execute(`SHOW TABLES LIKE 'customer_bills'`);
      if ((tables as any[]).length === 0) {
        console.log("Customer bills table doesn't exist, creating it...");
        await conn.execute(`
          CREATE TABLE customer_bills (
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
            payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
            status VARCHAR(50) NOT NULL DEFAULT 'completed',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);

        await conn.execute(`
          CREATE TABLE customer_bill_items (
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
          )
        `);

        // Create indexes
        await conn.execute(`CREATE INDEX idx_customer_bills_bill_no ON customer_bills(bill_no)`);
        await conn.execute(`CREATE INDEX idx_customer_bills_client_mobile ON customer_bills(client_mobile)`);
        await conn.execute(`CREATE INDEX idx_customer_bill_items_bill_id ON customer_bill_items(bill_id)`);
      }

      // Insert the bill with duplicate handling
      let billResult;
      let finalBillNo = bill.billNo;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          [billResult] = await conn.execute(
            `INSERT INTO customer_bills (
              bill_no, bill_date, client_name, client_mobile, client_email,
              client_address, total_amount, market_total, savings, item_count, payment_method, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              finalBillNo,
              bill.billDate,
              bill.clientName,
              bill.clientMobile,
              bill.clientEmail || null,
              bill.clientAddress || null,
              bill.totalAmount,
              bill.marketTotal,
              bill.savings,
              bill.itemCount,
              bill.paymentMethod || 'Cash',
              bill.status
            ]
          );
          break; // Success, exit loop
        } catch (error: any) {
          if (error.code === 'ER_DUP_ENTRY' && attempts < maxAttempts - 1) {
            // Generate new bill number
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            finalBillNo = timestamp + random;
            attempts++;
            console.log(`Duplicate bill number detected, trying with new number: ${finalBillNo}`);
          } else {
            throw error; // Re-throw if not duplicate or max attempts reached
          }
        }
      }

      const billId = (billResult as any).insertId;

      // Insert the bill items
      if (bill.items && bill.items.length > 0) {
        for (const item of bill.items) {
          await conn.execute(
            `INSERT INTO customer_bill_items (
              bill_id, product_id, product_name, quantity, unit,
              price_per_kg, market_price_per_kg, total
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              billId,
              item.productId,
              item.productName,
              item.quantity,
              item.unit,
              item.pricePerKg,
              item.marketPricePerKg,
              item.total
            ]
          );
        }
      }

      if (shouldManageTransaction) {
        await conn.commit();
      }

      // Return the created bill
      try {
        const createdBill = await this.getCustomerBill(billId);
        if (createdBill) {
          return createdBill as CustomerBill;
        }
      } catch (error) {
        console.warn("Failed to retrieve created bill, returning basic bill object:", error);
      }

      // Fallback: return a basic bill object with the ID
      return {
        id: billId,
        billNo: finalBillNo,
        billDate: bill.billDate,
        clientName: bill.clientName,
        clientMobile: bill.clientMobile,
        clientEmail: bill.clientEmail,
        clientAddress: bill.clientAddress,
        totalAmount: bill.totalAmount,
        marketTotal: bill.marketTotal,
        savings: bill.savings,
        itemCount: bill.itemCount,
        paymentMethod: bill.paymentMethod || 'Cash',
        status: bill.status,
        items: bill.items || [],
        createdAt: new Date(),
        updatedAt: new Date()
      } as CustomerBill;
    } catch (error) {
      if (shouldManageTransaction) {
        await conn.rollback();
      }
      console.error("Error creating customer bill:", error);
      throw error;
    } finally {
      if (shouldManageTransaction) {
        conn.release();
      }
    }
  }

  async updateCustomerBill(id: number, bill: Partial<CustomerBillWithItems>): Promise<CustomerBill | undefined> {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();

      // Update the bill
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (bill.billNo !== undefined) {
        updateFields.push('bill_no = ?');
        updateValues.push(bill.billNo);
      }
      if (bill.billDate !== undefined) {
        updateFields.push('bill_date = ?');
        updateValues.push(bill.billDate);
      }
      if (bill.clientName !== undefined) {
        updateFields.push('client_name = ?');
        updateValues.push(bill.clientName);
      }
      if (bill.clientMobile !== undefined) {
        updateFields.push('client_mobile = ?');
        updateValues.push(bill.clientMobile);
      }
      if (bill.clientEmail !== undefined) {
        updateFields.push('client_email = ?');
        updateValues.push(bill.clientEmail);
      }
      if (bill.clientAddress !== undefined) {
        updateFields.push('client_address = ?');
        updateValues.push(bill.clientAddress);
      }
      if (bill.totalAmount !== undefined) {
        updateFields.push('total_amount = ?');
        updateValues.push(bill.totalAmount);
      }
      if (bill.marketTotal !== undefined) {
        updateFields.push('market_total = ?');
        updateValues.push(bill.marketTotal);
      }
      if (bill.savings !== undefined) {
        updateFields.push('savings = ?');
        updateValues.push(bill.savings);
      }
      if (bill.itemCount !== undefined) {
        updateFields.push('item_count = ?');
        updateValues.push(bill.itemCount);
      }
      if (bill.paymentMethod !== undefined) {
        updateFields.push('payment_method = ?');
        updateValues.push(bill.paymentMethod);
      }
      if (bill.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(bill.status);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);

        await conn.execute(
          `UPDATE customer_bills SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // If items are provided, replace all items
      if (bill.items !== undefined) {
        // Delete existing items
        await conn.execute('DELETE FROM customer_bill_items WHERE bill_id = ?', [id]);

        // Insert new items
        if (bill.items.length > 0) {
          for (const item of bill.items) {
            await conn.execute(
              `INSERT INTO customer_bill_items (
                bill_id, product_id, product_name, quantity, unit,
                price_per_kg, market_price_per_kg, total
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                item.productId,
                item.productName,
                item.quantity,
                item.unit,
                item.pricePerKg,
                item.marketPricePerKg,
                item.total
              ]
            );
          }
        }
      }

      await conn.commit();

      // Return the updated bill
      return await this.getCustomerBill(id);
    } catch (error) {
      await conn.rollback();
      console.error(`Error updating customer bill with ID ${id}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async deleteCustomerBill(id: number): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();

      // Delete bill items first (due to foreign key constraint)
      await conn.execute('DELETE FROM customer_bill_items WHERE bill_id = ?', [id]);

      // Delete the bill
      const [result] = await conn.execute('DELETE FROM customer_bills WHERE id = ?', [id]);

      await conn.commit();

      return (result as any).affectedRows > 0;
    } catch (error) {
      await conn.rollback();
      console.error(`Error deleting customer bill with ID ${id}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }
}

// Create and export a singleton instance of MemStorage
export const storage = new MemStorage();

