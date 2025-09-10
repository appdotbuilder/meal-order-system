import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, MenuItem, OrderWithItems, CartItem } from '../../../server/src/schema';

// Import user components
import { MenuBrowser } from '@/components/MenuBrowser';
import { ShoppingCart } from '@/components/ShoppingCart';
import { OrderHistory } from '@/components/OrderHistory';

interface UserDashboardProps {
  user: User;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState('menu');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [userOrders, setUserOrders] = useState<OrderWithItems[]>([]);


  // Load menu items
  const loadMenuItems = useCallback(async () => {
    try {
      const items = await trpc.getMenuItems.query();
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    }
  }, []);

  // Load user orders
  const loadUserOrders = useCallback(async () => {
    try {
      const orders = await trpc.getUserOrders.query({ user_id: user.id });
      setUserOrders(orders);
    } catch (error) {
      console.error('Failed to load user orders:', error);
    }
  }, [user.id]);

  useEffect(() => {
    loadMenuItems();
    loadUserOrders();
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem(`cart_${user.id}`);
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse saved cart:', error);
      }
    }
  }, [loadMenuItems, loadUserOrders, user.id]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`cart_${user.id}`, JSON.stringify(cartItems));
  }, [cartItems, user.id]);

  const addToCart = (menuItemId: number, quantity: number = 1) => {
    setCartItems((prev: CartItem[]) => {
      const existingItem = prev.find(item => item.menu_item_id === menuItemId);
      if (existingItem) {
        return prev.map(item =>
          item.menu_item_id === menuItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prev, { menu_item_id: menuItemId, quantity }];
      }
    });
  };

  const updateCartItem = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev: CartItem[]) => 
        prev.filter(item => item.menu_item_id !== menuItemId)
      );
    } else {
      setCartItems((prev: CartItem[]) =>
        prev.map(item =>
          item.menu_item_id === menuItemId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const removeFromCart = (menuItemId: number) => {
    setCartItems((prev: CartItem[]) => 
      prev.filter(item => item.menu_item_id !== menuItemId)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const onOrderPlaced = () => {
    clearCart();
    loadUserOrders(); // Refresh order history
    setActiveTab('orders'); // Switch to orders tab
  };

  // Calculate cart summary
  const cartSummary = cartItems.reduce(
    (acc, cartItem) => {
      const menuItem = menuItems.find(item => item.id === cartItem.menu_item_id);
      if (menuItem) {
        acc.totalItems += cartItem.quantity;
        acc.totalAmount += menuItem.price * cartItem.quantity;
      }
      return acc;
    },
    { totalItems: 0, totalAmount: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🍽️</div>
            <div>
              <h2 className="text-2xl font-bold">Welcome, {user.name}!</h2>
              <p className="text-orange-100">
                Ready to order some delicious meals?
              </p>
            </div>
          </div>
          
          {cartItems.length > 0 && (
            <div className="text-right">
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm font-medium">🛒 Cart Summary</p>
                <p className="text-lg font-bold">
                  {cartSummary.totalItems} items • ${cartSummary.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cart Items
            </CardTitle>
            <div className="text-xl">🛒</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {cartSummary.totalItems}
            </div>
            <p className="text-xs text-gray-500">
              Ready to order
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cart Total
            </CardTitle>
            <div className="text-xl">💰</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              ${cartSummary.totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">
              Current order value
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Past Orders
            </CardTitle>
            <div className="text-xl">📦</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {userOrders.length}
            </div>
            <p className="text-xs text-gray-500">
              Order history
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main User Tabs */}
      <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-3 bg-orange-100">
              <TabsTrigger 
                value="menu" 
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                🍽️ Browse Menu
              </TabsTrigger>
              <TabsTrigger 
                value="cart"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white relative"
              >
                🛒 Shopping Cart
                {cartItems.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {cartSummary.totalItems}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="orders"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                📦 My Orders
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-6">
            <TabsContent value="menu" className="mt-0">
              <MenuBrowser 
                menuItems={menuItems}
                onAddToCart={addToCart}
                cartItems={cartItems}
              />
            </TabsContent>

            <TabsContent value="cart" className="mt-0">
              <ShoppingCart
                cartItems={cartItems}
                menuItems={menuItems}
                user={user}
                onUpdateItem={updateCartItem}
                onRemoveItem={removeFromCart}
                onClearCart={clearCart}
                onOrderPlaced={onOrderPlaced}
              />
            </TabsContent>

            <TabsContent value="orders" className="mt-0">
              <OrderHistory 
                orders={userOrders}
                onRefresh={loadUserOrders}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}