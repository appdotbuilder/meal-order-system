import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['regular', 'admin']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'delivered', 'cancelled']);

// Departments table
export const departmentsTable = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contact_number: text('contact_number').notNull().unique(),
  department: text('department').notNull(),
  role: userRoleEnum('role').notNull().default('regular'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Menu items table
export const menuItemsTable = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  image_url: text('image_url'),
  category: text('category').notNull(),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  order_date: timestamp('order_date').defaultNow().notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  pickup_or_delivery_time: timestamp('pickup_or_delivery_time').notNull(),
  remarks: text('remarks'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Order items table
export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id),
  menu_item_id: integer('menu_item_id').notNull().references(() => menuItemsTable.id),
  quantity: integer('quantity').notNull(),
  price_at_order: numeric('price_at_order', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  orders: many(ordersTable),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [ordersTable.user_id],
    references: [usersTable.id],
  }),
  order_items: many(orderItemsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id],
  }),
  menu_item: one(menuItemsTable, {
    fields: [orderItemsTable.menu_item_id],
    references: [menuItemsTable.id],
  }),
}));

export const menuItemsRelations = relations(menuItemsTable, ({ many }) => ({
  order_items: many(orderItemsTable),
}));

// TypeScript types for the table schemas
export type Department = typeof departmentsTable.$inferSelect;
export type NewDepartment = typeof departmentsTable.$inferInsert;

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type MenuItem = typeof menuItemsTable.$inferSelect;
export type NewMenuItem = typeof menuItemsTable.$inferInsert;

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  departments: departmentsTable,
  users: usersTable, 
  menuItems: menuItemsTable,
  orders: ordersTable,
  orderItems: orderItemsTable
};