import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import { 
  createDepartmentInputSchema,
  updateDepartmentInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  loginInputSchema,
  createMenuItemInputSchema,
  updateMenuItemInputSchema,
  createOrderInputSchema,
  updateOrderStatusInputSchema,
  getUserOrdersInputSchema,
  getOrdersByStatusInputSchema
} from './schema';

// Import all handlers
import { createDepartment } from './handlers/create_department';
import { getDepartments } from './handlers/get_departments';
import { updateDepartment } from './handlers/update_department';
import { deleteDepartment } from './handlers/delete_department';
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createMenuItem } from './handlers/create_menu_item';
import { getMenuItems } from './handlers/get_menu_items';
import { updateMenuItem } from './handlers/update_menu_item';
import { deleteMenuItem } from './handlers/delete_menu_item';
import { createOrder } from './handlers/create_order';
import { getUserOrders } from './handlers/get_user_orders';
import { getAllOrders } from './handlers/get_all_orders';
import { updateOrderStatus } from './handlers/update_order_status';
import { getDepartmentReports } from './handlers/get_department_reports';
import { getMenuItemReports } from './handlers/get_menu_item_reports';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Department management (Admin)
  createDepartment: publicProcedure
    .input(createDepartmentInputSchema)
    .mutation(({ input }) => createDepartment(input)),

  getDepartments: publicProcedure
    .query(() => getDepartments()),

  updateDepartment: publicProcedure
    .input(updateDepartmentInputSchema)
    .mutation(({ input }) => updateDepartment(input)),

  deleteDepartment: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteDepartment(input.id)),

  // User management
  registerUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Menu item management (Admin)
  createMenuItem: publicProcedure
    .input(createMenuItemInputSchema)
    .mutation(({ input }) => createMenuItem(input)),

  getMenuItems: publicProcedure
    .query(() => getMenuItems()),

  updateMenuItem: publicProcedure
    .input(updateMenuItemInputSchema)
    .mutation(({ input }) => updateMenuItem(input)),

  deleteMenuItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteMenuItem(input.id)),

  // Order management
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),

  getUserOrders: publicProcedure
    .input(getUserOrdersInputSchema)
    .query(({ input }) => getUserOrders(input)),

  getAllOrders: publicProcedure
    .input(getOrdersByStatusInputSchema.optional())
    .query(({ input }) => getAllOrders(input)),

  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema)
    .mutation(({ input }) => updateOrderStatus(input)),

  // Reporting (Admin)
  getDepartmentReports: publicProcedure
    .query(() => getDepartmentReports()),

  getMenuItemReports: publicProcedure
    .query(() => getMenuItemReports()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();