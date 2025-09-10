import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test input for creating initial user
const testCreateInput: CreateUserInput = {
  name: 'John Doe',
  contact_number: '1234567890',
  department: 'Engineering',
  role: 'regular'
};

// Test input for updating user
const testUpdateInput: UpdateUserInput = {
  id: 1, // Will be set to actual ID after creating user
  name: 'Jane Smith',
  contact_number: '0987654321',
  department: 'Marketing',
  role: 'admin'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a user with all fields', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();
    
    const userId = createResult[0].id;
    const updateInput = { ...testUpdateInput, id: userId };

    // Update the user
    const result = await updateUser(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(userId);
    expect(result.name).toEqual('Jane Smith');
    expect(result.contact_number).toEqual('0987654321');
    expect(result.department).toEqual('Marketing');
    expect(result.role).toEqual('admin');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();
    
    const userId = createResult[0].id;
    const partialUpdateInput: UpdateUserInput = {
      id: userId,
      name: 'Updated Name Only'
    };

    // Update the user with partial data
    const result = await updateUser(partialUpdateInput);

    // Verify only name was updated, other fields remain unchanged
    expect(result.id).toEqual(userId);
    expect(result.name).toEqual('Updated Name Only');
    expect(result.contact_number).toEqual('1234567890'); // Original value
    expect(result.department).toEqual('Engineering'); // Original value
    expect(result.role).toEqual('regular'); // Original value
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update user in database', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();
    
    const userId = createResult[0].id;
    const updateInput = { ...testUpdateInput, id: userId };

    // Update the user
    await updateUser(updateInput);

    // Query database to verify update
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Jane Smith');
    expect(users[0].contact_number).toEqual('0987654321');
    expect(users[0].department).toEqual('Marketing');
    expect(users[0].role).toEqual('admin');
  });

  it('should handle contact number updates correctly', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();
    
    const userId = createResult[0].id;
    const contactUpdateInput: UpdateUserInput = {
      id: userId,
      contact_number: '5555555555'
    };

    // Update only contact number
    const result = await updateUser(contactUpdateInput);

    // Verify contact number was updated
    expect(result.contact_number).toEqual('5555555555');
    expect(result.name).toEqual('John Doe'); // Original value
  });

  it('should handle role updates correctly', async () => {
    // Create initial user with regular role
    const createResult = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();
    
    const userId = createResult[0].id;
    const roleUpdateInput: UpdateUserInput = {
      id: userId,
      role: 'admin'
    };

    // Update only role
    const result = await updateUser(roleUpdateInput);

    // Verify role was updated
    expect(result.role).toEqual('admin');
    expect(result.name).toEqual('John Doe'); // Original value
    expect(result.department).toEqual('Engineering'); // Original value
  });

  it('should throw error when user not found', async () => {
    const nonExistentUpdateInput: UpdateUserInput = {
      id: 999,
      name: 'Non-existent User'
    };

    // Attempt to update non-existent user
    await expect(updateUser(nonExistentUpdateInput))
      .rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle department updates correctly', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();
    
    const userId = createResult[0].id;
    const deptUpdateInput: UpdateUserInput = {
      id: userId,
      department: 'Human Resources'
    };

    // Update only department
    const result = await updateUser(deptUpdateInput);

    // Verify department was updated
    expect(result.department).toEqual('Human Resources');
    expect(result.name).toEqual('John Doe'); // Original value
    expect(result.role).toEqual('regular'); // Original value
  });
});