import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { setupAuth } from "./auth";
import { 
  insertVendorSchema,
  insertCategorySchema,
  insertSpiceSchema,
  insertInventorySchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertTransactionSchema
} from "@shared/schema";

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Middleware to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Vendors API
  app.get("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const vendor = await storage.getVendor(parseInt(req.params.id));
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(validatedData);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vendor data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const vendor = await storage.updateVendor(parseInt(req.params.id), req.body);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteVendor(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // Categories API
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      if (!category) {
        return res.status(500).json({ message: "Failed to create category" });
      }
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error('Category creation error:', error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Spices API
  app.get("/api/spices", isAuthenticated, async (req, res) => {
    try {
      const spices = await storage.getSpices();
      res.json(spices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spices" });
    }
  });

  app.get("/api/spices/:id", isAuthenticated, async (req, res) => {
    try {
      const spice = await storage.getSpice(parseInt(req.params.id));
      if (!spice) {
        return res.status(404).json({ message: "Spice not found" });
      }
      res.json(spice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spice" });
    }
  });

  app.post("/api/spices", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSpiceSchema.parse(req.body);
      const spice = await storage.createSpice(validatedData);
      res.status(201).json(spice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid spice data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create spice" });
    }
  });

  app.patch("/api/spices/:id", isAuthenticated, async (req, res) => {
    try {
      const spice = await storage.updateSpice(parseInt(req.params.id), req.body);
      if (!spice) {
        return res.status(404).json({ message: "Spice not found" });
      }
      res.json(spice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update spice" });
    }
  });

  // Inventory API
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const inventory = await storage.getInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
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

  app.post("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.updateInventoryItem(parseInt(req.params.id), req.body);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteInventoryItem(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Low stock and expiring items
  app.get("/api/inventory/alerts/low-stock", isAuthenticated, async (req, res) => {
    try {
      const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 5;
      const items = await storage.getLowStockItems(threshold);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  app.get("/api/inventory/alerts/expiring", isAuthenticated, async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const items = await storage.getExpiringItems(days);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expiring items" });
    }
  });

  // Invoices API
  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Get items for this invoice
      const items = await storage.getInvoiceItems(invoice.id);
      
      res.json({ ...invoice, items });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const { items, ...invoiceData } = req.body;
      const validatedInvoice = insertInvoiceSchema.parse(invoiceData);
      
      // Create invoice
      const invoice = await storage.createInvoice(validatedInvoice);
      
      // Create invoice items
      const createdItems = [];
      for (const item of items || []) {
        const validatedItem = insertInvoiceItemSchema.parse({
          ...item,
          invoiceId: invoice.id
        });
        const createdItem = await storage.createInvoiceItem(validatedItem);
        createdItems.push(createdItem);
      }
      
      res.status(201).json({ ...invoice, items: createdItems });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const invoice = await storage.updateInvoiceStatus(parseInt(req.params.id), status);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update invoice status" });
    }
  });

  // Transactions API
  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.get("/api/vendors/:id/transactions", isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByVendor(parseInt(req.params.id));
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor transactions" });
    }
  });

  // Alerts API
  app.get("/api/alerts", isAuthenticated, async (req, res) => {
    try {
      let alerts = await storage.getAlerts();
      
      // Filter by status if provided
      if (req.query.status) {
        alerts = alerts.filter(alert => alert.status === req.query.status);
      }
      
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.patch("/api/alerts/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const alert = await storage.updateAlertStatus(parseInt(req.params.id), status);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to update alert status" });
    }
  });

  // Dashboard API - stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const inventory = await storage.getInventory();
      const spices = await storage.getSpices();
      const invoices = await storage.getInvoices();
      const lowStockItems = await storage.getLowStockItems(5);
      
      // Calculate total inventory value
      const totalValue = inventory.reduce((sum, item) => sum + Number(item.totalValue), 0);
      
      // Count active spice types
      const activeSpices = spices.filter(spice => spice.isActive).length;
      
      // Count pending orders/invoices
      const pendingInvoices = invoices.filter(invoice => invoice.status === "pending").length;
      
      // Count low stock alerts
      const lowStockAlerts = lowStockItems.length;
      
      res.json({
        totalValue,
        activeSpices,
        pendingInvoices,
        lowStockAlerts
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
