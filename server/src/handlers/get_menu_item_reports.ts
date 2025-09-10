import { db } from '../db';
import { menuItemsTable, orderItemsTable, ordersTable } from '../db/schema';
import { type MenuItemReport } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const getMenuItemReports = async (): Promise<MenuItemReport[]> => {
  try {
    // Query to get aggregated menu item reports
    // Join order_items with menu_items and orders to get complete data
    const results = await db
      .select({
        menu_item_id: menuItemsTable.id,
        menu_item_name: menuItemsTable.name,
        total_orders: sql<number>`count(distinct ${orderItemsTable.order_id})`.as('total_orders'),
        total_quantity: sql<number>`sum(${orderItemsTable.quantity})`.as('total_quantity'),
        total_amount: sql<string>`sum(${orderItemsTable.quantity} * ${orderItemsTable.price_at_order})`.as('total_amount')
      })
      .from(menuItemsTable)
      .innerJoin(orderItemsTable, eq(menuItemsTable.id, orderItemsTable.menu_item_id))
      .innerJoin(ordersTable, eq(orderItemsTable.order_id, ordersTable.id))
      .groupBy(menuItemsTable.id, menuItemsTable.name)
      .orderBy(sql`sum(${orderItemsTable.quantity} * ${orderItemsTable.price_at_order}) desc`)
      .execute();

    // Convert numeric fields and ensure proper types
    return results.map(result => ({
      menu_item_id: result.menu_item_id,
      menu_item_name: result.menu_item_name,
      total_orders: Number(result.total_orders),
      total_quantity: Number(result.total_quantity),
      total_amount: parseFloat(result.total_amount)
    }));
  } catch (error) {
    console.error('Menu item reports generation failed:', error);
    throw error;
  }
};