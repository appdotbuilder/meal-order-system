import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, menuItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  name: 'Test User',
  contact_number: '1234567890',
  department: 'IT',
  role: 'regular' as const
};

const testMenuItems = [
  {
    name: 'Pizza',
    price: '25.99',
    description: 'Delicious pizza',
    image_url: null,
    category: 'Food',
    stock_quantity: 10
  },
  {
    name: 'Burger',
    price: '15.50',
    description: 'Tasty burger',
    image_url: null,
    category: 'Food', 
    stock_quantity: 5
  }
];

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an order with items successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test menu items
    const menuItemsResult = await db.insert(menuItemsTable)
      .values(testMenuItems)
      .returning()
      .execute();
    const menuItem1Id = menuItemsResult[0].id;
    const menuItem2Id = menuItemsResult[1].id;

    const testInput: CreateOrderInput = {
      user_id: userId,
      pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
      remarks: 'Test order remarks',
      order_items: [
        { menu_item_id: menuItem1Id, quantity: 2 },
        { menu_item_id: menuItem2Id, quantity: 1 }
      ]
    };

    const result = await createOrder(testInput);

    // Validate order fields
    expect(result.user_id).toBe(userId);
    expect(result.pickup_or_delivery_time).toEqual(new Date('2024-01-15T12:00:00Z'));
    expect(result.remarks).toBe('Test order remarks');
    expect(result.status).toBe('pending');
    expect(result.total_amount).toBe(67.48); // (25.99 * 2) + (15.50 * 1)
    expect(result.id).toBeDefined();
    expect(result.order_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Validate user data
    expect(result.user.id).toBe(userId);
    expect(result.user.name).toBe('Test User');

    // Validate order items
    expect(result.order_items).toHaveLength(2);
    
    const pizzaOrderItem = result.order_items.find(item => item.menu_item_id === menuItem1Id);
    expect(pizzaOrderItem).toBeDefined();
    expect(pizzaOrderItem!.quantity).toBe(2);
    expect(pizzaOrderItem!.price_at_order).toBe(25.99);
    expect(pizzaOrderItem!.menu_item.name).toBe('Pizza');
    expect(pizzaOrderItem!.menu_item.stock_quantity).toBe(8); // 10 - 2

    const burgerOrderItem = result.order_items.find(item => item.menu_item_id === menuItem2Id);
    expect(burgerOrderItem).toBeDefined();
    expect(burgerOrderItem!.quantity).toBe(1);
    expect(burgerOrderItem!.price_at_order).toBe(15.50);
    expect(burgerOrderItem!.menu_item.name).toBe('Burger');
    expect(burgerOrderItem!.menu_item.stock_quantity).toBe(4); // 5 - 1
  });

  it('should save order and items to database correctly', async () => {
    // Create test user and menu items
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const menuItemsResult = await db.insert(menuItemsTable)
      .values([testMenuItems[0]])
      .returning()
      .execute();
    const menuItemId = menuItemsResult[0].id;

    const testInput: CreateOrderInput = {
      user_id: userId,
      pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
      remarks: null,
      order_items: [
        { menu_item_id: menuItemId, quantity: 3 }
      ]
    };

    const result = await createOrder(testInput);

    // Verify order in database
    const ordersInDb = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(ordersInDb).toHaveLength(1);
    expect(ordersInDb[0].user_id).toBe(userId);
    expect(parseFloat(ordersInDb[0].total_amount)).toBe(77.97); // 25.99 * 3
    expect(ordersInDb[0].status).toBe('pending');

    // Verify order items in database
    const orderItemsInDb = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItemsInDb).toHaveLength(1);
    expect(orderItemsInDb[0].menu_item_id).toBe(menuItemId);
    expect(orderItemsInDb[0].quantity).toBe(3);
    expect(parseFloat(orderItemsInDb[0].price_at_order)).toBe(25.99);

    // Verify stock quantity updated
    const menuItemsInDb = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, menuItemId))
      .execute();

    expect(menuItemsInDb[0].stock_quantity).toBe(7); // 10 - 3
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreateOrderInput = {
      user_id: 999, // Non-existent user
      pickup_or_delivery_time: new Date(),
      remarks: null,
      order_items: [
        { menu_item_id: 1, quantity: 1 }
      ]
    };

    await expect(createOrder(testInput)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when menu item does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const testInput: CreateOrderInput = {
      user_id: userId,
      pickup_or_delivery_time: new Date(),
      remarks: null,
      order_items: [
        { menu_item_id: 999, quantity: 1 } // Non-existent menu item
      ]
    };

    await expect(createOrder(testInput)).rejects.toThrow(/menu items not found/i);
  });

  it('should throw error when insufficient stock', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create menu item with limited stock
    const menuItemResult = await db.insert(menuItemsTable)
      .values([{
        ...testMenuItems[0],
        stock_quantity: 2 // Only 2 in stock
      }])
      .returning()
      .execute();
    const menuItemId = menuItemResult[0].id;

    const testInput: CreateOrderInput = {
      user_id: userId,
      pickup_or_delivery_time: new Date(),
      remarks: null,
      order_items: [
        { menu_item_id: menuItemId, quantity: 5 } // Requesting 5, but only 2 available
      ]
    };

    await expect(createOrder(testInput)).rejects.toThrow(/insufficient stock/i);
  });

  it('should handle multiple order items with proper total calculation', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple menu items
    const menuItemsResult = await db.insert(menuItemsTable)
      .values(testMenuItems)
      .returning()
      .execute();

    const testInput: CreateOrderInput = {
      user_id: userId,
      pickup_or_delivery_time: new Date(),
      remarks: 'Large order',
      order_items: [
        { menu_item_id: menuItemsResult[0].id, quantity: 3 }, // 25.99 * 3 = 77.97
        { menu_item_id: menuItemsResult[1].id, quantity: 4 }  // 15.50 * 4 = 62.00
      ]
    };

    const result = await createOrder(testInput);

    expect(result.total_amount).toBe(139.97); // 77.97 + 62.00
    expect(result.order_items).toHaveLength(2);

    // Check stock updates
    const pizzaItem = result.order_items.find(item => item.menu_item.name === 'Pizza');
    const burgerItem = result.order_items.find(item => item.menu_item.name === 'Burger');

    expect(pizzaItem!.menu_item.stock_quantity).toBe(7); // 10 - 3
    expect(burgerItem!.menu_item.stock_quantity).toBe(1); // 5 - 4
  });

  it('should handle order with null remarks', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values([testMenuItems[0]])
      .returning()
      .execute();
    const menuItemId = menuItemResult[0].id;

    const testInput: CreateOrderInput = {
      user_id: userId,
      pickup_or_delivery_time: new Date('2024-01-20T10:00:00Z'),
      remarks: null,
      order_items: [
        { menu_item_id: menuItemId, quantity: 1 }
      ]
    };

    const result = await createOrder(testInput);

    expect(result.remarks).toBeNull();
    expect(result.pickup_or_delivery_time).toEqual(new Date('2024-01-20T10:00:00Z'));
    expect(result.total_amount).toBe(25.99);
  });
});