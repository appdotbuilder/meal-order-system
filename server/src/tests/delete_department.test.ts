import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { departmentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteDepartment } from '../handlers/delete_department';

describe('deleteDepartment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a department successfully', async () => {
    // Create a test department first
    const createResult = await db.insert(departmentsTable)
      .values({
        name: 'Test Department'
      })
      .returning()
      .execute();

    const departmentId = createResult[0].id;

    // Delete the department
    const result = await deleteDepartment(departmentId);

    // Verify the result indicates success
    expect(result.success).toBe(true);

    // Verify the department no longer exists in the database
    const departments = await db.select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, departmentId))
      .execute();

    expect(departments).toHaveLength(0);
  });

  it('should return false when department does not exist', async () => {
    // Try to delete a non-existent department
    const result = await deleteDepartment(99999);

    // Should return success: false since no record was deleted
    expect(result.success).toBe(false);
  });

  it('should handle multiple departments correctly', async () => {
    // Create multiple test departments
    const createResult = await db.insert(departmentsTable)
      .values([
        { name: 'Department One' },
        { name: 'Department Two' },
        { name: 'Department Three' }
      ])
      .returning()
      .execute();

    const departmentIds = createResult.map(dept => dept.id);

    // Delete one specific department
    const result = await deleteDepartment(departmentIds[1]);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify only the specific department was deleted
    const remainingDepartments = await db.select()
      .from(departmentsTable)
      .execute();

    expect(remainingDepartments).toHaveLength(2);
    expect(remainingDepartments.map(dept => dept.id)).toEqual(
      expect.arrayContaining([departmentIds[0], departmentIds[2]])
    );
    expect(remainingDepartments.map(dept => dept.id)).not.toContain(departmentIds[1]);
  });

  it('should preserve database integrity when deleting', async () => {
    // Create test departments
    const createResult = await db.insert(departmentsTable)
      .values([
        { name: 'HR Department' },
        { name: 'IT Department' }
      ])
      .returning()
      .execute();

    const hrDeptId = createResult[0].id;
    const itDeptId = createResult[1].id;

    // Delete HR department
    await deleteDepartment(hrDeptId);

    // Verify IT department still exists and has correct data
    const remainingDepartments = await db.select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, itDeptId))
      .execute();

    expect(remainingDepartments).toHaveLength(1);
    expect(remainingDepartments[0].name).toBe('IT Department');
    expect(remainingDepartments[0].created_at).toBeInstanceOf(Date);
  });
});