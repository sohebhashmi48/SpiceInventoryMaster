import { 
  User, InsertUser, 
  Vendor, InsertVendor, 
  Category, InsertCategory, 
  Spice, InsertSpice, 
  Inventory, InsertInventory, 
  Invoice, InsertInvoice, 
  InvoiceItem, InsertInvoiceItem,
  Transaction, InsertTransaction,
  Alert, InsertAlert
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { nanoid } from "nanoid";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Vendor management
  getVendor(id: number): Promise<Vendor | undefined>;
  getVendors(): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;

  // Category management
  getCategory(id: number): Promise<Category | undefined>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Spice management
  getSpice(id: number): Promise<Spice | undefined>;
  getSpices(): Promise<Spice[]>;
  createSpice(spice: InsertSpice): Promise<Spice>;
  updateSpice(id: number, spice: Partial<Spice>): Promise<Spice | undefined>;
  getSpicesByCategory(categoryId: number): Promise<Spice[]>;

  // Inventory management
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  getInventory(): Promise<Inventory[]>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  getLowStockItems(threshold: number): Promise<Inventory[]>;
  getExpiringItems(daysThreshold: number): Promise<Inventory[]>;

  // Invoice management
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined>;
  getInvoicesByVendor(vendorId: number): Promise<Invoice[]>;

  // Invoice items
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;

  // Transactions
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByVendor(vendorId: number): Promise<Transaction[]>;

  // Alerts
  getAlert(id: number): Promise<Alert | undefined>;
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlertStatus(id: number, status: string): Promise<Alert | undefined>;
  deleteAlert(id: number): Promise<boolean>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private vendors: Map<number, Vendor>;
  private categories: Map<number, Category>;
  private spices: Map<number, Spice>;
  private inventory: Map<number, Inventory>;
  private invoices: Map<number, Invoice>;
  private invoiceItems: Map<number, InvoiceItem>;
  private transactions: Map<number, Transaction>;
  private alerts: Map<number, Alert>;
  
  currentUserId: number;
  currentVendorId: number;
  currentCategoryId: number;
  currentSpiceId: number;
  currentInventoryId: number;
  currentInvoiceId: number;
  currentInvoiceItemId: number;
  currentTransactionId: number;
  currentAlertId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.vendors = new Map();
    this.categories = new Map();
    this.spices = new Map();
    this.inventory = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.transactions = new Map();
    this.alerts = new Map();
    
    this.currentUserId = 1;
    this.currentVendorId = 1;
    this.currentCategoryId = 1;
    this.currentSpiceId = 1;
    this.currentInventoryId = 1;
    this.currentInvoiceId = 1;
    this.currentInvoiceItemId = 1;
    this.currentTransactionId = 1;
    this.currentAlertId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });

    // Add initial categories
    this.seedCategories();
  }

  // Seed some initial categories
  private async seedCategories() {
    const initialCategories = [
      { name: "Seeds" },
      { name: "Ground Spices" },
      { name: "Leaves & Herbs" },
      { name: "Spice Blends" }
    ];

    for (const category of initialCategories) {
      await this.createCategory(category);
    }
  }

  // User Management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email || null 
    };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Vendor Management
  async getVendor(id: number): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

  async getVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const id = this.currentVendorId++;
    const vendor: Vendor = { ...insertVendor, id };
    this.vendors.set(id, vendor);
    return vendor;
  }

  async updateVendor(id: number, vendorUpdate: Partial<Vendor>): Promise<Vendor | undefined> {
    const vendor = this.vendors.get(id);
    if (!vendor) return undefined;
    
    const updatedVendor = { ...vendor, ...vendorUpdate };
    this.vendors.set(id, updatedVendor);
    return updatedVendor;
  }

  async deleteVendor(id: number): Promise<boolean> {
    return this.vendors.delete(id);
  }

  // Category Management
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  // Spice Management
  async getSpice(id: number): Promise<Spice | undefined> {
    return this.spices.get(id);
  }

  async getSpices(): Promise<Spice[]> {
    return Array.from(this.spices.values());
  }

  async createSpice(insertSpice: InsertSpice): Promise<Spice> {
    const id = this.currentSpiceId++;
    const spice: Spice = { ...insertSpice, id };
    this.spices.set(id, spice);
    return spice;
  }

  async updateSpice(id: number, spiceUpdate: Partial<Spice>): Promise<Spice | undefined> {
    const spice = this.spices.get(id);
    if (!spice) return undefined;
    
    const updatedSpice = { ...spice, ...spiceUpdate };
    this.spices.set(id, updatedSpice);
    return updatedSpice;
  }

  async getSpicesByCategory(categoryId: number): Promise<Spice[]> {
    return Array.from(this.spices.values()).filter(
      (spice) => spice.categoryId === categoryId,
    );
  }

  // Inventory Management
  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    return this.inventory.get(id);
  }

  async getInventory(): Promise<Inventory[]> {
    return Array.from(this.inventory.values());
  }

  async createInventoryItem(insertItem: InsertInventory): Promise<Inventory> {
    const id = this.currentInventoryId++;
    const item: Inventory = { 
      ...insertItem, 
      id, 
      barcode: insertItem.barcode || `INV-${nanoid(8)}`
    };
    this.inventory.set(id, item);
    
    // Check if we need to create low stock alert
    if (Number(item.quantity) < 5) {
      const spice = await this.getSpice(item.spiceId);
      if (spice) {
        await this.createAlert({
          type: "low_stock",
          message: `Low Stock Alert: ${spice.name}`,
          relatedId: id,
          status: "active",
          createdAt: new Date()
        });
      }
    }
    
    return item;
  }

  async updateInventoryItem(id: number, itemUpdate: Partial<Inventory>): Promise<Inventory | undefined> {
    const item = this.inventory.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemUpdate };
    this.inventory.set(id, updatedItem);
    
    // Check if we need to create/update low stock alert
    if (Number(updatedItem.quantity) < 5) {
      const spice = await this.getSpice(item.spiceId);
      if (spice) {
        // Check if alert already exists
        const existingAlert = Array.from(this.alerts.values()).find(
          alert => alert.relatedId === id && alert.type === "low_stock" && alert.status === "active"
        );
        
        if (!existingAlert) {
          await this.createAlert({
            type: "low_stock",
            message: `Low Stock Alert: ${spice.name}`,
            relatedId: id,
            status: "active",
            createdAt: new Date()
          });
        }
      }
    }
    
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    return this.inventory.delete(id);
  }

  async getLowStockItems(threshold: number): Promise<Inventory[]> {
    return Array.from(this.inventory.values()).filter(
      (item) => Number(item.quantity) < threshold,
    );
  }

  async getExpiringItems(daysThreshold: number): Promise<Inventory[]> {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    return Array.from(this.inventory.values()).filter(
      (item) => {
        const expiryDate = new Date(item.expiryDate);
        return expiryDate <= thresholdDate && expiryDate >= now;
      },
    );
  }

  // Invoice Management
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.currentInvoiceId++;
    const invoice: Invoice = { 
      ...insertInvoice, 
      id, 
      invoiceNumber: insertInvoice.invoiceNumber || `INV-${nanoid(6)}`
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, status };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async getInvoicesByVendor(vendorId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.vendorId === vendorId,
    );
  }

  // Invoice Items
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values()).filter(
      (item) => item.invoiceId === invoiceId,
    );
  }

  async createInvoiceItem(insertItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = this.currentInvoiceItemId++;
    const item: InvoiceItem = { ...insertItem, id };
    this.invoiceItems.set(id, item);
    return item;
  }

  // Transactions
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const transaction: Transaction = { ...insertTransaction, id };
    this.transactions.set(id, transaction);
    
    // Update vendor's money owed/paid based on transaction type
    const vendor = await this.getVendor(transaction.vendorId);
    if (vendor) {
      if (transaction.type === "payment") {
        await this.updateVendor(vendor.id, {
          moneyOwed: (Number(vendor.moneyOwed) - Number(transaction.amount)).toString()
        });
      } else if (transaction.type === "receipt") {
        await this.updateVendor(vendor.id, {
          moneyPaid: (Number(vendor.moneyPaid) + Number(transaction.amount)).toString()
        });
      }
    }
    
    return transaction;
  }

  async getTransactionsByVendor(vendorId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.vendorId === vendorId,
    );
  }

  // Alerts
  async getAlert(id: number): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const alert: Alert = { ...insertAlert, id };
    this.alerts.set(id, alert);
    return alert;
  }

  async updateAlertStatus(id: number, status: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updatedAlert = { ...alert, status };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  async deleteAlert(id: number): Promise<boolean> {
    return this.alerts.delete(id);
  }
}

export const storage = new MemStorage();
