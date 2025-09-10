import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuItemsTable } from '../db/schema';
import { deleteMenuItem } from '../handlers/delete_menu_item';
import { eq } from 'drizzle-orm';

// Test menu item data
const testMenuItem = {
  name: 'Test Pizza',
  price: '15.99',
  description: 'Delicious test pizza',
  image_url: 'https://example.com/pizza.jpg',
  category: 'main',
  stock_quantity: 50
};

describe('deleteMenuItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing menu item', async () => {
    // Create a test menu item first
    const insertResult = await db.insert(menuItemsTable)
      .values(testMenuItem)
      .returning()
      .execute();

    const menuItemId = insertResult[0].id;

    // Verify item exists before deletion
    const beforeDelete = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, menuItemId))
      .execute();
    expect(beforeDelete).toHaveLength(1);

    // Delete the menu item
    const result = await deleteMenuItem(menuItemId);
    expect(result.success).toBe(true);

    // Verify item is deleted
    const afterDelete = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, menuItemId))
      .execute();
    expect(afterDelete).toHaveLength(0);
  });

  it('should throw error when menu item does not exist', async () => {
    const nonExistentId = 99999;

    // Verify item doesn't exist
    const existing = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, nonExistentId))
      .execute();
    expect(existing).toHaveLength(0);

    // Attempt to delete non-existent item should throw
    await expect(deleteMenuItem(nonExistentId))
      .rejects.toThrow(/menu item not found/i);
  });

  it('should not affect other menu items when deleting one', async () => {
    // Create multiple test menu items
    const item1 = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem,
        name: 'Test Pizza 1'
      })
      .returning()
      .execute();

    const item2 = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem,
        name: 'Test Pizza 2'
      })
      .returning()
      .execute();

    const item3 = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem,
        name: 'Test Pizza 3'
      })
      .returning()
      .execute();

    // Verify all items exist
    const allItems = await db.select()
      .from(menuItemsTable)
      .execute();
    expect(allItems).toHaveLength(3);

    // Delete the middle item
    const result = await deleteMenuItem(item2[0].id);
    expect(result.success).toBe(true);

    // Verify only the targeted item was deleted
    const remainingItems = await db.select()
      .from(menuItemsTable)
      .execute();
    expect(remainingItems).toHaveLength(2);

    const remainingIds = remainingItems.map(item => item.id);
    expect(remainingIds).toContain(item1[0].id);
    expect(remainingIds).toContain(item3[0].id);
    expect(remainingIds).not.toContain(item2[0].id);
  });

  it('should handle menu items with different categories', async () => {
    // Create menu items in different categories
    const pizzaItem = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem,
        name: 'Margherita Pizza',
        category: 'pizza'
      })
      .returning()
      .execute();

    const drinkItem = await db.insert(menuItemsTable)
      .values({
        ...testMenuItem,
        name: 'Cola',
        price: '2.99',
        category: 'drinks'
      })
      .returning()
      .execute();

    // Delete the pizza item
    const result = await deleteMenuItem(pizzaItem[0].id);
    expect(result.success).toBe(true);

    // Verify pizza item is deleted but drink item remains
    const remainingItems = await db.select()
      .from(menuItemsTable)
      .execute();
    
    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].id).toBe(drinkItem[0].id);
    expect(remainingItems[0].category).toBe('drinks');
  });

  it('should handle menu items with null optional fields', async () => {
    // Create menu item with null description and image_url
    const minimalItem = await db.insert(menuItemsTable)
      .values({
        name: 'Minimal Item',
        price: '5.00',
        description: null,
        image_url: null,
        category: 'snacks',
        stock_quantity: 10
      })
      .returning()
      .execute();

    // Delete the minimal item
    const result = await deleteMenuItem(minimalItem[0].id);
    expect(result.success).toBe(true);

    // Verify item is deleted
    const afterDelete = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, minimalItem[0].id))
      .execute();
    expect(afterDelete).toHaveLength(0);
  });
});