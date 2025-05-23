import { pgTable, text, serial, integer, boolean, numeric, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = typeof purchaseItems.$inferInsert;

export type PurchasePriceHistory = typeof purchasePriceHistory.$inferSelect;
export type InsertPurchasePriceHistory = typeof purchasePriceHistory.$inferInsert;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("user"),
});

// Suppliers table (formerly vendors)
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  paymentTerms: text("payment_terms"),
  creditLimit: numeric("credit_limit").default("0"),
  balanceDue: numeric("balance_due").default("0"),
  totalPaid: numeric("total_paid").default("0"),
  notes: text("notes"),
  rating: integer("rating"),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

// Products table (formerly spices)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull(),
  origin: text("origin"),
  description: text("description"),
  price: numeric("price").default("0"),
  unit: text("unit").default("kg"),
  stocksQty: integer("stocks_qty").default(0),
  isActive: boolean("is_active").notNull().default(true),
  imagePath: text("image_path"),
});

// Inventory table
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  batchNumber: text("batch_number").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalValue: numeric("total_value").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  purchaseDate: timestamp("purchase_date").notNull().defaultNow(),
  barcode: text("barcode"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  supplierId: integer("supplier_id").notNull(),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  status: text("status").notNull().default("unpaid"),
  notes: text("notes"),
  deliveryPersonName: text("delivery_person_name"),
  deliveryPersonContact: text("delivery_person_contact"),
});

// Invoice items table
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  total: numeric("total").notNull(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  invoiceId: integer("invoice_id"),
  amount: numeric("amount").notNull(),
  transactionDate: timestamp("transaction_date").notNull().defaultNow(),
  type: text("type").notNull(), // payment or receipt
  notes: text("notes"),
});

// Alerts table
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // low_stock, expiry, etc.
  message: text("message").notNull(),
  relatedId: integer("related_id"), // ID of related entity (inventory, etc)
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Purchase table schema
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  companyAddress: text("company_address").notNull(),
  billNo: text("bill_no").notNull(),
  pageNo: text("page_no").notNull(),
  supplierId: integer("supplier_id"),
  purchaseDate: timestamp("purchase_date").notNull().defaultNow(),
  totalAmount: numeric("total_amount").notNull().default("0"),
  totalGstAmount: numeric("total_gst_amount").notNull().default("0"),
  grandTotal: numeric("grand_total").notNull().default("0"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Purchase items table schema
export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull(),
  itemName: text("item_name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull().default("kg"),
  rate: numeric("rate").notNull(),
  gstPercentage: numeric("gst_percentage").notNull().default("0"),
  gstAmount: numeric("gst_amount").notNull().default("0"),
  amount: numeric("amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Purchase price history table
export const purchasePriceHistory = pgTable("purchase_price_history", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  productId: integer("product_id").notNull(),
  purchaseDate: timestamp("purchase_date").notNull().defaultNow(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull().default("kg"),
  price: numeric("price").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const insertSupplierSchema = createInsertSchema(suppliers)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    tags: z.array(z.string()).optional().default([]),
    creditLimit: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          return val === '' ? undefined : parseFloat(val);
        }
        return val;
      },
      z.number().optional()
    ),
  });

export const insertCategorySchema = createInsertSchema(categories)
  .omit({ id: true });

export const insertProductSchema = createInsertSchema(products)
  .omit({ id: true })
  .extend({
    price: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          return val === '' ? undefined : parseFloat(val);
        }
        return val;
      },
      z.number().optional()
    ),
  });

export const insertInventorySchema = createInsertSchema(inventory)
  .omit({ id: true });

export const insertInvoiceSchema = createInsertSchema(invoices)
  .omit({ id: true });

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems)
  .omit({ id: true });

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({ id: true });

export const insertAlertSchema = createInsertSchema(alerts)
  .omit({ id: true });

export const insertPurchaseSchema = createInsertSchema(purchases)
  .omit({ id: true, createdAt: true });

export const insertPurchaseItemSchema = createInsertSchema(purchaseItems)
  .omit({ id: true, createdAt: true });

export const insertPurchasePriceHistorySchema = createInsertSchema(purchasePriceHistory)
  .omit({ id: true, createdAt: true });
