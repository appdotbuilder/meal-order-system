import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { OrderWithItems, OrderStatus } from '../../../server/src/schema';

export function OrderManagement() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const filterInput = statusFilter === 'all' ? undefined : { status: statusFilter };
      const orderList = await trpc.getAllOrders.query(filterInput);
      setOrders(orderList);
      setError(null);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Update order status
  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      setIsLoading(true);
      await trpc.updateOrderStatus.mutate({
        id: orderId,
        status: newStatus
      });
      
      setOrders((prev: OrderWithItems[]) => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updated_at: new Date() }
            : order
        )
      );
      setError(null);
    } catch (error) {
      console.error('Failed to update order status:', error);
      setError('Failed to update order status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pending</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800">✅ Confirmed</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800">🚚 Delivered</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">❌ Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get status options for dropdown
  const getStatusOptions = (currentStatus: OrderStatus) => {
    const allStatuses: OrderStatus[] = ['pending', 'confirmed', 'delivered', 'cancelled'];
    return allStatuses.filter(status => status !== currentStatus);
  };

  // Calculate order summary
  const orderSummary = orders.reduce(
    (acc, order) => {
      acc.total++;
      acc.totalAmount += order.total_amount;
      acc.byStatus[order.status] = (acc.byStatus[order.status] || 0) + 1;
      return acc;
    },
    {
      total: 0,
      totalAmount: 0,
      byStatus: {} as Record<OrderStatus, number>
    }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Order Management</h3>
          <p className="text-sm text-gray-600">Monitor and manage all customer orders</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            onClick={loadOrders}
            variant="outline"
            disabled={isLoading}
            className="border-orange-200"
          >
            🔄 Refresh
          </Button>
          
          <Select value={statusFilter} onValueChange={(value: OrderStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Order Summary Stats */}
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
              {orderSummary.total}
            </div>
            <p className="text-xs text-gray-500">
              ${orderSummary.totalAmount.toFixed(2)} total value
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending
            </CardTitle>
            <div className="text-xl">⏳</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {orderSummary.byStatus.pending || 0}
            </div>
            <p className="text-xs text-gray-500">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Confirmed
            </CardTitle>
            <div className="text-xl">✅</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {orderSummary.byStatus.confirmed || 0}
            </div>
            <p className="text-xs text-gray-500">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Delivered
            </CardTitle>
            <div className="text-xl">🚚</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {orderSummary.byStatus.delivered || 0}
            </div>
            <p className="text-xs text-gray-500">
              Completed
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Orders List */}
      {isLoading && orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === 'all' ? 'No Orders Yet' : `No ${statusFilter} Orders`}
            </h3>
            <p className="text-gray-600">
              {statusFilter === 'all' 
                ? 'Orders will appear here once customers start placing them.'
                : `There are currently no ${statusFilter} orders.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order: OrderWithItems) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-orange-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">
                        Order #{order.id}
                      </CardTitle>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p><strong>Customer:</strong> {order.user.name} ({order.user.department})</p>
                      <p><strong>Contact:</strong> {order.user.contact_number}</p>
                      <p><strong>Order Date:</strong> {order.order_date.toLocaleString()}</p>
                      <p><strong>Pickup/Delivery:</strong> {order.pickup_or_delivery_time.toLocaleString()}</p>
                      {order.remarks && (
                        <p><strong>Remarks:</strong> <em>"{order.remarks}"</em></p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      ${order.total_amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.order_items.length} item(s)
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                {/* Order Items */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Order Items:</h4>
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{item.menu_item.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.menu_item.category}
                          </Badge>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium">
                            {item.quantity} × ${item.price_at_order.toFixed(2)} = ${(item.quantity * item.price_at_order).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Status Update */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Last updated: {order.updated_at.toLocaleString()}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Update Status:</span>
                    <Select
                      value={order.status}
                      onValueChange={(newStatus: OrderStatus) => updateOrderStatus(order.id, newStatus)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={order.status} disabled>
                          {order.status} (current)
                        </SelectItem>
                        {getStatusOptions(order.status).map(status => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}