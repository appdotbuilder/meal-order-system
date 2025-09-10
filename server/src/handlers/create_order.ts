import { db } from '../db';
import { ordersTable, orderItemsTable, menuItemsTable, usersTable } from '../db/schema';
import { type CreateOrderInput, type OrderWithItems } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export const createOrder = async (input: CreateOrderInput): Promise<OrderWithItems> => {
  try {
    // First, verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Get menu items to validate they exist and calculate total
    const menuItemIds = input.order_items.map(item => item.menu_item_id);
    const menuItems = await db.select()
      .from(menuItemsTable)
      .where(inArray(menuItemsTable.id, menuItemIds))
      .execute();

    if (menuItems.length !== menuItemIds.length) {
      throw new Error('One or more menu items not found');
    }

    // Check stock availability and calculate total amount
    let totalAmount = 0;
    const menuItemMap = new Map(menuItems.map(item => [item.id, item]));

    for (const orderItem of input.order_items) {
      const menuItem = menuItemMap.get(orderItem.menu_item_id);
      if (!menuItem) {
        throw new Error(`Menu item with id ${orderItem.menu_item_id} not found`);
      }
      
      if (menuItem.stock_quantity < orderItem.quantity) {
        throw new Error(`Insufficient stock for menu item: ${menuItem.name}. Available: ${menuItem.stock_quantity}, Requested: ${orderItem.quantity}`);
      }

      totalAmount += parseFloat(menuItem.price) * orderItem.quantity;
    }

    // Create the order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: input.user_id,
        pickup_or_delivery_time: input.pickup_or_delivery_time,
        remarks: input.remarks,
        total_amount: totalAmount.toString() // Convert to string for numeric column
      })
      .returning()
      .execute();

    const newOrder = orderResult[0];

    // Create order items and update stock quantities
    const orderItemsData = [];
    for (const orderItem of input.order_items) {
      const menuItem = menuItemMap.get(orderItem.menu_item_id)!;
      
      // Insert order item
      const orderItemResult = await db.insert(orderItemsTable)
        .values({
          order_id: newOrder.id,
          menu_item_id: orderItem.menu_item_id,
          quantity: orderItem.quantity,
          price_at_order: menuItem.price // Already a string from db
        })
        .returning()
        .execute();

      orderItemsData.push(orderItemResult[0]);

      // Update stock quantity
      await db.update(menuItemsTable)
        .set({
          stock_quantity: menuItem.stock_quantity - orderItem.quantity,
          updated_at: new Date()
        })
        .where(eq(menuItemsTable.id, orderItem.menu_item_id))
        .execute();
    }

    // Get updated menu items for the response
    const updatedMenuItems = await db.select()
      .from(menuItemsTable)
      .where(inArray(menuItemsTable.id, menuItemIds))
      .execute();

    const updatedMenuItemMap = new Map(updatedMenuItems.map(item => [item.id, item]));

    // Build the response with proper type conversions
    const orderWithItems: OrderWithItems = {
      ...newOrder,
      total_amount: parseFloat(newOrder.total_amount), // Convert back to number
      user: user[0],
      order_items: orderItemsData.map(orderItem => ({
        ...orderItem,
        price_at_order: parseFloat(orderItem.price_at_order), // Convert back to number
        menu_item: {
          ...updatedMenuItemMap.get(orderItem.menu_item_id)!,
          price: parseFloat(updatedMenuItemMap.get(orderItem.menu_item_id)!.price) // Convert back to number
        }
      }))
    };

    return orderWithItems;
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};