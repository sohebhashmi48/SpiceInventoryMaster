import { pgTable, text, serial, integer, boolean, numeric, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("employee"),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  paymentTerms: text("payment_terms").notNull(),
  moneyOwed: numeric("money_owed").notNull().default("0"),
  moneyPaid: numeric("money_paid").notNull().default("0"),
  rating: integer("rating"),
  notes: text("notes"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const spices = pgTable("spices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull(),
  origin: text("origin"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  spiceId: integer("spice_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
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

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  vendorId: integer("vendor_id").notNull(),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  status: text("status").notNull().default("unpaid"),
  notes: text("notes"),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  spiceId: integer("spice_id").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  total: numeric("total").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  invoiceId: integer("invoice_id"),
  amount: numeric("amount").notNull(),
  transactionDate: timestamp("transaction_date").notNull().defaultNow(),
  type: text("type").notNull(), // payment or receipt
  notes: text("notes"),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // low_stock, expiry, etc.
  message: text("message").notNull(),
  relatedId: integer("related_id"), // ID of related entity (inventory, etc)
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas and Types
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertSpiceSchema = createInsertSchema(spices).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertSpice = z.infer<typeof insertSpiceSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type User = typeof users.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Spice = typeof spices.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Alert = typeof alerts.$inferSelect;

// Extended schemas for frontend validation
export const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

export type LoginCredentials = z.infer<typeof loginSchema>;
