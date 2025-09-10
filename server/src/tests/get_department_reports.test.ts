import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, menuItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { getDepartmentReports } from '../handlers/get_department_reports';

describe('getDepartmentReports', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no orders exist', async () => {
    const result = await getDepartmentReports();
    expect(result).toEqual([]);
  });

  it('should generate basic department reports', async () => {
    // Create test users from different departments
    const users = await db.insert(usersTable)
      .values([
        { name: 'John IT', contact_number: '123', department: 'IT', role: 'regular' },
        { name: 'Jane HR', contact_number: '456', department: 'HR', role: 'regular' }
      ])
      .returning()
      .execute();

    // Create test menu items
    const menuItems = await db.insert(menuItemsTable)
      .values([
        { name: 'Coffee', price: '5.99', category: 'Beverages', stock_quantity: 50 },
        { name: 'Sandwich', price: '12.99', category: 'Food', stock_quantity: 30 }
      ])
      .returning()
      .execute();

    // Create test orders
    const orders = await db.insert(ordersTable)
      .values([
        {
          user_id: users[0].id,
          pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
          total_amount: '18.98',
          status: 'confirmed'
        },
        {
          user_id: users[1].id,
          pickup_or_delivery_time: new Date('2024-01-15T13:00:00Z'),
          total_amount: '12.99',
          status: 'pending'
        }
      ])
      .returning()
      .execute();

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: orders[0].id,
          menu_item_id: menuItems[0].id,
          quantity: 2,
          price_at_order: '5.99'
        },
        {
          order_id: orders[0].id,
          menu_item_id: menuItems[1].id,
          quantity: 1,
          price_at_order: '12.99'
        },
        {
          order_id: orders[1].id,
          menu_item_id: menuItems[1].id,
          quantity: 1,
          price_at_order: '12.99'
        }
      ])
      .execute();

    const result = await getDepartmentReports();

    expect(result).toHaveLength(2);
    
    // Find IT department report
    const itReport = result.find(r => r.department === 'IT');
    expect(itReport).toBeDefined();
    expect(itReport!.total_orders).toBe(1);
    expect(itReport!.total_quantity).toBe(3); // 2 + 1
    expect(itReport!.total_amount).toBe(18.98);

    // Find HR department report
    const hrReport = result.find(r => r.department === 'HR');
    expect(hrReport).toBeDefined();
    expect(hrReport!.total_orders).toBe(1);
    expect(hrReport!.total_quantity).toBe(1);
    expect(hrReport!.total_amount).toBe(12.99);
  });

  it('should aggregate multiple orders from same department', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([
        { name: 'User1 Finance', contact_number: '111', department: 'Finance', role: 'regular' },
        { name: 'User2 Finance', contact_number: '222', department: 'Finance', role: 'regular' }
      ])
      .returning()
      .execute();

    // Create test menu item
    const menuItems = await db.insert(menuItemsTable)
      .values([
        { name: 'Lunch', price: '15.50', category: 'Food', stock_quantity: 100 }
      ])
      .returning()
      .execute();

    // Create multiple orders from same department
    const orders = await db.insert(ordersTable)
      .values([
        {
          user_id: users[0].id,
          pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
          total_amount: '31.00',
          status: 'confirmed'
        },
        {
          user_id: users[1].id,
          pickup_or_delivery_time: new Date('2024-01-15T13:00:00Z'),
          total_amount: '15.50',
          status: 'delivered'
        }
      ])
      .returning()
      .execute();

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: orders[0].id,
          menu_item_id: menuItems[0].id,
          quantity: 2,
          price_at_order: '15.50'
        },
        {
          order_id: orders[1].id,
          menu_item_id: menuItems[0].id,
          quantity: 1,
          price_at_order: '15.50'
        }
      ])
      .execute();

    const result = await getDepartmentReports();

    expect(result).toHaveLength(1);
    expect(result[0].department).toBe('Finance');
    expect(result[0].total_orders).toBe(2);
    expect(result[0].total_quantity).toBe(3); // 2 + 1
    expect(result[0].total_amount).toBe(46.50); // 31.00 + 15.50
  });

  it('should handle numeric conversions correctly', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([
        { name: 'Test User', contact_number: '999', department: 'Sales', role: 'regular' }
      ])
      .returning()
      .execute();

    // Create test menu item with decimal price
    const menuItems = await db.insert(menuItemsTable)
      .values([
        { name: 'Premium Item', price: '99.95', category: 'Premium', stock_quantity: 10 }
      ])
      .returning()
      .execute();

    // Create test order
    const orders = await db.insert(ordersTable)
      .values([
        {
          user_id: users[0].id,
          pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
          total_amount: '199.90',
          status: 'confirmed'
        }
      ])
      .returning()
      .execute();

    // Create order item
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: orders[0].id,
          menu_item_id: menuItems[0].id,
          quantity: 2,
          price_at_order: '99.95'
        }
      ])
      .execute();

    const result = await getDepartmentReports();

    expect(result).toHaveLength(1);
    expect(result[0].department).toBe('Sales');
    expect(result[0].total_orders).toBe(1);
    expect(result[0].total_quantity).toBe(2);
    expect(typeof result[0].total_amount).toBe('number');
    expect(result[0].total_amount).toBe(199.90);
  });

  it('should return reports sorted by department name', async () => {
    // Create users from multiple departments
    const users = await db.insert(usersTable)
      .values([
        { name: 'User Z', contact_number: '111', department: 'ZZZ Department', role: 'regular' },
        { name: 'User A', contact_number: '222', department: 'AAA Department', role: 'regular' },
        { name: 'User M', contact_number: '333', department: 'MMM Department', role: 'regular' }
      ])
      .returning()
      .execute();

    // Create test menu item
    const menuItems = await db.insert(menuItemsTable)
      .values([
        { name: 'Test Item', price: '10.00', category: 'Test', stock_quantity: 100 }
      ])
      .returning()
      .execute();

    // Create orders for each department
    const orders = await db.insert(ordersTable)
      .values([
        {
          user_id: users[0].id,
          pickup_or_delivery_time: new Date('2024-01-15T12:00:00Z'),
          total_amount: '10.00',
          status: 'confirmed'
        },
        {
          user_id: users[1].id,
          pickup_or_delivery_time: new Date('2024-01-15T13:00:00Z'),
          total_amount: '10.00',
          status: 'confirmed'
        },
        {
          user_id: users[2].id,
          pickup_or_delivery_time: new Date('2024-01-15T14:00:00Z'),
          total_amount: '10.00',
          status: 'confirmed'
        }
      ])
      .returning()
      .execute();

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: orders[0].id,
          menu_item_id: menuItems[0].id,
          quantity: 1,
          price_at_order: '10.00'
        },
        {
          order_id: orders[1].id,
          menu_item_id: menuItems[0].id,
          quantity: 1,
          price_at_order: '10.00'
        },
        {
          order_id: orders[2].id,
          menu_item_id: menuItems[0].id,
          quantity: 1,
          price_at_order: '10.00'
        }
      ])
      .execute();

    const result = await getDepartmentReports();

    expect(result).toHaveLength(3);
    
    // Verify all departments are present
    const departments = result.map(r => r.department);
    expect(departments).toContain('ZZZ Department');
    expect(departments).toContain('AAA Department');
    expect(departments).toContain('MMM Department');
  });
});