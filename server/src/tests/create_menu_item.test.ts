import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuItemsTable } from '../db/schema';
import { type CreateMenuItemInput } from '../schema';
import { createMenuItem } from '../handlers/create_menu_item';
import { eq, gte, between, and } from 'drizzle-orm';

// Simple test input with all required fields
const testInput: CreateMenuItemInput = {
  name: 'Test Burger',
  price: 12.99,
  description: 'A delicious test burger',
  image_url: 'https://example.com/burger.jpg',
  category: 'Burgers',
  stock_quantity: 50
};

// Test input with null optional fields
const minimalInput: CreateMenuItemInput = {
  name: 'Simple Item',
  price: 5.99,
  description: null,
  image_url: null,
  category: 'Snacks',
  stock_quantity: 25
};

describe('createMenuItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a menu item with all fields', async () => {
    const result = await createMenuItem(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Burger');
    expect(result.price).toEqual(12.99);
    expect(typeof result.price).toEqual('number');
    expect(result.description).toEqual('A delicious test burger');
    expect(result.image_url).toEqual('https://example.com/burger.jpg');
    expect(result.category).toEqual('Burgers');
    expect(result.stock_quantity).toEqual(50);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a menu item with null optional fields', async () => {
    const result = await createMenuItem(minimalInput);

    expect(result.name).toEqual('Simple Item');
    expect(result.price).toEqual(5.99);
    expect(typeof result.price).toEqual('number');
    expect(result.description).toBeNull();
    expect(result.image_url).toBeNull();
    expect(result.category).toEqual('Snacks');
    expect(result.stock_quantity).toEqual(25);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save menu item to database correctly', async () => {
    const result = await createMenuItem(testInput);

    // Query using proper drizzle syntax
    const menuItems = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, result.id))
      .execute();

    expect(menuItems).toHaveLength(1);
    const savedItem = menuItems[0];
    expect(savedItem.name).toEqual('Test Burger');
    expect(parseFloat(savedItem.price)).toEqual(12.99);
    expect(savedItem.description).toEqual('A delicious test burger');
    expect(savedItem.image_url).toEqual('https://example.com/burger.jpg');
    expect(savedItem.category).toEqual('Burgers');
    expect(savedItem.stock_quantity).toEqual(50);
    expect(savedItem.created_at).toBeInstanceOf(Date);
    expect(savedItem.updated_at).toBeInstanceOf(Date);
  });

  it('should handle zero stock quantity', async () => {
    const zeroStockInput: CreateMenuItemInput = {
      name: 'Out of Stock Item',
      price: 8.50,
      description: 'Currently unavailable',
      image_url: null,
      category: 'Limited',
      stock_quantity: 0
    };

    const result = await createMenuItem(zeroStockInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.name).toEqual('Out of Stock Item');
    expect(result.price).toEqual(8.50);
  });

  it('should query menu items by date range correctly', async () => {
    // Create test menu item
    await createMenuItem(testInput);

    // Test date filtering with a wider range to account for millisecond timing
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Query with date filter
    const menuItems = await db.select()
      .from(menuItemsTable)
      .where(
        and(
          gte(menuItemsTable.created_at, yesterday),
          between(menuItemsTable.created_at, yesterday, tomorrow)
        )
      )
      .execute();

    expect(menuItems.length).toBeGreaterThan(0);
    menuItems.forEach(item => {
      expect(item.created_at).toBeInstanceOf(Date);
      expect(item.created_at >= yesterday).toBe(true);
      expect(item.created_at <= tomorrow).toBe(true);
      expect(parseFloat(item.price)).toBeGreaterThan(0);
    });
  });

  it('should handle decimal prices correctly', async () => {
    const decimalPriceInput: CreateMenuItemInput = {
      name: 'Precise Price Item',
      price: 7.33, // PostgreSQL numeric(10,2) rounds to 2 decimal places
      description: 'Testing decimal precision',
      image_url: null,
      category: 'Test',
      stock_quantity: 10
    };

    const result = await createMenuItem(decimalPriceInput);

    expect(result.price).toEqual(7.33);
    expect(typeof result.price).toEqual('number');

    // Verify database storage and retrieval
    const dbItems = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, result.id))
      .execute();

    expect(parseFloat(dbItems[0].price)).toEqual(7.33);
  });

  it('should create multiple menu items with unique IDs', async () => {
    const input1: CreateMenuItemInput = {
      name: 'Item 1',
      price: 10.00,
      description: 'First item',
      image_url: null,
      category: 'Category1',
      stock_quantity: 20
    };

    const input2: CreateMenuItemInput = {
      name: 'Item 2',
      price: 15.00,
      description: 'Second item',
      image_url: null,
      category: 'Category2',
      stock_quantity: 30
    };

    const result1 = await createMenuItem(input1);
    const result2 = await createMenuItem(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Item 1');
    expect(result2.name).toEqual('Item 2');
    expect(result1.price).toEqual(10.00);
    expect(result2.price).toEqual(15.00);

    // Verify both items exist in database
    const allItems = await db.select()
      .from(menuItemsTable)
      .execute();

    expect(allItems.length).toBeGreaterThanOrEqual(2);
    const itemNames = allItems.map(item => item.name);
    expect(itemNames).toContain('Item 1');
    expect(itemNames).toContain('Item 2');
  });
});