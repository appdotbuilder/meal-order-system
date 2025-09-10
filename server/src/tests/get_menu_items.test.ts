import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuItemsTable } from '../db/schema';
import { getMenuItems } from '../handlers/get_menu_items';

describe('getMenuItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no menu items exist', async () => {
    const result = await getMenuItems();
    expect(result).toEqual([]);
  });

  it('should return all menu items', async () => {
    // Create test menu items
    await db.insert(menuItemsTable)
      .values([
        {
          name: 'Pizza Margherita',
          price: '12.99',
          description: 'Classic pizza with tomato and mozzarella',
          image_url: 'https://example.com/pizza.jpg',
          category: 'Pizza',
          stock_quantity: 50
        },
        {
          name: 'Caesar Salad',
          price: '8.50',
          description: 'Fresh romaine lettuce with caesar dressing',
          image_url: null,
          category: 'Salads',
          stock_quantity: 30
        },
        {
          name: 'Chocolate Cake',
          price: '6.75',
          description: null,
          image_url: 'https://example.com/cake.jpg',
          category: 'Desserts',
          stock_quantity: 20
        }
      ])
      .execute();

    const result = await getMenuItems();

    expect(result).toHaveLength(3);
    
    // Verify first item
    const pizza = result.find(item => item.name === 'Pizza Margherita');
    expect(pizza).toBeDefined();
    expect(pizza!.price).toBe(12.99);
    expect(typeof pizza!.price).toBe('number');
    expect(pizza!.description).toBe('Classic pizza with tomato and mozzarella');
    expect(pizza!.category).toBe('Pizza');
    expect(pizza!.stock_quantity).toBe(50);
    expect(pizza!.id).toBeDefined();
    expect(pizza!.created_at).toBeInstanceOf(Date);
    expect(pizza!.updated_at).toBeInstanceOf(Date);

    // Verify second item (with null description)
    const salad = result.find(item => item.name === 'Caesar Salad');
    expect(salad).toBeDefined();
    expect(salad!.price).toBe(8.50);
    expect(typeof salad!.price).toBe('number');
    expect(salad!.image_url).toBeNull();
    expect(salad!.category).toBe('Salads');

    // Verify third item (with null description)
    const cake = result.find(item => item.name === 'Chocolate Cake');
    expect(cake).toBeDefined();
    expect(cake!.price).toBe(6.75);
    expect(typeof cake!.price).toBe('number');
    expect(cake!.description).toBeNull();
    expect(cake!.category).toBe('Desserts');
  });

  it('should handle different categories correctly', async () => {
    // Create items in different categories
    await db.insert(menuItemsTable)
      .values([
        {
          name: 'Burger',
          price: '15.00',
          description: 'Beef burger',
          category: 'Main Dishes',
          stock_quantity: 25
        },
        {
          name: 'Coca Cola',
          price: '2.50',
          description: 'Soft drink',
          category: 'Beverages',
          stock_quantity: 100
        }
      ])
      .execute();

    const result = await getMenuItems();

    expect(result).toHaveLength(2);
    
    const categories = result.map(item => item.category);
    expect(categories).toContain('Main Dishes');
    expect(categories).toContain('Beverages');
  });

  it('should handle zero stock quantity', async () => {
    await db.insert(menuItemsTable)
      .values({
        name: 'Out of Stock Item',
        price: '10.00',
        description: 'Currently unavailable',
        category: 'Test',
        stock_quantity: 0
      })
      .execute();

    const result = await getMenuItems();

    expect(result).toHaveLength(1);
    expect(result[0].stock_quantity).toBe(0);
    expect(result[0].name).toBe('Out of Stock Item');
  });

  it('should preserve all field types correctly', async () => {
    await db.insert(menuItemsTable)
      .values({
        name: 'Test Item',
        price: '19.99',
        description: 'Test description',
        image_url: 'https://test.com/image.jpg',
        category: 'Test Category',
        stock_quantity: 42
      })
      .execute();

    const result = await getMenuItems();

    expect(result).toHaveLength(1);
    const item = result[0];
    
    // Type checks
    expect(typeof item.id).toBe('number');
    expect(typeof item.name).toBe('string');
    expect(typeof item.price).toBe('number');
    expect(typeof item.description).toBe('string');
    expect(typeof item.image_url).toBe('string');
    expect(typeof item.category).toBe('string');
    expect(typeof item.stock_quantity).toBe('number');
    expect(item.created_at).toBeInstanceOf(Date);
    expect(item.updated_at).toBeInstanceOf(Date);
    
    // Value checks
    expect(item.price).toBe(19.99);
    expect(item.stock_quantity).toBe(42);
  });
});