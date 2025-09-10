import { db } from '../db';
import { departmentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteDepartment = async (id: number): Promise<{ success: boolean }> => {
  try {
    // Delete the department record
    const result = await db.delete(departmentsTable)
      .where(eq(departmentsTable.id, id))
      .returning()
      .execute();

    // Return success status based on whether a record was deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Department deletion failed:', error);
    throw error;
  }
};