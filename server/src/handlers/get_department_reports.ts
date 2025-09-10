import { db } from '../db';
import { ordersTable, usersTable, orderItemsTable } from '../db/schema';
import { type DepartmentReport } from '../schema';
import { sum, count } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

export const getDepartmentReports = async (): Promise<DepartmentReport[]> => {
  try {
    // First, get aggregated order data by department (orders and total amounts)
    const orderResults = await db
      .select({
        department: usersTable.department,
        total_orders: count(ordersTable.id),
        total_amount: sum(ordersTable.total_amount)
      })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.user_id, usersTable.id))
      .groupBy(usersTable.department)
      .execute();

    // Second, get aggregated quantity data by department
    const quantityResults = await db
      .select({
        department: usersTable.department,
        total_quantity: sum(orderItemsTable.quantity)
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.order_id, ordersTable.id))
      .innerJoin(usersTable, eq(ordersTable.user_id, usersTable.id))
      .groupBy(usersTable.department)
      .execute();

    // Combine the results
    const departmentMap = new Map<string, DepartmentReport>();

    // Process order data
    for (const result of orderResults) {
      departmentMap.set(result.department, {
        department: result.department,
        total_orders: result.total_orders || 0,
        total_quantity: 0,
        total_amount: parseFloat(result.total_amount?.toString() || '0')
      });
    }

    // Process quantity data
    for (const result of quantityResults) {
      const existing = departmentMap.get(result.department);
      if (existing) {
        existing.total_quantity = parseInt(result.total_quantity?.toString() || '0');
      }
    }

    return Array.from(departmentMap.values());
  } catch (error) {
    console.error('Department reports generation failed:', error);
    throw error;
  }
};