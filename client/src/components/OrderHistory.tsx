import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OrderWithItems, OrderStatus } from '../../../server/src/schema';

interface OrderHistoryProps {
  orders: OrderWithItems[];
  onRefresh: () => void;
}

export function OrderHistory({ orders, onRefresh }: OrderHistoryProps) {
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

  // Sort orders by date (newest first)
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
          <p className="text-sm text-gray-600">
            {orders.length} order{orders.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="border-orange-200"
        >
          🔄 Refresh
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-600">
              Your order history will appear here once you place your first order.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map((order: OrderWithItems) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-orange-50/50 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">
                        Order #{order.id}
                      </CardTitle>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p><strong>Order Date:</strong> {order.order_date.toLocaleString()}</p>
                      <p><strong>Pickup/Delivery:</strong> {order.pickup_or_delivery_time.toLocaleString()}</p>
                      {order.remarks && (
                        <p><strong>Special Instructions:</strong> <em>"{order.remarks}"</em></p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      ${order.total_amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                {/* Order Items */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Items Ordered:</h4>
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <span className="font-medium">{item.menu_item.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {item.menu_item.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium">
                            {item.quantity} × ${item.price_at_order.toFixed(2)} = ${(item.quantity * item.price_at_order).toFixed(2)}
                          </p>
                          {item.price_at_order !== item.menu_item.price && (
                            <p className="text-xs text-gray-500">
                              Current price: ${item.menu_item.price.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Order Timeline/Status Info */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      <p>Last updated: {order.updated_at.toLocaleString()}</p>
                    </div>
                    
                    {/* Status-specific messages */}
                    <div className="text-sm">
                      {order.status === 'pending' && (
                        <p className="text-yellow-700 font-medium">
                          ⏳ Awaiting confirmation from restaurant
                        </p>
                      )}
                      {order.status === 'confirmed' && (
                        <p className="text-blue-700 font-medium">
                          ✅ Your order is being prepared
                        </p>
                      )}
                      {order.status === 'delivered' && (
                        <p className="text-green-700 font-medium">
                          🎉 Order completed - Thanks for your business!
                        </p>
                      )}
                      {order.status === 'cancelled' && (
                        <p className="text-red-700 font-medium">
                          ❌ This order was cancelled
                        </p>
                      )}
                    </div>
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