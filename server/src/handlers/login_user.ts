import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<User | null> => {
  try {
    // Query user by contact number
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.contact_number, input.contact_number))
      .limit(1)
      .execute();

    // Return null if user not found
    if (result.length === 0) {
      return null;
    }

    // Return the user data
    const user = result[0];
    return {
      id: user.id,
      name: user.name,
      contact_number: user.contact_number,
      department: user.department,
      role: user.role,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};