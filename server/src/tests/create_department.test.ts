import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { departmentsTable } from '../db/schema';
import { type CreateDepartmentInput } from '../schema';
import { createDepartment } from '../handlers/create_department';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateDepartmentInput = {
  name: 'Engineering'
};

describe('createDepartment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a department', async () => {
    const result = await createDepartment(testInput);

    // Basic field validation
    expect(result.name).toEqual('Engineering');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save department to database', async () => {
    const result = await createDepartment(testInput);

    // Query using proper drizzle syntax
    const departments = await db.select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, result.id))
      .execute();

    expect(departments).toHaveLength(1);
    expect(departments[0].name).toEqual('Engineering');
    expect(departments[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle unique department names', async () => {
    // Create first department
    await createDepartment(testInput);

    // Try to create department with same name - should fail
    await expect(createDepartment(testInput)).rejects.toThrow(/unique/i);
  });

  it('should create multiple departments with different names', async () => {
    const dept1 = await createDepartment({ name: 'Engineering' });
    const dept2 = await createDepartment({ name: 'Marketing' });
    const dept3 = await createDepartment({ name: 'Sales' });

    // Verify all departments exist
    const allDepartments = await db.select()
      .from(departmentsTable)
      .execute();

    expect(allDepartments).toHaveLength(3);
    expect(allDepartments.map(d => d.name)).toContain('Engineering');
    expect(allDepartments.map(d => d.name)).toContain('Marketing');
    expect(allDepartments.map(d => d.name)).toContain('Sales');
    
    // Verify each has unique ID
    const ids = allDepartments.map(d => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toEqual(3);
  });

  it('should generate sequential IDs', async () => {
    const dept1 = await createDepartment({ name: 'Department 1' });
    const dept2 = await createDepartment({ name: 'Department 2' });

    expect(dept2.id).toBeGreaterThan(dept1.id);
  });
});