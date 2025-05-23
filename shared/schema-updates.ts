// This file contains schema updates for the Purchase Entry System
import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Purchase table schema
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  companyAddress: text("company_address").notNull(),
  billNo: text("bill_no").notNull(),
  pageNo: text("page_no").notNull(),
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
  rate: numeric("rate").notNull(),
  gstPercentage: numeric("gst_percentage").notNull().default("0"),
  gstAmount: numeric("gst_amount").notNull().default("0"),
  amount: numeric("amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ 
  id: true, 
  createdAt: true 
});

export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ 
  id: true, 
  createdAt: true 
});

// Combined schema for purchase with items
export const purchaseWithItemsSchema = insertPurchaseSchema.extend({
  items: z.array(insertPurchaseItemSchema.omit({ purchaseId: true }))
});

// Types
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type PurchaseWithItems = z.infer<typeof purchaseWithItemsSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
