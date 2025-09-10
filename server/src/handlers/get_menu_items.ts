import { db } from '../db';
import { menuItemsTable } from '../db/schema';
import { type MenuItem } from '../schema';

export const getMenuItems = async (): Promise<MenuItem[]> => {
  try {
    const results = await db.select()
      .from(menuItemsTable)
      .execute();

    // Convert numeric fields from string to number
    return results.map(item => ({
      ...item,
      price: parseFloat(item.price)
    }));
  } catch (error) {
    console.error('Failed to fetch menu items:', error);
    throw error;
  }
};