import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { CartItem, MenuItem, User, CreateOrderInput } from '../../../server/src/schema';

interface ShoppingCartProps {
  cartItems: CartItem[];
  menuItems: MenuItem[];
  user: User;
  onUpdateItem: (menuItemId: number, quantity: number) => void;
  onRemoveItem: (menuItemId: number) => void;
  onClearCart: () => void;
  onOrderPlaced: () => void;
}

export function ShoppingCart({ 
  cartItems, 
  menuItems, 
  user,
  onUpdateItem, 
  onRemoveItem, 
  onClearCart,
  onOrderPlaced
}: ShoppingCartProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({
    pickup_or_delivery_time: '',
    remarks: ''
  });

  // Get cart items with menu details
  const cartWithDetails = cartItems.map(cartItem => {
    const menuItem = menuItems.find(item => item.id === cartItem.menu_item_id);
    return {
      ...cartItem,
      menuItem
    };
  }).filter(item => item.menuItem); // Filter out items where menuItem is undefined

  // Calculate totals
  const totals = cartWithDetails.reduce(
    (acc, item) => ({
      totalItems: acc.totalItems + item.quantity,
      totalAmount: acc.totalAmount + (item.menuItem!.price * item.quantity)
    }),
    { totalItems: 0, totalAmount: 0 }
  );

  // Handle quantity change
  const handleQuantityChange = (menuItemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      onRemoveItem(menuItemId);
    } else {
      const menuItem = menuItems.find(item => item.id === menuItemId);
      if (menuItem && newQuantity <= menuItem.stock_quantity) {
        onUpdateItem(menuItemId, newQuantity);
      }
    }
  };

  // Handle checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkoutForm.pickup_or_delivery_time) {
      setError('Please select a pickup/delivery time.');
      return;
    }

    const pickupTime = new Date(checkoutForm.pickup_or_delivery_time);
    const now = new Date();
    
    if (pickupTime <= now) {
      setError('Pickup/delivery time must be in the future.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const orderData: CreateOrderInput = {
        user_id: user.id,
        pickup_or_delivery_time: pickupTime,
        remarks: checkoutForm.remarks || null,
        order_items: cartItems.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity
        }))
      };

      await trpc.createOrder.mutate(orderData);
      
      // Reset checkout form
      setCheckoutForm({
        pickup_or_delivery_time: '',
        remarks: ''
      });
      
      setIsCheckoutOpen(false);
      onOrderPlaced();
      
    } catch (error) {
      console.error('Failed to place order:', error);
      setError('Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get minimum datetime for pickup (30 minutes from now)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  };

  if (cartItems.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <div className="text-4xl mb-4">🛒</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your Cart is Empty</h3>
          <p className="text-gray-600">
            Browse our delicious menu and add some items to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cart Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Your Shopping Cart</h3>
          <p className="text-sm text-gray-600">
            {totals.totalItems} item{totals.totalItems !== 1 ? 's' : ''} • ${totals.totalAmount.toFixed(2)}
          </p>
        </div>
        
        <Button
          onClick={onClearCart}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          🗑️ Clear Cart
        </Button>
      </div>

      {/* Cart Items */}
      <div className="space-y-4">
        {cartWithDetails.map((item) => (
          <Card key={item.menu_item_id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                {/* Item Image */}
                {item.menuItem!.image_url && (
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                    <img 
                      src={item.menuItem!.image_url} 
                      alt={item.menuItem!.name}
                      className="w-full h-full object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {item.menuItem!.name}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {item.menuItem!.category}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Stock: {item.menuItem!.stock_quantity}
                    </span>
                  </div>
                  {item.menuItem!.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {item.menuItem!.description}
                    </p>
                  )}
                </div>
                
                {/* Quantity Controls */}
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleQuantityChange(item.menu_item_id, item.quantity - 1)}
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    −
                  </Button>
                  
                  <Input
                    type="number"
                    min="1"
                    max={item.menuItem!.stock_quantity}
                    value={item.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newQuantity = parseInt(e.target.value) || 1;
                      handleQuantityChange(item.menu_item_id, newQuantity);
                    }}
                    className="w-16 text-center"
                  />
                  
                  <Button
                    onClick={() => handleQuantityChange(item.menu_item_id, item.quantity + 1)}
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    disabled={item.quantity >= item.menuItem!.stock_quantity}
                  >
                    +
                  </Button>
                </div>
                
                {/* Price and Remove */}
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ${(item.menuItem!.price * item.quantity).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${item.menuItem!.price.toFixed(2)} each
                  </p>
                  <Button
                    onClick={() => onRemoveItem(item.menu_item_id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 mt-1"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cart Summary */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-center text-lg font-medium">
            <span>Total ({totals.totalItems} item{totals.totalItems !== 1 ? 's' : ''})</span>
            <span className="text-2xl font-bold text-orange-600">
              ${totals.totalAmount.toFixed(2)}
            </span>
          </div>
          
          <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white text-lg py-6"
                size="lg"
              >
                🚀 Proceed to Checkout
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <span className="text-xl">🍽️</span>
                  <span>Checkout - Order Summary</span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
                  <div className="space-y-2">
                    {cartWithDetails.map(item => (
                      <div key={item.menu_item_id} className="flex justify-between text-sm">
                        <span>{item.menuItem!.name} × {item.quantity}</span>
                        <span>${(item.menuItem!.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 font-medium flex justify-between">
                      <span>Total</span>
                      <span>${totals.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Checkout Form */}
                <form onSubmit={handleCheckout} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup/Delivery Time *
                    </label>
                    <Input
                      type="datetime-local"
                      value={checkoutForm.pickup_or_delivery_time}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCheckoutForm(prev => ({ ...prev, pickup_or_delivery_time: e.target.value }))
                      }
                      min={getMinDateTime()}
                      required
                      className="border-orange-200 focus:border-orange-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be at least 30 minutes from now
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Instructions (Optional)
                    </label>
                    <Textarea
                      value={checkoutForm.remarks}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCheckoutForm(prev => ({ ...prev, remarks: e.target.value }))
                      }
                      placeholder="Any special requests or dietary requirements..."
                      rows={3}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCheckoutOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {isLoading ? 'Placing Order...' : `Place Order - $${totals.totalAmount.toFixed(2)}`}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}