import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, menuItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { getMenuItemReports } from '../handlers/get_menu_item_reports';

describe('getMenuItemReports', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no orders exist', async () => {
    const result = await getMenuItemReports();
    expect(result).toEqual([]);
  });

  it('should generate menu item reports with aggregated data', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        contact_number: '1234567890',
        department: 'Engineering',
        role: 'regular'
      })
      .returning()
      .execute();

    // Create test menu items
    const [menuItem1] = await db.insert(menuItemsTable)
      .values({
        name: 'Pizza',
        price: '15.99',
        description: 'Delicious pizza',
        category: 'Main Course',
        stock_quantity: 50
      })
      .returning()
      .execute();

    const [menuItem2] = await db.insert(menuItemsTable)
      .values({
        name: 'Burger',
        price: '12.50',
        description: 'Tasty burger',
        category: 'Main Course',
        stock_quantity: 30
      })
      .returning()
      .execute();

    // Create test orders
    const [order1] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        pickup_or_delivery_time: new Date(),
        status: 'confirmed',
        total_amount: '43.48',
        remarks: null
      })
      .returning()
      .execute();

    const [order2] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        pickup_or_delivery_time: new Date(),
        status: 'delivered',
        total_amount: '28.49',
        remarks: null
      })
      .returning()
      .execute();

    // Create order items for different scenarios
    // Order 1: 2 pizzas + 1 burger
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order1.id,
          menu_item_id: menuItem1.id,
          quantity: 2,
          price_at_order: '15.99'
        },
        {
          order_id: order1.id,
          menu_item_id: menuItem2.id,
          quantity: 1,
          price_at_order: '12.50'
        }
      ])
      .execute();

    // Order 2: 1 pizza
    await db.insert(orderItemsTable)
      .values({
        order_id: order2.id,
        menu_item_id: menuItem1.id,
        quantity: 1,
        price_at_order: '15.99'
      })
      .execute();

    const result = await getMenuItemReports();

    expect(result).toHaveLength(2);

    // Results should be ordered by total_amount descending
    // Pizza: 2 orders, 3 total quantity, 47.97 total amount (2*15.99 + 1*15.99)
    const pizzaReport = result.find(r => r.menu_item_name === 'Pizza');
    expect(pizzaReport).toBeDefined();
    expect(pizzaReport!.menu_item_id).toEqual(menuItem1.id);
    expect(pizzaReport!.total_orders).toEqual(2);
    expect(pizzaReport!.total_quantity).toEqual(3);
    expect(pizzaReport!.total_amount).toEqual(47.97);

    // Burger: 1 order, 1 total quantity, 12.50 total amount
    const burgerReport = result.find(r => r.menu_item_name === 'Burger');
    expect(burgerReport).toBeDefined();
    expect(burgerReport!.menu_item_id).toEqual(menuItem2.id);
    expect(burgerReport!.total_orders).toEqual(1);
    expect(burgerReport!.total_quantity).toEqual(1);
    expect(burgerReport!.total_amount).toEqual(12.50);

    // Verify ordering (Pizza should come first due to higher total_amount)
    expect(result[0].menu_item_name).toEqual('Pizza');
    expect(result[1].menu_item_name).toEqual('Burger');
  });

  it('should handle menu items with different prices at order time', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        contact_number: '1234567890',
        department: 'Sales',
        role: 'regular'
      })
      .returning()
      .execute();

    // Create menu item
    const [menuItem] = await db.insert(menuItemsTable)
      .values({
        name: 'Special Dish',
        price: '20.00',
        description: 'Special dish with varying prices',
        category: 'Special',
        stock_quantity: 10
      })
      .returning()
      .execute();

    // Create orders with different pricing
    const [order1] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        pickup_or_delivery_time: new Date(),
        status: 'confirmed',
        total_amount: '18.00',
        remarks: null
      })
      .returning()
      .execute();

    const [order2] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        pickup_or_delivery_time: new Date(),
        status: 'delivered',
        total_amount: '44.00',
        remarks: null
      })
      .returning()
      .execute();

    // Same menu item at different prices (historical pricing)
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order1.id,
          menu_item_id: menuItem.id,
          quantity: 1,
          price_at_order: '18.00' // Old price
        },
        {
          order_id: order2.id,
          menu_item_id: menuItem.id,
          quantity: 2,
          price_at_order: '22.00' // New price
        }
      ])
      .execute();

    const result = await getMenuItemReports();

    expect(result).toHaveLength(1);
    expect(result[0].menu_item_id).toEqual(menuItem.id);
    expect(result[0].menu_item_name).toEqual('Special Dish');
    expect(result[0].total_orders).toEqual(2);
    expect(result[0].total_quantity).toEqual(3);
    // Total: 1*18.00 + 2*22.00 = 62.00
    expect(result[0].total_amount).toEqual(62.00);
  });

  it('should only include menu items that have been ordered', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        contact_number: '1234567890',
        department: 'HR',
        role: 'regular'
      })
      .returning()
      .execute();

    // Create multiple menu items
    const menuItems = await db.insert(menuItemsTable)
      .values([
        {
          name: 'Ordered Item',
          price: '10.00',
          description: 'This will be ordered',
          category: 'Food',
          stock_quantity: 20
        },
        {
          name: 'Never Ordered',
          price: '15.00',
          description: 'This will never be ordered',
          category: 'Food',
          stock_quantity: 25
        }
      ])
      .returning()
      .execute();

    // Create order for only one menu item
    const [order] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        pickup_or_delivery_time: new Date(),
        status: 'confirmed',
        total_amount: '20.00',
        remarks: null
      })
      .returning()
      .execute();

    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        menu_item_id: menuItems[0].id,
        quantity: 2,
        price_at_order: '10.00'
      })
      .execute();

    const result = await getMenuItemReports();

    // Should only return the ordered item
    expect(result).toHaveLength(1);
    expect(result[0].menu_item_name).toEqual('Ordered Item');
    expect(result[0].total_orders).toEqual(1);
    expect(result[0].total_quantity).toEqual(2);
    expect(result[0].total_amount).toEqual(20.00);
  });

  it('should return correct data types for all fields', async () => {
    // Create minimal test data
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        contact_number: '1234567890',
        department: 'IT',
        role: 'regular'
      })
      .returning()
      .execute();

    const [menuItem] = await db.insert(menuItemsTable)
      .values({
        name: 'Test Item',
        price: '25.75',
        description: 'Test item',
        category: 'Test',
        stock_quantity: 15
      })
      .returning()
      .execute();

    const [order] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        pickup_or_delivery_time: new Date(),
        status: 'confirmed',
        total_amount: '51.50',
        remarks: null
      })
      .returning()
      .execute();

    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        menu_item_id: menuItem.id,
        quantity: 2,
        price_at_order: '25.75'
      })
      .execute();

    const result = await getMenuItemReports();

    expect(result).toHaveLength(1);
    const report = result[0];
    
    // Verify data types
    expect(typeof report.menu_item_id).toBe('number');
    expect(typeof report.menu_item_name).toBe('string');
    expect(typeof report.total_orders).toBe('number');
    expect(typeof report.total_quantity).toBe('number');
    expect(typeof report.total_amount).toBe('number');
    
    // Verify values
    expect(report.menu_item_id).toEqual(menuItem.id);
    expect(report.menu_item_name).toEqual('Test Item');
    expect(report.total_orders).toEqual(1);
    expect(report.total_quantity).toEqual(2);
    expect(report.total_amount).toEqual(51.50);
  });
});