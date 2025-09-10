import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid contact number', async () => {
    // Create a test user first
    await db.insert(usersTable)
      .values({
        name: 'John Doe',
        contact_number: '1234567890',
        department: 'Engineering',
        role: 'regular'
      })
      .execute();

    const input: LoginInput = {
      contact_number: '1234567890'
    };

    const result = await loginUser(input);

    // Verify user was found and returned correctly
    expect(result).not.toBeNull();
    expect(result!.name).toEqual('John Doe');
    expect(result!.contact_number).toEqual('1234567890');
    expect(result!.department).toEqual('Engineering');
    expect(result!.role).toEqual('regular');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent contact number', async () => {
    const input: LoginInput = {
      contact_number: '9999999999'
    };

    const result = await loginUser(input);

    expect(result).toBeNull();
  });

  it('should authenticate admin user correctly', async () => {
    // Create an admin user
    await db.insert(usersTable)
      .values({
        name: 'Admin User',
        contact_number: '0987654321',
        department: 'Management',
        role: 'admin'
      })
      .execute();

    const input: LoginInput = {
      contact_number: '0987654321'
    };

    const result = await loginUser(input);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Admin User');
    expect(result!.role).toEqual('admin');
    expect(result!.department).toEqual('Management');
  });

  it('should handle exact contact number match only', async () => {
    // Create a user with specific contact number
    await db.insert(usersTable)
      .values({
        name: 'Test User',
        contact_number: '5551234567',
        department: 'IT',
        role: 'regular'
      })
      .execute();

    // Try with partial match - should return null
    const partialInput: LoginInput = {
      contact_number: '555123'
    };

    const partialResult = await loginUser(partialInput);
    expect(partialResult).toBeNull();

    // Try with exact match - should succeed
    const exactInput: LoginInput = {
      contact_number: '5551234567'
    };

    const exactResult = await loginUser(exactInput);
    expect(exactResult).not.toBeNull();
    expect(exactResult!.name).toEqual('Test User');
  });

  it('should return first user when multiple users exist', async () => {
    // Create multiple users with different contact numbers
    await db.insert(usersTable)
      .values([
        {
          name: 'User One',
          contact_number: '1111111111',
          department: 'Sales',
          role: 'regular'
        },
        {
          name: 'User Two',
          contact_number: '2222222222',
          department: 'Marketing',
          role: 'admin'
        }
      ])
      .execute();

    // Login with first user
    const input1: LoginInput = {
      contact_number: '1111111111'
    };

    const result1 = await loginUser(input1);
    expect(result1).not.toBeNull();
    expect(result1!.name).toEqual('User One');
    expect(result1!.department).toEqual('Sales');
    expect(result1!.role).toEqual('regular');

    // Login with second user
    const input2: LoginInput = {
      contact_number: '2222222222'
    };

    const result2 = await loginUser(input2);
    expect(result2).not.toBeNull();
    expect(result2!.name).toEqual('User Two');
    expect(result2!.department).toEqual('Marketing');
    expect(result2!.role).toEqual('admin');
  });

  it('should handle empty database gracefully', async () => {
    // Don't insert any users
    const input: LoginInput = {
      contact_number: '1234567890'
    };

    const result = await loginUser(input);
    expect(result).toBeNull();
  });
});