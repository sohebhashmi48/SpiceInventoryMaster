import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { 
  customerBills, 
  customerBillItems,
  insertCustomerBillSchema,
  customerBillWithItemsSchema,
  type CustomerBill,
  type CustomerBillItem,
  type CustomerBillWithItems
} from '../../shared/schema';
import { eq, desc, and, gte, lte, ilike, sql } from 'drizzle-orm';

const app = new Hono();

// Get all customer bills with pagination and filtering
app.get('/', zValidator('query', z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})), async (c) => {
  try {
    const { page, limit, search, status, startDate, endDate } = c.req.valid('query');
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        sql`(${customerBills.clientName} ILIKE ${`%${search}%`} OR 
            ${customerBills.clientMobile} ILIKE ${`%${search}%`} OR 
            ${customerBills.billNo} ILIKE ${`%${search}%`})`
      );
    }
    
    if (status) {
      conditions.push(eq(customerBills.status, status));
    }
    
    if (startDate) {
      conditions.push(gte(customerBills.billDate, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(customerBills.billDate, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customerBills)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;

    // Get bills with pagination
    const bills = await db
      .select()
      .from(customerBills)
      .where(whereClause)
      .orderBy(desc(customerBills.createdAt))
      .limit(limitNum)
      .offset(offset);

    return c.json({
      data: bills,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching customer bills:', error);
    return c.json({ error: 'Failed to fetch customer bills' }, 500);
  }
});

// Get a specific customer bill by ID with items
app.get('/:id', zValidator('param', z.object({
  id: z.string().transform(val => parseInt(val)),
})), async (c) => {
  try {
    const { id } = c.req.valid('param');

    // Get the bill
    const bill = await db
      .select()
      .from(customerBills)
      .where(eq(customerBills.id, id))
      .limit(1);

    if (bill.length === 0) {
      return c.json({ error: 'Customer bill not found' }, 404);
    }

    // Get the bill items
    const items = await db
      .select()
      .from(customerBillItems)
      .where(eq(customerBillItems.billId, id))
      .orderBy(customerBillItems.id);

    const billWithItems = {
      ...bill[0],
      items,
    };

    return c.json(billWithItems);
  } catch (error) {
    console.error('Error fetching customer bill:', error);
    return c.json({ error: 'Failed to fetch customer bill' }, 500);
  }
});

// Create a new customer bill
app.post('/', zValidator('json', customerBillWithItemsSchema), async (c) => {
  try {
    const data = c.req.valid('json');

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Insert the bill
      const [newBill] = await tx
        .insert(customerBills)
        .values({
          billNo: data.billNo,
          billDate: data.billDate,
          clientName: data.clientName,
          clientMobile: data.clientMobile,
          clientEmail: data.clientEmail,
          clientAddress: data.clientAddress,
          totalAmount: data.totalAmount.toString(),
          marketTotal: data.marketTotal.toString(),
          savings: data.savings.toString(),
          itemCount: data.itemCount,
          status: data.status,
        })
        .returning();

      // Insert the bill items
      if (data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map(item => ({
          billId: newBill.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity.toString(),
          unit: item.unit,
          pricePerKg: item.pricePerKg.toString(),
          marketPricePerKg: item.marketPricePerKg.toString(),
          total: item.total.toString(),
        }));

        await tx.insert(customerBillItems).values(itemsToInsert);
      }

      return newBill;
    });

    return c.json(result, 201);
  } catch (error) {
    console.error('Error creating customer bill:', error);
    return c.json({ error: 'Failed to create customer bill' }, 500);
  }
});

// Update a customer bill
app.put('/:id', zValidator('param', z.object({
  id: z.string().transform(val => parseInt(val)),
})), zValidator('json', customerBillWithItemsSchema.partial()), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');

    // Check if bill exists
    const existingBill = await db
      .select()
      .from(customerBills)
      .where(eq(customerBills.id, id))
      .limit(1);

    if (existingBill.length === 0) {
      return c.json({ error: 'Customer bill not found' }, 404);
    }

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Update the bill
      const updateData: any = {};
      if (data.billNo !== undefined) updateData.billNo = data.billNo;
      if (data.billDate !== undefined) updateData.billDate = data.billDate;
      if (data.clientName !== undefined) updateData.clientName = data.clientName;
      if (data.clientMobile !== undefined) updateData.clientMobile = data.clientMobile;
      if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
      if (data.clientAddress !== undefined) updateData.clientAddress = data.clientAddress;
      if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount.toString();
      if (data.marketTotal !== undefined) updateData.marketTotal = data.marketTotal.toString();
      if (data.savings !== undefined) updateData.savings = data.savings.toString();
      if (data.itemCount !== undefined) updateData.itemCount = data.itemCount;
      if (data.status !== undefined) updateData.status = data.status;

      const [updatedBill] = await tx
        .update(customerBills)
        .set(updateData)
        .where(eq(customerBills.id, id))
        .returning();

      // If items are provided, replace all items
      if (data.items !== undefined) {
        // Delete existing items
        await tx.delete(customerBillItems).where(eq(customerBillItems.billId, id));

        // Insert new items
        if (data.items.length > 0) {
          const itemsToInsert = data.items.map(item => ({
            billId: id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity.toString(),
            unit: item.unit,
            pricePerKg: item.pricePerKg.toString(),
            marketPricePerKg: item.marketPricePerKg.toString(),
            total: item.total.toString(),
          }));

          await tx.insert(customerBillItems).values(itemsToInsert);
        }
      }

      return updatedBill;
    });

    return c.json(result);
  } catch (error) {
    console.error('Error updating customer bill:', error);
    return c.json({ error: 'Failed to update customer bill' }, 500);
  }
});

// Delete a customer bill
app.delete('/:id', zValidator('param', z.object({
  id: z.string().transform(val => parseInt(val)),
})), async (c) => {
  try {
    const { id } = c.req.valid('param');

    // Check if bill exists
    const existingBill = await db
      .select()
      .from(customerBills)
      .where(eq(customerBills.id, id))
      .limit(1);

    if (existingBill.length === 0) {
      return c.json({ error: 'Customer bill not found' }, 404);
    }

    // Delete the bill (items will be deleted automatically due to CASCADE)
    await db.delete(customerBills).where(eq(customerBills.id, id));

    return c.json({ message: 'Customer bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer bill:', error);
    return c.json({ error: 'Failed to delete customer bill' }, 500);
  }
});

export default app;
