import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, menuItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type GetUserOrdersInput } from '../schema';
import { getUserOrders } from '../handlers/get_user_orders';

// Test data
const testUser = {
  name: 'John Doe',
  contact_number: '+1234567890',
  department: 'Engineering',
  role: 'regular' as const
};

const testMenuItem1 = {
  name: 'Burger',
  price: 15.99,
  description: 'Delicious burger',
  image_url: 'https://example.com/burger.jpg',
  category: 'Main Course',
  stock_quantity: 50
};

const testMenuItem2 = {
  name: 'Fries',
  price: 5.99,
  description: 'Crispy fries',
  image_url: null,
  category: 'Sides',
  stock_quantity: 100
};

describe('getUserOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no orders', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: GetUserOrdersInput = { user_id: userId };
    const result = await getUserOrders(input);

    expect(result).toEqual([]);
  });

  it('should return orders with all related data for user', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create menu items
    const menuItemResult1 = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem1,
        price: testMenuItem1.price.toString()
      })
      .returning()
      .execute();
    const menuItem1Id = menuItemResult1[0].id;

    const menuItemResult2 = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem2,
        price: testMenuItem2.price.toString()
      })
      .returning()
      .execute();
    const menuItem2Id = menuItemResult2[0].id;

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userId,
        pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
        remarks: 'Test order',
        total_amount: '21.98' // 15.99 + 5.99
      })
      .returning()
      .execute();
    const orderId = orderResult[0].id;

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: orderId,
          menu_item_id: menuItem1Id,
          quantity: 1,
          price_at_order: testMenuItem1.price.toString()
        },
        {
          order_id: orderId,
          menu_item_id: menuItem2Id,
          quantity: 1,
          price_at_order: testMenuItem2.price.toString()
        }
      ])
      .execute();

    const input: GetUserOrdersInput = { user_id: userId };
    const result = await getUserOrders(input);

    expect(result).toHaveLength(1);
    
    const order = result[0];
    expect(order.id).toBe(orderId);
    expect(order.user_id).toBe(userId);
    expect(order.status).toBe('pending');
    expect(order.pickup_or_delivery_time).toEqual(new Date('2024-01-15T12:00:00Z'));
    expect(order.remarks).toBe('Test order');
    expect(typeof order.total_amount).toBe('number');
    expect(order.total_amount).toBe(21.98);

    // Verify user data
    expect(order.user.id).toBe(userId);
    expect(order.user.name).toBe(testUser.name);
    expect(order.user.contact_number).toBe(testUser.contact_number);
    expect(order.user.department).toBe(testUser.department);
    expect(order.user.role).toBe(testUser.role);

    // Verify order items
    expect(order.order_items).toHaveLength(2);
    
    const burgerItem = order.order_items.find(item => item.menu_item.name === 'Burger');
    expect(burgerItem).toBeDefined();
    expect(burgerItem!.quantity).toBe(1);
    expect(typeof burgerItem!.price_at_order).toBe('number');
    expect(burgerItem!.price_at_order).toBe(15.99);
    expect(burgerItem!.menu_item.name).toBe('Burger');
    expect(typeof burgerItem!.menu_item.price).toBe('number');
    expect(burgerItem!.menu_item.price).toBe(15.99);
    expect(burgerItem!.menu_item.category).toBe('Main Course');

    const friesItem = order.order_items.find(item => item.menu_item.name === 'Fries');
    expect(friesItem).toBeDefined();
    expect(friesItem!.quantity).toBe(1);
    expect(typeof friesItem!.price_at_order).toBe('number');
    expect(friesItem!.price_at_order).toBe(5.99);
    expect(friesItem!.menu_item.name).toBe('Fries');
    expect(typeof friesItem!.menu_item.price).toBe('number');
    expect(friesItem!.menu_item.price).toBe(5.99);
    expect(friesItem!.menu_item.category).toBe('Sides');
  });

  it('should return multiple orders sorted by date (newest first)', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem1,
        price: testMenuItem1.price.toString()
      })
      .returning()
      .execute();
    const menuItemId = menuItemResult[0].id;

    // Create two orders with different dates
    const olderOrder = await db.insert(ordersTable)
      .values({
        user_id: userId,
        order_date: new Date('2024-01-10T10:00:00Z'),
        pickup_or_delivery_time: new Date('2024-01-10T12:00:00Z'),
        remarks: 'Older order',
        total_amount: testMenuItem1.price.toString()
      })
      .returning()
      .execute();

    const newerOrder = await db.insert(ordersTable)
      .values({
        user_id: userId,
        order_date: new Date('2024-01-15T10:00:00Z'),
        pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
        remarks: 'Newer order',
        total_amount: testMenuItem1.price.toString()
      })
      .returning()
      .execute();

    // Create order items for both orders
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: olderOrder[0].id,
          menu_item_id: menuItemId,
          quantity: 1,
          price_at_order: testMenuItem1.price.toString()
        },
        {
          order_id: newerOrder[0].id,
          menu_item_id: menuItemId,
          quantity: 2,
          price_at_order: testMenuItem1.price.toString()
        }
      ])
      .execute();

    const input: GetUserOrdersInput = { user_id: userId };
    const result = await getUserOrders(input);

    expect(result).toHaveLength(2);
    
    // Check that orders are sorted by date (newest first)
    expect(result[0].remarks).toBe('Newer order');
    expect(result[1].remarks).toBe('Older order');
    expect(result[0].order_date.getTime()).toBeGreaterThan(result[1].order_date.getTime());

    // Verify order items quantities
    expect(result[0].order_items[0].quantity).toBe(2); // Newer order
    expect(result[1].order_items[0].quantity).toBe(1); // Older order
  });

  it('should only return orders for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        name: 'Jane Doe',
        contact_number: '+0987654321',
        department: 'Marketing',
        role: 'regular' as const
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem1,
        price: testMenuItem1.price.toString()
      })
      .returning()
      .execute();
    const menuItemId = menuItemResult[0].id;

    // Create orders for both users
    const user1Order = await db.insert(ordersTable)
      .values({
        user_id: user1Id,
        pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
        remarks: 'User 1 order',
        total_amount: testMenuItem1.price.toString()
      })
      .returning()
      .execute();

    const user2Order = await db.insert(ordersTable)
      .values({
        user_id: user2Id,
        pickup_or_delivery_time: new Date('2024-01-15T13:00:00Z'),
        remarks: 'User 2 order',
        total_amount: testMenuItem1.price.toString()
      })
      .returning()
      .execute();

    // Create order items for both orders
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: user1Order[0].id,
          menu_item_id: menuItemId,
          quantity: 1,
          price_at_order: testMenuItem1.price.toString()
        },
        {
          order_id: user2Order[0].id,
          menu_item_id: menuItemId,
          quantity: 1,
          price_at_order: testMenuItem1.price.toString()
        }
      ])
      .execute();

    // Get orders for user 1 only
    const input: GetUserOrdersInput = { user_id: user1Id };
    const result = await getUserOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(user1Id);
    expect(result[0].remarks).toBe('User 1 order');
    expect(result[0].user.name).toBe('John Doe');
  });

  it('should handle order with multiple quantities of same item', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create menu item
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem1,
        price: testMenuItem1.price.toString()
      })
      .returning()
      .execute();
    const menuItemId = menuItemResult[0].id;

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userId,
        pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
        remarks: 'Multiple quantity order',
        total_amount: (testMenuItem1.price * 3).toString()
      })
      .returning()
      .execute();
    const orderId = orderResult[0].id;

    // Create order item with quantity 3
    await db.insert(orderItemsTable)
      .values({
        order_id: orderId,
        menu_item_id: menuItemId,
        quantity: 3,
        price_at_order: testMenuItem1.price.toString()
      })
      .execute();

    const input: GetUserOrdersInput = { user_id: userId };
    const result = await getUserOrders(input);

    expect(result).toHaveLength(1);
    expect(result[0].order_items).toHaveLength(1);
    expect(result[0].order_items[0].quantity).toBe(3);
    expect(typeof result[0].total_amount).toBe('number');
    expect(result[0].total_amount).toBeCloseTo(testMenuItem1.price * 3, 2);
  });
});