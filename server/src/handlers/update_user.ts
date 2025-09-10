import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Build the update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.contact_number !== undefined) updateData.contact_number = input.contact_number;
    if (input.department !== undefined) updateData.department = input.department;
    if (input.role !== undefined) updateData.role = input.role;

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    // Check if user was found and updated
    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};