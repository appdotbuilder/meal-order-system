import { db } from '../db';
import { menuItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteMenuItem = async (id: number): Promise<{ success: boolean }> => {
  try {
    // Check if menu item exists before attempting to delete
    const existingItem = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, id))
      .execute();

    if (existingItem.length === 0) {
      throw new Error('Menu item not found');
    }

    // Delete the menu item
    await db.delete(menuItemsTable)
      .where(eq(menuItemsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Menu item deletion failed:', error);
    throw error;
  }
};