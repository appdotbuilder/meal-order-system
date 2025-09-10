import { db } from '../db';
import { departmentsTable } from '../db/schema';
import { type UpdateDepartmentInput, type Department } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDepartment = async (input: UpdateDepartmentInput): Promise<Department> => {
  try {
    // Check if department exists
    const existingDepartment = await db.select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, input.id))
      .execute();

    if (existingDepartment.length === 0) {
      throw new Error(`Department with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof departmentsTable.$inferInsert> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    // If no fields to update, return existing department
    if (Object.keys(updateData).length === 0) {
      return existingDepartment[0];
    }

    // Update department record
    const result = await db.update(departmentsTable)
      .set(updateData)
      .where(eq(departmentsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Department update failed:', error);
    throw error;
  }
};