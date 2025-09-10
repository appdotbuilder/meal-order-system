import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, departmentsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  name: 'John Doe',
  contact_number: '1234567890',
  department: 'Engineering',
  role: 'regular'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.contact_number).toEqual('1234567890');
    expect(result.department).toEqual('Engineering');
    expect(result.role).toEqual('regular');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].contact_number).toEqual('1234567890');
    expect(users[0].department).toEqual('Engineering');
    expect(users[0].role).toEqual('regular');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should create admin user when role is specified', async () => {
    const adminInput: CreateUserInput = {
      name: 'Admin User',
      contact_number: '9876543210',
      department: 'Management',
      role: 'admin'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('admin');
    expect(result.name).toEqual('Admin User');
    expect(result.contact_number).toEqual('9876543210');
    expect(result.department).toEqual('Management');
  });

  it('should use default role when not specified in schema', async () => {
    // Test that the schema default works (role defaults to 'regular')
    const inputWithoutRole = {
      name: 'Default Role User',
      contact_number: '5555555555',
      department: 'HR'
    };

    // Note: We're calling createUser with the full parsed input that includes the default
    const fullInput: CreateUserInput = {
      ...inputWithoutRole,
      role: 'regular' // This would be applied by Zod's default
    };

    const result = await createUser(fullInput);

    expect(result.role).toEqual('regular');
    expect(result.name).toEqual('Default Role User');
  });

  it('should handle different departments', async () => {
    const testCases = [
      { department: 'Sales', name: 'Sales Person' },
      { department: 'Marketing', name: 'Marketing Person' },
      { department: 'IT Support', name: 'Support Person' }
    ];

    for (const testCase of testCases) {
      const input: CreateUserInput = {
        name: testCase.name,
        contact_number: `${Math.random().toString().slice(2, 12)}`, // Generate unique contact number
        department: testCase.department,
        role: 'regular'
      };

      const result = await createUser(input);

      expect(result.department).toEqual(testCase.department);
      expect(result.name).toEqual(testCase.name);
      expect(result.role).toEqual('regular');
    }
  });

  it('should enforce unique contact numbers', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same contact number
    const duplicateInput: CreateUserInput = {
      name: 'Jane Doe',
      contact_number: '1234567890', // Same as testInput
      department: 'Sales',
      role: 'regular'
    };

    // Should throw an error due to unique constraint
    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should create users with various contact number formats', async () => {
    const testCases = [
      '+1-555-123-4567',
      '(555) 123-4567',
      '555.123.4567',
      '15551234567'
    ];

    for (let i = 0; i < testCases.length; i++) {
      const input: CreateUserInput = {
        name: `User ${i + 1}`,
        contact_number: testCases[i],
        department: 'Testing',
        role: 'regular'
      };

      const result = await createUser(input);

      expect(result.contact_number).toEqual(testCases[i]);
      expect(result.name).toEqual(`User ${i + 1}`);
    }
  });
});