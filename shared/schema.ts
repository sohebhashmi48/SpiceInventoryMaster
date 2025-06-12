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
  supplierImage: text("supplier_image"),
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
  imagePath: text("image_path"),
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

// Inventory history table for tracking changes
export const inventoryHistory = pgTable("inventory_history", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").notNull(),
  productId: integer("product_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  changeType: text("change_type").notNull(), // 'created', 'updated', 'deleted', 'quantity_adjusted'
  fieldChanged: text("field_changed"), // which field was changed (for updates)
  oldValue: text("old_value"), // previous value (for updates)
  newValue: text("new_value"), // new value (for updates)
  quantityBefore: numeric("quantity_before"),
  quantityAfter: numeric("quantity_after"),
  reason: text("reason"), // reason for change
  userId: integer("user_id"), // who made the change
  userName: text("user_name"), // name of user who made the change
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
export const insertInventoryHistorySchema = createInsertSchema(inventoryHistory).omit({ id: true, createdAt: true });
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
export type InsertInventoryHistory = z.infer<typeof insertInventoryHistorySchema>;
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
export type InventoryHistory = typeof inventoryHistory.$inferSelect;
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
  pendingAmount: numeric("pending_amount").default("0"),
  totalPaid: numeric("total_paid").default("0"),
  totalBilled: numeric("total_billed").default("0"),
  totalOrders: integer("total_orders").default(0),
  shopCardImage: text("shop_card_image"),
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
  nextPaymentDate: timestamp("next_payment_date"),
  reminderDate: timestamp("reminder_date"),
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

// Customer bills table schema
export const customerBills = pgTable("customer_bills", {
  id: serial("id").primaryKey(),
  billNo: text("bill_no").notNull().unique(),
  billDate: timestamp("bill_date").notNull().defaultNow(),
  clientName: text("client_name").notNull(),
  clientMobile: text("client_mobile").notNull(),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  totalAmount: numeric("total_amount").notNull().default("0"),
  marketTotal: numeric("market_total").notNull().default("0"),
  savings: numeric("savings").notNull().default("0"),
  itemCount: integer("item_count").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("Cash"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Customer bill items table schema
export const customerBillItems = pgTable("customer_bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  pricePerKg: numeric("price_per_kg").notNull(),
  marketPricePerKg: numeric("market_price_per_kg").notNull(),
  total: numeric("total").notNull(),
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
  items: z.array(insertPurchaseItemSchema.omit({ purchaseId: true }).extend({
    // Allow rate to be string or number for form handling, but require valid number for submission
    rate: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]).refine(val => !isNaN(val) && val >= 0, {
      message: "Rate must be a valid number"
    }),
    // Allow quantity to be string or number for form handling
    quantity: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]).refine(val => !isNaN(val) && val > 0, {
      message: "Quantity must be greater than 0"
    }),
    // Allow amount to be string or number for form handling
    amount: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
    // Allow gstAmount to be string or number for form handling
    gstAmount: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
    // Allow gstPercentage to be string or number for form handling
    gstPercentage: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ])
  })),
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

// Form-friendly schema for purchase items that allows empty fields during data entry
export const purchaseItemFormSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.union([
    z.string(),
    z.number()
  ]).optional(),
  unit: z.string().default("kg"),
  rate: z.union([
    z.string(),
    z.number()
  ]).optional(),
  gstPercentage: z.union([
    z.string(),
    z.number()
  ]).optional(),
  gstAmount: z.union([
    z.string(),
    z.number()
  ]).optional(),
  amount: z.union([
    z.string(),
    z.number()
  ]).optional(),
});

// Form-friendly schema for purchase with items that allows empty fields during data entry
export const purchaseWithItemsFormSchema = insertPurchaseSchema.extend({
  purchaseDate: z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid date format"
    }),
    z.date()
  ]),
  supplierId: z.number().optional(),
  items: z.array(purchaseItemFormSchema),
  receiptImage: z.string().nullable().optional(),
  isPaid: z.boolean().optional(),
  paymentAmount: z.union([
    z.string(),
    z.number(),
    z.undefined()
  ]).optional(),
  paymentMethod: z.string().optional(),
  paymentDate: z.union([
    z.string(),
    z.date(),
    z.undefined()
  ]).optional(),
  paymentNotes: z.string().optional()
});

export type PurchaseWithItemsForm = z.infer<typeof purchaseWithItemsFormSchema>;

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
      z.string().refine(val => val !== '' && !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be a positive number"
      }).transform(val => parseFloat(val)),
      z.number().min(0.01, "Amount must be greater than 0")
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

export const insertCustomerBillSchema = createInsertSchema(customerBills)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Allow both string and number for numeric fields to support form submissions
    totalAmount: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
    marketTotal: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
    savings: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
    // Allow both string and Date for billDate to support form submissions
    billDate: z.union([
      z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid date format"
      }).transform(val => new Date(val)),
      z.date()
    ]),
  });

export const insertCustomerBillItemSchema = createInsertSchema(customerBillItems)
  .omit({ id: true, createdAt: true })
  .extend({
    // Allow both string and number for numeric fields to support form submissions
    quantity: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
    pricePerKg: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
    marketPricePerKg: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
    total: z.union([
      z.string().transform(val => val === '' ? 0 : parseFloat(val)),
      z.number()
    ]),
  });

export type InsertCaterer = z.infer<typeof insertCatererSchema>;
export type InsertDistribution = z.infer<typeof insertDistributionSchema>;
export type InsertDistributionItem = z.infer<typeof insertDistributionItemSchema>;
export type InsertCatererPayment = z.infer<typeof insertCatererPaymentSchema>;
export type InsertCustomerBill = z.infer<typeof insertCustomerBillSchema>;
export type InsertCustomerBillItem = z.infer<typeof insertCustomerBillItemSchema>;

export type Caterer = typeof caterers.$inferSelect;
export type Distribution = typeof distributions.$inferSelect;
export type DistributionItem = typeof distributionItems.$inferSelect;
export type CatererPayment = typeof catererPayments.$inferSelect;
export type CustomerBill = typeof customerBills.$inferSelect;
export type CustomerBillItem = typeof customerBillItems.$inferSelect;

// Combined schema for distribution with items
export const distributionWithItemsSchema = insertDistributionSchema.extend({
  // Allow both string and Date for distributionDate to support form submissions
  distributionDate: z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid date format"
    }),
    z.date()
  ]),
  // Allow both string and Date for nextPaymentDate to support form submissions
  nextPaymentDate: z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid date format"
    }),
    z.date(),
    z.null(),
    z.undefined()
  ]).optional(),
  // Allow both string and Date for reminderDate to support form submissions
  reminderDate: z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid date format"
    }),
    z.date(),
    z.null(),
    z.undefined()
  ]).optional(),
  // Receipt image
  receiptImage: z.string().nullable().optional(),
  items: z.array(insertDistributionItemSchema.omit({ distributionId: true }))
});

export type DistributionWithItems = z.infer<typeof distributionWithItemsSchema>;

// Combined schema for customer bill with items
export const customerBillWithItemsSchema = insertCustomerBillSchema.extend({
  items: z.array(insertCustomerBillItemSchema.omit({ billId: true }))
});

export type CustomerBillWithItems = z.infer<typeof customerBillWithItemsSchema>;

// Extended schemas for frontend validation
export const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Expenses table schema
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  icon: text("icon").notNull(),
  title: text("title").notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  receiptImage: text("receipt_image"),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Allow both string and Date for expenseDate to support form submissions
    expenseDate: z.union([
      z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid date format"
      }).transform(val => new Date(val)),
      z.date()
    ]),
    // Allow both string and Date for expiryDate to support form submissions
    expiryDate: z.union([
      z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid date format"
      }).transform(val => new Date(val)),
      z.date(),
      z.null(),
      z.undefined()
    ]).optional(),
    // Allow both string and number for amount to support form submissions
    amount: z.union([
      z.string().transform(val => val === '' ? 0 : parseInt(val)),
      z.number()
    ]),
    // Allow receipt image to be optional
    receiptImage: z.string().nullable().optional(),
  });

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Assets table schema
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  assetImage: text("asset_image"), // Main asset image
  title: text("title").notNull(),
  description: text("description"),
  purchaseDate: timestamp("purchase_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  receiptImage: text("receipt_image"),
  amount: integer("amount").notNull(),
  currentValue: integer("current_value"),
  depreciationRate: integer("depreciation_rate"), // percentage per year
  category: text("category"), // e.g., "Equipment", "Furniture", "Technology"
  location: text("location"),
  serialNumber: text("serial_number"),
  warrantyExpiry: timestamp("warranty_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assets)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Allow both string and Date for purchaseDate to support form submissions
    purchaseDate: z.union([
      z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid purchase date format"
      }),
      z.date()
    ]).transform(val => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    // Allow both string and Date for expiryDate to support form submissions
    expiryDate: z.union([
      z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid expiry date format"
      }),
      z.date(),
      z.null(),
      z.undefined()
    ]).transform(val => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }).optional(),
    // Allow both string and Date for warrantyExpiry to support form submissions
    warrantyExpiry: z.union([
      z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid warranty expiry date format"
      }),
      z.date(),
      z.null(),
      z.undefined()
    ]).transform(val => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }).optional(),
    // Allow asset image to be optional
    assetImage: z.string().nullable().optional(),
    // Allow receipt image to be optional
    receiptImage: z.string().nullable().optional(),
    // Allow current value to be optional
    currentValue: z.number().nullable().optional(),
    // Allow depreciation rate to be optional
    depreciationRate: z.number().nullable().optional(),
  });

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;
