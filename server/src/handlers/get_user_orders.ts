import { db } from '../db';
import { ordersTable, usersTable, orderItemsTable, menuItemsTable } from '../db/schema';
import { type GetUserOrdersInput, type OrderWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserOrders = async (input: GetUserOrdersInput): Promise<OrderWithItems[]> => {
  try {
    // Query orders with all related data using joins
    const results = await db.select()
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.user_id, usersTable.id))
      .innerJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .innerJoin(menuItemsTable, eq(orderItemsTable.menu_item_id, menuItemsTable.id))
      .where(eq(ordersTable.user_id, input.user_id))
      .execute();

    // Group results by order ID to handle multiple order items per order
    const ordersMap = new Map<number, OrderWithItems>();

    for (const result of results) {
      const orderId = result.orders.id;
      
      if (!ordersMap.has(orderId)) {
        // Create new order entry with converted numeric fields
        ordersMap.set(orderId, {
          id: result.orders.id,
          user_id: result.orders.user_id,
          order_date: result.orders.order_date,
          status: result.orders.status,
          pickup_or_delivery_time: result.orders.pickup_or_delivery_time,
          remarks: result.orders.remarks,
          total_amount: parseFloat(result.orders.total_amount), // Convert numeric to number
          created_at: result.orders.created_at,
          updated_at: result.orders.updated_at,
          user: {
            id: result.users.id,
            name: result.users.name,
            contact_number: result.users.contact_number,
            department: result.users.department,
            role: result.users.role,
            created_at: result.users.created_at
          },
          order_items: []
        });
      }

      // Add order item with converted numeric fields
      const order = ordersMap.get(orderId)!;
      order.order_items.push({
        id: result.order_items.id,
        order_id: result.order_items.order_id,
        menu_item_id: result.order_items.menu_item_id,
        quantity: result.order_items.quantity,
        price_at_order: parseFloat(result.order_items.price_at_order), // Convert numeric to number
        created_at: result.order_items.created_at,
        menu_item: {
          id: result.menu_items.id,
          name: result.menu_items.name,
          price: parseFloat(result.menu_items.price), // Convert numeric to number
          description: result.menu_items.description,
          image_url: result.menu_items.image_url,
          category: result.menu_items.category,
          stock_quantity: result.menu_items.stock_quantity,
          created_at: result.menu_items.created_at,
          updated_at: result.menu_items.updated_at
        }
      });
    }

    // Convert map values to array and sort by order date (newest first)
    return Array.from(ordersMap.values()).sort((a, b) => 
      b.order_date.getTime() - a.order_date.getTime()
    );
  } catch (error) {
    console.error('Failed to get user orders:', error);
    throw error;
  }
};