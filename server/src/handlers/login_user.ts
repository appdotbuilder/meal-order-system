import { type LoginInput, type User } from '../schema';

export const loginUser = async (input: LoginInput): Promise<User | null> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is authenticating a user by contact number and returning user data.
    return Promise.resolve({
        id: 1,
        name: 'Test User',
        contact_number: input.contact_number,
        department: 'IT',
        role: 'regular',
        created_at: new Date()
    } as User);
};