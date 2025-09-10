import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['regular', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Department schema
export const departmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.coerce.date()
});
export type Department = z.infer<typeof departmentSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_number: z.string(),
  department: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// Menu item schema
export const menuItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  category: z.string(),
  stock_quantity: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type MenuItem = z.infer<typeof menuItemSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  order_date: z.coerce.date(),
  status: orderStatusSchema,
  pickup_or_delivery_time: z.coerce.date(),
  remarks: z.string().nullable(),
  total_amount: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Order = z.infer<typeof orderSchema>;

// Order item schema
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  menu_item_id: z.number(),
  quantity: z.number().int(),
  price_at_order: z.number(),
  created_at: z.coerce.date()
});
export type OrderItem = z.infer<typeof orderItemSchema>;

// Input schemas for creating records

// Department input schemas
export const createDepartmentInputSchema = z.object({
  name: z.string().min(1, 'Department name is required')
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentInputSchema>;

export const updateDepartmentInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Department name is required').optional()
});
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentInputSchema>;

// User input schemas
export const createUserInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_number: z.string().min(1, 'Contact number is required'),
  department: z.string().min(1, 'Department is required'),
  role: userRoleSchema.default('regular')
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  contact_number: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  role: userRoleSchema.optional()
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// User authentication schemas
export const loginInputSchema = z.object({
  contact_number: z.string().min(1, 'Contact number is required')
});
export type LoginInput = z.infer<typeof loginInputSchema>;

// Menu item input schemas
export const createMenuItemInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().positive('Price must be positive'),
  description: z.string().nullable(),
  image_url: z.string().url().nullable(),
  category: z.string().min(1, 'Category is required'),
  stock_quantity: z.number().int().nonnegative('Stock quantity must be non-negative')
});
export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;

export const updateMenuItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  description: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  category: z.string().min(1).optional(),
  stock_quantity: z.number().int().nonnegative().optional()
});
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>;

// Order input schemas
export const createOrderInputSchema = z.object({
  user_id: z.number(),
  pickup_or_delivery_time: z.coerce.date(),
  remarks: z.string().nullable(),
  order_items: z.array(z.object({
    menu_item_id: z.number(),
    quantity: z.number().int().positive('Quantity must be positive')
  })).min(1, 'At least one order item is required')
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderStatusInputSchema = z.object({
  id: z.number(),
  status: orderStatusSchema
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// Shopping cart schemas
export const cartItemSchema = z.object({
  menu_item_id: z.number(),
  quantity: z.number().int().positive()
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  user_id: z.number(),
  items: z.array(cartItemSchema)
});
export type Cart = z.infer<typeof cartSchema>;

// Reporting schemas
export const departmentReportSchema = z.object({
  department: z.string(),
  total_orders: z.number().int(),
  total_quantity: z.number().int(),
  total_amount: z.number()
});
export type DepartmentReport = z.infer<typeof departmentReportSchema>;

export const menuItemReportSchema = z.object({
  menu_item_id: z.number(),
  menu_item_name: z.string(),
  total_orders: z.number().int(),
  total_quantity: z.number().int(),
  total_amount: z.number()
});
export type MenuItemReport = z.infer<typeof menuItemReportSchema>;

// Query input schemas
export const getUserOrdersInputSchema = z.object({
  user_id: z.number()
});
export type GetUserOrdersInput = z.infer<typeof getUserOrdersInputSchema>;

export const getOrdersByStatusInputSchema = z.object({
  status: orderStatusSchema.optional()
});
export type GetOrdersByStatusInput = z.infer<typeof getOrdersByStatusInputSchema>;

// Order with relations schema
export const orderWithItemsSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  order_date: z.coerce.date(),
  status: orderStatusSchema,
  pickup_or_delivery_time: z.coerce.date(),
  remarks: z.string().nullable(),
  total_amount: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  user: userSchema,
  order_items: z.array(z.object({
    id: z.number(),
    order_id: z.number(),
    menu_item_id: z.number(),
    quantity: z.number().int(),
    price_at_order: z.number(),
    created_at: z.coerce.date(),
    menu_item: menuItemSchema
  }))
});
export type OrderWithItems = z.infer<typeof orderWithItemsSchema>;