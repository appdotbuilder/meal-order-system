import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { departmentsTable } from '../db/schema';
import { type CreateDepartmentInput, type UpdateDepartmentInput } from '../schema';
import { updateDepartment } from '../handlers/update_department';
import { eq } from 'drizzle-orm';

// Test data
const testDepartmentInput: CreateDepartmentInput = {
  name: 'Original Department'
};

const createTestDepartment = async () => {
  const result = await db.insert(departmentsTable)
    .values({
      name: testDepartmentInput.name
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateDepartment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update department name', async () => {
    // Create test department
    const department = await createTestDepartment();

    const updateInput: UpdateDepartmentInput = {
      id: department.id,
      name: 'Updated Department Name'
    };

    const result = await updateDepartment(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(department.id);
    expect(result.name).toEqual('Updated Department Name');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save updated department to database', async () => {
    // Create test department
    const department = await createTestDepartment();

    const updateInput: UpdateDepartmentInput = {
      id: department.id,
      name: 'Database Updated Name'
    };

    await updateDepartment(updateInput);

    // Verify changes in database
    const updatedDepartments = await db.select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, department.id))
      .execute();

    expect(updatedDepartments).toHaveLength(1);
    expect(updatedDepartments[0].name).toEqual('Database Updated Name');
    expect(updatedDepartments[0].id).toEqual(department.id);
  });

  it('should return existing department when no fields provided', async () => {
    // Create test department
    const department = await createTestDepartment();

    const updateInput: UpdateDepartmentInput = {
      id: department.id
      // No name provided
    };

    const result = await updateDepartment(updateInput);

    // Should return unchanged department
    expect(result.id).toEqual(department.id);
    expect(result.name).toEqual('Original Department');
    expect(result.created_at).toEqual(department.created_at);
  });

  it('should throw error when department does not exist', async () => {
    const updateInput: UpdateDepartmentInput = {
      id: 999, // Non-existent ID
      name: 'Updated Name'
    };

    await expect(updateDepartment(updateInput)).rejects.toThrow(/Department with id 999 not found/);
  });

  it('should handle duplicate name error', async () => {
    // Create two test departments
    await createTestDepartment(); // "Original Department"
    
    const secondDepartment = await db.insert(departmentsTable)
      .values({
        name: 'Second Department'
      })
      .returning()
      .execute();

    const updateInput: UpdateDepartmentInput = {
      id: secondDepartment[0].id,
      name: 'Original Department' // Trying to use existing name
    };

    // Should throw error due to unique constraint
    await expect(updateDepartment(updateInput)).rejects.toThrow();
  });

  it('should preserve created_at timestamp after update', async () => {
    // Create test department
    const department = await createTestDepartment();
    const originalCreatedAt = department.created_at;

    const updateInput: UpdateDepartmentInput = {
      id: department.id,
      name: 'Timestamp Test Department'
    };

    const result = await updateDepartment(updateInput);

    // Verify created_at is preserved
    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.name).toEqual('Timestamp Test Department');
  });
});