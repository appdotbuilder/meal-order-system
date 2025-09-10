import { db } from '../db';
import { ordersTable, usersTable, orderItemsTable, menuItemsTable } from '../db/schema';
import { type GetOrdersByStatusInput, type OrderWithItems } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getAllOrders = async (input?: GetOrdersByStatusInput): Promise<OrderWithItems[]> => {
  try {
    // Build base query with all necessary joins
    const baseQuery = db.select()
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.user_id, usersTable.id))
      .innerJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .innerJoin(menuItemsTable, eq(orderItemsTable.menu_item_id, menuItemsTable.id));

    // Apply status filter conditionally and execute
    const results = input?.status 
      ? await baseQuery
          .where(eq(ordersTable.status, input.status))
          .orderBy(desc(ordersTable.created_at))
          .execute()
      : await baseQuery
          .orderBy(desc(ordersTable.created_at))
          .execute();

    // Group results by order ID to handle multiple order items per order
    const orderMap = new Map<number, OrderWithItems>();

    for (const result of results) {
      const orderId = result.orders.id;
      
      if (!orderMap.has(orderId)) {
        // First time seeing this order - create the order object with converted numeric fields
        orderMap.set(orderId, {
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

      // Add the order item with converted numeric fields
      const order = orderMap.get(orderId)!;
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

    return Array.from(orderMap.values());
  } catch (error) {
    console.error('Get all orders failed:', error);
    throw error;
  }
};