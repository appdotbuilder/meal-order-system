import { db } from '../db';
import { menuItemsTable } from '../db/schema';
import { type UpdateMenuItemInput, type MenuItem } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMenuItem = async (input: UpdateMenuItemInput): Promise<MenuItem> => {
  try {
    // First check if the menu item exists
    const existingMenuItem = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, input.id))
      .execute();

    if (existingMenuItem.length === 0) {
      throw new Error(`Menu item with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.price !== undefined) updateData.price = input.price.toString(); // Convert number to string for numeric column
    if (input.description !== undefined) updateData.description = input.description;
    if (input.image_url !== undefined) updateData.image_url = input.image_url;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.stock_quantity !== undefined) updateData.stock_quantity = input.stock_quantity;

    // Update the menu item
    const result = await db.update(menuItemsTable)
      .set(updateData)
      .where(eq(menuItemsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const menuItem = result[0];
    return {
      ...menuItem,
      price: parseFloat(menuItem.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Menu item update failed:', error);
    throw error;
  }
};