import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, menuItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type GetOrdersByStatusInput } from '../schema';
import { getAllOrders } from '../handlers/get_all_orders';

describe('getAllOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  const setupTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        contact_number: '1234567890',
        department: 'Engineering',
        role: 'regular'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test menu items
    const menuItemResults = await db.insert(menuItemsTable)
      .values([
        {
          name: 'Burger',
          price: '12.99',
          description: 'Delicious burger',
          category: 'Main',
          stock_quantity: 50
        },
        {
          name: 'Fries',
          price: '5.99',
          description: 'Crispy fries',
          category: 'Side',
          stock_quantity: 100
        }
      ])
      .returning()
      .execute();

    const menuItemIds = menuItemResults.map(item => item.id);

    // Create test orders with different statuses and explicit timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const orderResults = await db.insert(ordersTable)
      .values([
        {
          user_id: userId,
          status: 'pending',
          pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
          remarks: 'First order',
          total_amount: '18.98'
        },
        {
          user_id: userId,
          status: 'confirmed',
          pickup_or_delivery_time: new Date('2024-01-16T13:00:00Z'),
          remarks: 'Second order',
          total_amount: '12.99'
        },
        {
          user_id: userId,
          status: 'delivered',
          pickup_or_delivery_time: new Date('2024-01-17T14:00:00Z'),
          remarks: null,
          total_amount: '5.99'
        }
      ])
      .returning()
      .execute();

    const orderIds = orderResults.map(order => order.id);

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        // First order: burger + fries
        {
          order_id: orderIds[0],
          menu_item_id: menuItemIds[0],
          quantity: 1,
          price_at_order: '12.99'
        },
        {
          order_id: orderIds[0],
          menu_item_id: menuItemIds[1],
          quantity: 1,
          price_at_order: '5.99'
        },
        // Second order: just burger
        {
          order_id: orderIds[1],
          menu_item_id: menuItemIds[0],
          quantity: 1,
          price_at_order: '12.99'
        },
        // Third order: just fries
        {
          order_id: orderIds[2],
          menu_item_id: menuItemIds[1],
          quantity: 1,
          price_at_order: '5.99'
        }
      ])
      .execute();

    return { userId, menuItemIds, orderIds };
  };

  it('should return all orders without status filter', async () => {
    await setupTestData();

    const result = await getAllOrders();

    expect(result).toHaveLength(3);
    
    // Verify all expected statuses are present
    const statuses = result.map(order => order.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('confirmed');
    expect(statuses).toContain('delivered');

    // Verify each order has complete structure
    result.forEach(order => {
      expect(order.id).toBeDefined();
      expect(order.user_id).toBeDefined();
      expect(order.order_date).toBeInstanceOf(Date);
      expect(order.pickup_or_delivery_time).toBeInstanceOf(Date);
      expect(order.created_at).toBeInstanceOf(Date);
      expect(order.updated_at).toBeInstanceOf(Date);
      
      // Verify numeric fields are converted to numbers
      expect(typeof order.total_amount).toBe('number');
      expect(order.total_amount).toBeGreaterThan(0);

      // Verify user data is included
      expect(order.user).toBeDefined();
      expect(order.user.name).toBe('Test User');
      expect(order.user.contact_number).toBe('1234567890');
      expect(order.user.department).toBe('Engineering');
      expect(order.user.role).toBe('regular');

      // Verify order items are included
      expect(Array.isArray(order.order_items)).toBe(true);
      expect(order.order_items.length).toBeGreaterThan(0);
      
      order.order_items.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.quantity).toBeGreaterThan(0);
        expect(typeof item.price_at_order).toBe('number');
        
        // Verify menu item data is included
        expect(item.menu_item).toBeDefined();
        expect(item.menu_item.name).toBeDefined();
        expect(typeof item.menu_item.price).toBe('number');
        expect(item.menu_item.category).toBeDefined();
      });
    });
  });

  it('should filter orders by status when provided', async () => {
    await setupTestData();

    const input: GetOrdersByStatusInput = { status: 'pending' };
    const result = await getAllOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
    expect(result[0].remarks).toBe('First order');
    expect(result[0].total_amount).toBe(18.98);
    expect(result[0].order_items).toHaveLength(2); // burger + fries
  });

  it('should filter orders by confirmed status', async () => {
    await setupTestData();

    const input: GetOrdersByStatusInput = { status: 'confirmed' };
    const result = await getAllOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('confirmed');
    expect(result[0].remarks).toBe('Second order');
    expect(result[0].total_amount).toBe(12.99);
    expect(result[0].order_items).toHaveLength(1); // just burger
  });

  it('should return empty array when no orders match status filter', async () => {
    await setupTestData();

    const input: GetOrdersByStatusInput = { status: 'cancelled' };
    const result = await getAllOrders(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no orders exist', async () => {
    const result = await getAllOrders();
    expect(result).toHaveLength(0);
  });

  it('should handle orders with null remarks', async () => {
    await setupTestData();

    const input: GetOrdersByStatusInput = { status: 'delivered' };
    const result = await getAllOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('delivered');
    expect(result[0].remarks).toBe(null);
    expect(result[0].total_amount).toBe(5.99);
  });

  it('should handle multiple order items per order correctly', async () => {
    await setupTestData();

    const input: GetOrdersByStatusInput = { status: 'pending' };
    const result = await getAllOrders(input);

    expect(result).toHaveLength(1);
    const order = result[0];
    expect(order.order_items).toHaveLength(2);
    
    // Verify items are correctly associated
    const burgerItem = order.order_items.find(item => item.menu_item.name === 'Burger');
    const friesItem = order.order_items.find(item => item.menu_item.name === 'Fries');
    
    expect(burgerItem).toBeDefined();
    expect(friesItem).toBeDefined();
    expect(burgerItem!.price_at_order).toBe(12.99);
    expect(friesItem!.price_at_order).toBe(5.99);
    expect(burgerItem!.quantity).toBe(1);
    expect(friesItem!.quantity).toBe(1);
  });

  it('should handle undefined input gracefully', async () => {
    await setupTestData();

    const result = await getAllOrders(undefined);

    expect(result).toHaveLength(3);
    // Should return all orders when no filter is applied
    const statuses = result.map(order => order.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('confirmed');
    expect(statuses).toContain('delivered');
  });
});