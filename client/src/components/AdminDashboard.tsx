import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { User } from '../../../server/src/schema';

// Import admin components
import { MenuManagement } from '@/components/MenuManagement';
import { DepartmentManagement } from '@/components/DepartmentManagement';
import { OrderManagement } from '@/components/OrderManagement';
import { ReportsView } from '@/components/ReportsView';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('menu');
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    activeMenuItems: 0
  });

  // Load dashboard stats
  const loadStats = useCallback(async () => {
    // This would typically fetch real stats from the API
    // For now, using placeholder data since backend handlers are stubs
    setStats({
      totalOrders: 42,
      pendingOrders: 8,
      totalRevenue: 1250.50,
      activeMenuItems: 15
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">👑</div>
          <div>
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            <p className="text-orange-100">
              Welcome back, {user.name}! Here's your system overview.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
            <div className="text-xl">📦</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {stats.totalOrders}
            </div>
            <p className="text-xs text-gray-500">
              All time orders
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Orders
            </CardTitle>
            <div className="text-xl">⏳</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {stats.pendingOrders}
            </div>
            <p className="text-xs text-gray-500">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <div className="text-xl">💰</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              ${stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">
              All time earnings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Menu Items
            </CardTitle>
            <div className="text-xl">🍽️</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {stats.activeMenuItems}
            </div>
            <p className="text-xs text-gray-500">
              Active items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Tabs */}
      <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-4 bg-orange-100">
              <TabsTrigger 
                value="menu" 
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                🍽️ Menu Items
              </TabsTrigger>
              <TabsTrigger 
                value="departments"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                🏢 Departments
              </TabsTrigger>
              <TabsTrigger 
                value="orders"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                📦 Orders
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                📊 Reports
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-6">
            <TabsContent value="menu" className="mt-0">
              <MenuManagement />
            </TabsContent>

            <TabsContent value="departments" className="mt-0">
              <DepartmentManagement />
            </TabsContent>

            <TabsContent value="orders" className="mt-0">
              <OrderManagement />
            </TabsContent>

            <TabsContent value="reports" className="mt-0">
              <ReportsView />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}