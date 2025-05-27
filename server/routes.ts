import express, { Express } from "express";
import { z } from "zod";
import {
  insertSupplierSchema,
  purchaseWithItemsSchema,
  insertCatererSchema,
  distributionWithItemsSchema,
  insertCatererPaymentSchema
} from "@shared/schema";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import upload from "./upload";
import path from "path";
import { fileURLToPath } from "url";
import vendorPaymentsRouter from "./routes/vendor-payments";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: Express) {
  // Serve static files from the public directory
  app.use('/api/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
  // Setup authentication routes and middleware
  await setupAuth(app);

  // Register vendor payments router
  app.use("/api", isAuthenticated, vendorPaymentsRouter);

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
              description TEXT
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
            description: category.description
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
        description: req.body.description || null
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
              description TEXT
            )
          `);
          console.log("Categories table created successfully");
        }

        const [result] = await conn.execute(`
          INSERT INTO categories (name, description)
          VALUES (?, ?)
        `, [
          categoryData.name,
          categoryData.description
        ]);

        const insertId = (result as any).insertId;
        const [rows] = await conn.execute(`SELECT * FROM categories WHERE id = ?`, [insertId]);
        const dbCategory = (rows as any[])[0];

        // Map database fields to camelCase for the client
        const newCategory = {
          id: dbCategory.id,
          name: dbCategory.name,
          description: dbCategory.description
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
      const reminder = await storage.createPaymentReminder(req.body);
      res.status(201).json(reminder);
    } catch (error) {
      console.error("Create payment reminder error:", error);
      res.status(500).json({ message: "Failed to create payment reminder" });
    }
  });

  app.patch("/api/payment-reminders/:id", isAuthenticated, async (req, res) => {
    try {
      const reminder = await storage.updatePaymentReminder(req.params.id, req.body);
      if (!reminder) {
        return res.status(404).json({ message: "Payment reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
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

      // Get the latest balance data
      const balanceData = {
        balanceDue: caterer.balanceDue || 0,
        totalBilled: caterer.totalBilled || 0,
        totalOrders: caterer.totalOrders || 0,
        totalPaid: caterer.totalPaid || 0,
        lastPaymentDate: undefined // We can add this later if needed
      };

      res.json(balanceData);
    } catch (error) {
      console.error('Error fetching caterer balance:', error);
      res.status(500).json({ error: 'Failed to fetch caterer balance' });
    }
  });

}
