import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuItemsTable } from '../db/schema';
import { type UpdateMenuItemInput, type CreateMenuItemInput } from '../schema';
import { updateMenuItem } from '../handlers/update_menu_item';
import { eq } from 'drizzle-orm';

// Test setup data
const testMenuItem: CreateMenuItemInput = {
  name: 'Original Burger',
  price: 15.99,
  description: 'Original delicious burger',
  image_url: 'https://example.com/burger.jpg',
  category: 'Food',
  stock_quantity: 50
};

const createTestMenuItem = async () => {
  const result = await db.insert(menuItemsTable)
    .values({
      name: testMenuItem.name,
      price: testMenuItem.price.toString(),
      description: testMenuItem.description,
      image_url: testMenuItem.image_url,
      category: testMenuItem.category,
      stock_quantity: testMenuItem.stock_quantity
    })
    .returning()
    .execute();

  return {
    ...result[0],
    price: parseFloat(result[0].price)
  };
};

describe('updateMenuItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of a menu item', async () => {
    const menuItem = await createTestMenuItem();

    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      name: 'Updated Burger',
      price: 18.99,
      description: 'Updated delicious burger',
      image_url: 'https://example.com/updated-burger.jpg',
      category: 'Premium Food',
      stock_quantity: 75
    };

    const result = await updateMenuItem(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(menuItem.id);
    expect(result.name).toEqual('Updated Burger');
    expect(result.price).toEqual(18.99);
    expect(typeof result.price).toBe('number');
    expect(result.description).toEqual('Updated delicious burger');
    expect(result.image_url).toEqual('https://example.com/updated-burger.jpg');
    expect(result.category).toEqual('Premium Food');
    expect(result.stock_quantity).toEqual(75);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(menuItem.updated_at.getTime());
  });

  it('should update only specified fields', async () => {
    const menuItem = await createTestMenuItem();

    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      name: 'Partially Updated Burger',
      price: 16.99
    };

    const result = await updateMenuItem(updateInput);

    // Verify only specified fields were updated
    expect(result.name).toEqual('Partially Updated Burger');
    expect(result.price).toEqual(16.99);
    expect(typeof result.price).toBe('number');
    
    // Other fields should remain unchanged
    expect(result.description).toEqual(testMenuItem.description);
    expect(result.image_url).toEqual(testMenuItem.image_url);
    expect(result.category).toEqual(testMenuItem.category);
    expect(result.stock_quantity).toEqual(testMenuItem.stock_quantity);
    expect(result.updated_at.getTime()).toBeGreaterThan(menuItem.updated_at.getTime());
  });

  it('should update menu item with null values', async () => {
    const menuItem = await createTestMenuItem();

    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      description: null,
      image_url: null
    };

    const result = await updateMenuItem(updateInput);

    expect(result.description).toBeNull();
    expect(result.image_url).toBeNull();
    
    // Other fields should remain unchanged
    expect(result.name).toEqual(testMenuItem.name);
    expect(result.price).toEqual(testMenuItem.price);
    expect(result.category).toEqual(testMenuItem.category);
    expect(result.stock_quantity).toEqual(testMenuItem.stock_quantity);
  });

  it('should update menu item in database', async () => {
    const menuItem = await createTestMenuItem();

    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      name: 'DB Updated Burger',
      stock_quantity: 100
    };

    await updateMenuItem(updateInput);

    // Verify changes were saved to database
    const updatedInDb = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, menuItem.id))
      .execute();

    expect(updatedInDb).toHaveLength(1);
    expect(updatedInDb[0].name).toEqual('DB Updated Burger');
    expect(updatedInDb[0].stock_quantity).toEqual(100);
    expect(parseFloat(updatedInDb[0].price)).toEqual(testMenuItem.price);
    expect(updatedInDb[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when menu item does not exist', async () => {
    const updateInput: UpdateMenuItemInput = {
      id: 99999,
      name: 'Non-existent Item'
    };

    await expect(updateMenuItem(updateInput)).rejects.toThrow(/menu item with id 99999 not found/i);
  });

  it('should handle numeric price conversion correctly', async () => {
    const menuItem = await createTestMenuItem();

    const updateInput: UpdateMenuItemInput = {
      id: menuItem.id,
      price: 25.50
    };

    const result = await updateMenuItem(updateInput);

    // Verify price is returned as number
    expect(result.price).toEqual(25.50);
    expect(typeof result.price).toBe('number');

    // Verify price is stored correctly in database
    const dbResult = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, menuItem.id))
      .execute();

    expect(parseFloat(dbResult[0].price)).toEqual(25.50);
  });
});