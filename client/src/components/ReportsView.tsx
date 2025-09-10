import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { DepartmentReport, MenuItemReport } from '../../../server/src/schema';

export function ReportsView() {
  const [departmentReports, setDepartmentReports] = useState<DepartmentReport[]>([]);
  const [menuItemReports, setMenuItemReports] = useState<MenuItemReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('departments');

  // Load department reports
  const loadDepartmentReports = useCallback(async () => {
    try {
      const reports = await trpc.getDepartmentReports.query();
      setDepartmentReports(reports);
    } catch (error) {
      console.error('Failed to load department reports:', error);
      setError('Failed to load department reports. Please try again.');
    }
  }, []);

  // Load menu item reports
  const loadMenuItemReports = useCallback(async () => {
    try {
      const reports = await trpc.getMenuItemReports.query();
      setMenuItemReports(reports);
    } catch (error) {
      console.error('Failed to load menu item reports:', error);
      setError('Failed to load menu item reports. Please try again.');
    }
  }, []);

  // Load all reports
  const loadAllReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadDepartmentReports(),
        loadMenuItemReports()
      ]);
    } catch (error) {
      console.error('Failed to load reports:', error);
      setError('Failed to load reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [loadDepartmentReports, loadMenuItemReports]);

  useEffect(() => {
    loadAllReports();
  }, [loadAllReports]);

  // Calculate totals for department reports
  const departmentTotals = departmentReports.reduce(
    (acc, report) => ({
      totalOrders: acc.totalOrders + report.total_orders,
      totalQuantity: acc.totalQuantity + report.total_quantity,
      totalAmount: acc.totalAmount + report.total_amount
    }),
    { totalOrders: 0, totalQuantity: 0, totalAmount: 0 }
  );

  // Calculate totals for menu item reports
  const menuItemTotals = menuItemReports.reduce(
    (acc, report) => ({
      totalOrders: acc.totalOrders + report.total_orders,
      totalQuantity: acc.totalQuantity + report.total_quantity,
      totalAmount: acc.totalAmount + report.total_amount
    }),
    { totalOrders: 0, totalQuantity: 0, totalAmount: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Reports & Analytics</h3>
          <p className="text-sm text-gray-600">Analyze order patterns by department and menu items</p>
        </div>
        
        <Button
          onClick={loadAllReports}
          variant="outline"
          disabled={isLoading}
          className="border-orange-200"
        >
          🔄 Refresh Reports
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Reports Tabs */}
      <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-2 bg-orange-100">
              <TabsTrigger 
                value="departments" 
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                🏢 By Department
              </TabsTrigger>
              <TabsTrigger 
                value="menu-items"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                🍽️ By Menu Item
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-6">
            <TabsContent value="departments" className="mt-0">
              <div className="space-y-6">
                {/* Department Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-blue-700">
                        Total Orders
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-800">
                        {departmentTotals.totalOrders}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-700">
                        Total Quantity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-800">
                        {departmentTotals.totalQuantity}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-orange-50 border-orange-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-orange-700">
                        Total Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-800">
                        ${departmentTotals.totalAmount.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Department Reports Table */}
                {isLoading && departmentReports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading department reports...
                  </div>
                ) : departmentReports.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📊</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Department Data</h4>
                    <p className="text-gray-600">
                      Reports will appear here once orders are placed by different departments.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">
                            Department
                          </th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">
                            Total Orders
                          </th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">
                            Total Quantity
                          </th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">
                            Total Amount
                          </th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">
                            Avg per Order
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {departmentReports
                          .sort((a, b) => b.total_amount - a.total_amount)
                          .map((report, index) => (
                            <tr key={report.department} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-200 px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">🏢</span>
                                  <span className="font-medium">{report.department}</span>
                                </div>
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-right">
                                {report.total_orders}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-right">
                                {report.total_quantity}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-right font-medium">
                                ${report.total_amount.toFixed(2)}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-right text-sm text-gray-600">
                                ${(report.total_amount / report.total_orders).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="menu-items" className="mt-0">
              <div className="space-y-6">
                {/* Menu Items Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-blue-700">
                        Total Orders
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-800">
                        {menuItemTotals.totalOrders}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-700">
                        Items Sold
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-800">
                        {menuItemTotals.totalQuantity}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-orange-50 border-orange-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-orange-700">
                        Total Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-800">
                        ${menuItemTotals.totalAmount.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Menu Item Reports Table */}
                {isLoading && menuItemReports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading menu item reports...
                  </div>
                ) : menuItemReports.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📊</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Menu Item Data</h4>
                    <p className="text-gray-600">
                      Reports will appear here once menu items are ordered.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">
                            Menu Item
                          </th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">
                            Orders
                          </th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">
                            Quantity Sold
                          </th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">
                            Revenue
                          </th>
                          <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">
                            Avg per Order
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {menuItemReports
                          .sort((a, b) => b.total_amount - a.total_amount)
                          .map((report, index) => (
                            <tr key={report.menu_item_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-200 px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">🍽️</span>
                                  <span className="font-medium">{report.menu_item_name}</span>
                                </div>
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-right">
                                {report.total_orders}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-right">
                                {report.total_quantity}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-right font-medium">
                                ${report.total_amount.toFixed(2)}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-right text-sm text-gray-600">
                                {(report.total_quantity / report.total_orders).toFixed(1)} items
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}