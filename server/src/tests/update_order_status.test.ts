import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ordersTable, menuItemsTable, orderItemsTable } from '../db/schema';
import { type UpdateOrderStatusInput, type CreateOrderInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        contact_number: '1234567890',
        department: 'Engineering',
        role: 'regular'
      })
      .returning()
      .execute();
    return userResult[0];
  };

  // Helper function to create test menu item
  const createTestMenuItem = async () => {
    const menuItemResult = await db.insert(menuItemsTable)
      .values({
        name: 'Test Item',
        price: '15.99',
        description: 'A test menu item',
        category: 'Main',
        stock_quantity: 10
      })
      .returning()
      .execute();
    return menuItemResult[0];
  };

  // Helper function to create test order
  const createTestOrder = async (userId: number, status: 'pending' | 'confirmed' | 'delivered' | 'cancelled' = 'pending') => {
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userId,
        status: status,
        pickup_or_delivery_time: new Date(Date.now() + 3600000), // 1 hour from now
        remarks: 'Test order',
        total_amount: '25.50'
      })
      .returning()
      .execute();
    return orderResult[0];
  };

  it('should update order status from pending to confirmed', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const order = await createTestOrder(user.id, 'pending');

    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'confirmed'
    };

    const result = await updateOrderStatus(input);

    // Verify the result
    expect(result.id).toEqual(order.id);
    expect(result.status).toEqual('confirmed');
    expect(result.user_id).toEqual(user.id);
    expect(result.total_amount).toEqual(25.50);
    expect(typeof result.total_amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(order.updated_at.getTime());
  });

  it('should update order status from confirmed to delivered', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const order = await createTestOrder(user.id, 'confirmed');

    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'delivered'
    };

    const result = await updateOrderStatus(input);

    // Verify the status change
    expect(result.id).toEqual(order.id);
    expect(result.status).toEqual('delivered');
    expect(result.user_id).toEqual(user.id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update order status to cancelled', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const order = await createTestOrder(user.id, 'pending');

    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'cancelled'
    };

    const result = await updateOrderStatus(input);

    // Verify the status change
    expect(result.id).toEqual(order.id);
    expect(result.status).toEqual('cancelled');
    expect(result.user_id).toEqual(user.id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist status update in database', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const order = await createTestOrder(user.id, 'pending');

    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'confirmed'
    };

    await updateOrderStatus(input);

    // Query the database to verify the update was persisted
    const updatedOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id))
      .execute();

    expect(updatedOrders).toHaveLength(1);
    expect(updatedOrders[0].status).toEqual('confirmed');
    expect(updatedOrders[0].updated_at).toBeInstanceOf(Date);
    expect(updatedOrders[0].updated_at.getTime()).toBeGreaterThan(order.updated_at.getTime());
  });

  it('should preserve other order fields when updating status', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const order = await createTestOrder(user.id, 'pending');

    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'confirmed'
    };

    const result = await updateOrderStatus(input);

    // Verify all other fields remain unchanged
    expect(result.user_id).toEqual(order.user_id);
    expect(result.order_date.getTime()).toEqual(order.order_date.getTime());
    expect(result.pickup_or_delivery_time.getTime()).toEqual(order.pickup_or_delivery_time.getTime());
    expect(result.remarks).toEqual(order.remarks);
    expect(result.total_amount).toEqual(parseFloat(order.total_amount));
    expect(result.created_at.getTime()).toEqual(order.created_at.getTime());
  });

  it('should throw error when order does not exist', async () => {
    const input: UpdateOrderStatusInput = {
      id: 99999, // Non-existent order ID
      status: 'confirmed'
    };

    await expect(updateOrderStatus(input)).rejects.toThrow(/Order with id 99999 not found/i);
  });

  it('should handle numeric field conversion correctly', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const order = await createTestOrder(user.id, 'pending');

    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'delivered'
    };

    const result = await updateOrderStatus(input);

    // Verify numeric conversion
    expect(typeof result.total_amount).toBe('number');
    expect(result.total_amount).toEqual(25.50);
    expect(result.id).toEqual(order.id);
    expect(typeof result.id).toBe('number');
  });

  it('should update order with order items correctly', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const menuItem = await createTestMenuItem();
    const order = await createTestOrder(user.id, 'pending');

    // Add order items
    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        menu_item_id: menuItem.id,
        quantity: 2,
        price_at_order: '15.99'
      })
      .execute();

    const input: UpdateOrderStatusInput = {
      id: order.id,
      status: 'confirmed'
    };

    const result = await updateOrderStatus(input);

    // Verify the order status was updated
    expect(result.id).toEqual(order.id);
    expect(result.status).toEqual('confirmed');

    // Verify order items still exist
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, order.id))
      .execute();

    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].quantity).toEqual(2);
    expect(parseFloat(orderItems[0].price_at_order)).toEqual(15.99);
  });
});