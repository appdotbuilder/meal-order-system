import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { departmentsTable } from '../db/schema';
import { getDepartments } from '../handlers/get_departments';

describe('getDepartments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no departments exist', async () => {
    const result = await getDepartments();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all departments', async () => {
    // Create test departments
    await db.insert(departmentsTable)
      .values([
        { name: 'Engineering' },
        { name: 'Sales' },
        { name: 'Marketing' }
      ])
      .execute();

    const result = await getDepartments();

    expect(result).toHaveLength(3);
    
    // Check that all departments are returned
    const departmentNames = result.map(dept => dept.name);
    expect(departmentNames).toContain('Engineering');
    expect(departmentNames).toContain('Sales');
    expect(departmentNames).toContain('Marketing');

    // Verify structure of returned departments
    result.forEach(department => {
      expect(department.id).toBeDefined();
      expect(typeof department.id).toBe('number');
      expect(typeof department.name).toBe('string');
      expect(department.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return departments in consistent order', async () => {
    // Create departments in specific order
    await db.insert(departmentsTable)
      .values([
        { name: 'Zebra Department' },
        { name: 'Alpha Department' },
        { name: 'Beta Department' }
      ])
      .execute();

    const result1 = await getDepartments();
    const result2 = await getDepartments();

    // Both calls should return departments in same order
    expect(result1.map(d => d.name)).toEqual(result2.map(d => d.name));
    expect(result1.map(d => d.id)).toEqual(result2.map(d => d.id));
  });

  it('should handle large number of departments', async () => {
    // Create many departments
    const departmentData = Array.from({ length: 50 }, (_, i) => ({
      name: `Department ${i + 1}`
    }));

    await db.insert(departmentsTable)
      .values(departmentData)
      .execute();

    const result = await getDepartments();

    expect(result).toHaveLength(50);
    
    // Verify all departments are unique by name
    const uniqueNames = new Set(result.map(d => d.name));
    expect(uniqueNames.size).toBe(50);

    // Verify all have proper structure
    result.forEach(department => {
      expect(department.id).toBeDefined();
      expect(department.name).toMatch(/^Department \d+$/);
      expect(department.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return departments with proper timestamps', async () => {
    const beforeInsert = new Date();
    
    await db.insert(departmentsTable)
      .values({ name: 'Test Department' })
      .execute();

    const afterInsert = new Date();
    
    const result = await getDepartments();

    expect(result).toHaveLength(1);
    
    const department = result[0];
    expect(department.created_at).toBeInstanceOf(Date);
    expect(department.created_at.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
    expect(department.created_at.getTime()).toBeLessThanOrEqual(afterInsert.getTime());
  });
});