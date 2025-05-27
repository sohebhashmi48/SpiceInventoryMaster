import { pgTable, text, serial, integer, boolean, numeric, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("user"),
});

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

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull(),
  origin: text("origin"),
  description: text("description"),
  price: numeric("price").default("0"),
  marketPrice: numeric("market_price").default("0"),
  retailPrice: numeric("retail_price").default("0"),
  catererPrice: numeric("caterer_price").default("0"),
  unit: text("unit").default("kg"),
  stocksQty: integer("stocks_qty").default(0),
  isActive: boolean("is_active").notNull().default(true),
  imagePath: text("image_path"),
});

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

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  total: numeric("total").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
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
  receiptImage: text("receipt_image"),
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

// Insert Schemas and Types
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    tags: z.array(z.string()).optional().default([]),
    // Allow both string and number for creditLimit
    creditLimit: z.preprocess(
      // Convert to number if it's a string
      (val) => {
        if (typeof val === 'string') {
          return val === '' ? undefined : parseFloat(val);
        }
        return val;
      },
      z.number().optional()
    ),
  });
// For backward compatibility
export const insertVendorSchema = insertSupplierSchema;

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
// For backward compatibility
export const insertSpiceSchema = insertProductSchema;

export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertVendor = InsertSupplier; // For backward compatibility
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertSpice = InsertProduct; // For backward compatibility
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;

export type User = typeof users.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Vendor = Supplier; // For backward compatibility
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Spice = Product; // For backward compatibility
export type Inventory = typeof inventory.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type PurchaseItem = typeof purchaseItems.$inferSelect;

// Combined schema for purchase with items
// Caterer table schema
export const caterers = pgTable("caterers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  gstNumber: text("gst_number"),
  isActive: boolean("is_active").notNull().default(true),
  creditLimit: numeric("credit_limit").default("0"),
  balanceDue: numeric("balance_due").default("0"),
  totalPaid: numeric("total_paid").default("0"),
  totalBilled: numeric("total_billed").default("0"),
  totalOrders: integer("total_orders").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Distribution table schema (caterer billing)
export const distributions = pgTable("distributions", {
  id: serial("id").primaryKey(),
  billNo: text("bill_no").notNull(),
  catererId: integer("caterer_id").notNull(),
  distributionDate: timestamp("distribution_date").notNull().defaultNow(),
  totalAmount: numeric("total_amount").notNull().default("0"),
  totalGstAmount: numeric("total_gst_amount").notNull().default("0"),
  grandTotal: numeric("grand_total").notNull().default("0"),
  amountPaid: numeric("amount_paid").notNull().default("0"),
  paymentMode: text("payment_mode"),
  paymentDate: timestamp("payment_date"),
  balanceDue: numeric("balance_due").notNull().default("0"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Distribution items table schema
export const distributionItems = pgTable("distribution_items", {
  id: serial("id").primaryKey(),
  distributionId: integer("distribution_id").notNull(),
  productId: integer("product_id").notNull(),
  itemName: text("item_name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull().default("kg"),
  rate: numeric("rate").notNull(),
  gstPercentage: numeric("gst_percentage").notNull().default("0"),
  gstAmount: numeric("gst_amount").notNull().default("0"),
  amount: numeric("amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Caterer payments table schema
export const catererPayments = pgTable("caterer_payments", {
  id: serial("id").primaryKey(),
  catererId: integer("caterer_id").notNull(),
  distributionId: integer("distribution_id"),
  amount: numeric("amount").notNull(),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  paymentMode: text("payment_mode").notNull(),
  referenceNo: text("reference_no"),
  notes: text("notes"),
  receiptImage: text("receipt_image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseWithItemsSchema = insertPurchaseSchema.extend({
  // Allow both string and Date for purchaseDate to support form submissions
  purchaseDate: z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid date format"
    }),
    z.date()
  ]),
  // Add supplierId field
  supplierId: z.number().optional(),
  items: z.array(insertPurchaseItemSchema.omit({ purchaseId: true })),
  // Receipt image
  receiptImage: z.string().nullable().optional(),
  // Payment related fields
  isPaid: z.boolean().optional(),
  paymentAmount: z.union([
    z.string().transform(val => val === '' ? undefined : parseFloat(val)),
    z.number(),
    z.undefined()
  ]).optional(),
  paymentMethod: z.string().optional(),
  paymentDate: z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid date format"
    }),
    z.date(),
    z.undefined()
  ]).optional(),
  paymentNotes: z.string().optional()
});

export type PurchaseWithItems = z.infer<typeof purchaseWithItemsSchema>;

// Insert Schemas for new tables
export const insertCatererSchema = createInsertSchema(caterers)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Allow both string and number for creditLimit to support form submissions
    creditLimit: z.union([
      z.string().transform(val => val === '' ? undefined : parseFloat(val)),
      z.number(),
      z.undefined()
    ]).optional(),
  });
export const insertDistributionSchema = createInsertSchema(distributions)
  .omit({ id: true, createdAt: true });
export const insertDistributionItemSchema = createInsertSchema(distributionItems)
  .omit({ id: true, createdAt: true });
export const insertCatererPaymentSchema = createInsertSchema(catererPayments)
  .omit({ id: true, createdAt: true })
  .extend({
    // Allow both string and number for amount to support form submissions
    amount: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
    // Allow both string and Date for paymentDate to support form submissions
    paymentDate: z.union([
      z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid date format"
      }).transform(val => new Date(val)),
      z.date()
    ]),
    // Allow receipt image to be optional
    receiptImage: z.string().nullable().optional(),
  });

export type InsertCaterer = z.infer<typeof insertCatererSchema>;
export type InsertDistribution = z.infer<typeof insertDistributionSchema>;
export type InsertDistributionItem = z.infer<typeof insertDistributionItemSchema>;
export type InsertCatererPayment = z.infer<typeof insertCatererPaymentSchema>;

export type Caterer = typeof caterers.$inferSelect;
export type Distribution = typeof distributions.$inferSelect;
export type DistributionItem = typeof distributionItems.$inferSelect;
export type CatererPayment = typeof catererPayments.$inferSelect;

// Combined schema for distribution with items
export const distributionWithItemsSchema = insertDistributionSchema.extend({
  // Allow both string and Date for distributionDate to support form submissions
  distributionDate: z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid date format"
    }),
    z.date()
  ]),
  // Receipt image
  receiptImage: z.string().nullable().optional(),
  items: z.array(insertDistributionItemSchema.omit({ distributionId: true }))
});

export type DistributionWithItems = z.infer<typeof distributionWithItemsSchema>;

// Extended schemas for frontend validation
export const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

export type LoginCredentials = z.infer<typeof loginSchema>;
