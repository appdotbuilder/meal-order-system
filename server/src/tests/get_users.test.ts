import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUser1: CreateUserInput = {
  name: 'John Doe',
  contact_number: '123-456-7890',
  department: 'Engineering',
  role: 'regular'
};

const testUser2: CreateUserInput = {
  name: 'Jane Smith',
  contact_number: '098-765-4321',
  department: 'Marketing',
  role: 'admin'
};

const testUser3: CreateUserInput = {
  name: 'Bob Johnson',
  contact_number: '555-123-4567',
  department: 'Sales',
  role: 'regular'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users when users exist', async () => {
    // Create test users
    await db.insert(usersTable).values([
      testUser1,
      testUser2,
      testUser3
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify all users are returned
    const names = result.map(user => user.name);
    expect(names).toContain('John Doe');
    expect(names).toContain('Jane Smith');
    expect(names).toContain('Bob Johnson');

    // Verify user properties
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.contact_number).toBeDefined();
      expect(user.department).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return users with correct role types', async () => {
    // Create users with different roles
    await db.insert(usersTable).values([
      testUser1, // regular
      testUser2  // admin
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Find users by name and verify roles
    const regularUser = result.find(user => user.name === 'John Doe');
    const adminUser = result.find(user => user.name === 'Jane Smith');

    expect(regularUser).toBeDefined();
    expect(regularUser?.role).toEqual('regular');
    
    expect(adminUser).toBeDefined();
    expect(adminUser?.role).toEqual('admin');
  });

  it('should return users with unique contact numbers', async () => {
    await db.insert(usersTable).values([
      testUser1,
      testUser2,
      testUser3
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify all contact numbers are unique
    const contactNumbers = result.map(user => user.contact_number);
    const uniqueContactNumbers = [...new Set(contactNumbers)];
    expect(uniqueContactNumbers).toHaveLength(contactNumbers.length);

    // Verify specific contact numbers
    expect(contactNumbers).toContain('123-456-7890');
    expect(contactNumbers).toContain('098-765-4321');
    expect(contactNumbers).toContain('555-123-4567');
  });

  it('should return users from different departments', async () => {
    await db.insert(usersTable).values([
      testUser1, // Engineering
      testUser2, // Marketing
      testUser3  // Sales
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    const departments = result.map(user => user.department);
    expect(departments).toContain('Engineering');
    expect(departments).toContain('Marketing');
    expect(departments).toContain('Sales');
  });

  it('should handle single user correctly', async () => {
    await db.insert(usersTable).values(testUser1).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('John Doe');
    expect(result[0].contact_number).toEqual('123-456-7890');
    expect(result[0].department).toEqual('Engineering');
    expect(result[0].role).toEqual('regular');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });
});