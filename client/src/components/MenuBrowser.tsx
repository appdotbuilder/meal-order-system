import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MenuItem, CartItem } from '../../../server/src/schema';

interface MenuBrowserProps {
  menuItems: MenuItem[];
  onAddToCart: (menuItemId: number, quantity: number) => void;
  cartItems: CartItem[];
}

export function MenuBrowser({ menuItems, onAddToCart, cartItems }: MenuBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name');

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category)));
    return uniqueCategories.sort();
  }, [menuItems]);

  // Filter and sort menu items
  const filteredAndSortedItems = useMemo(() => {
    const filtered = menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const inStock = item.stock_quantity > 0;
      
      return matchesSearch && matchesCategory && inStock;
    });

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'category':
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [menuItems, searchTerm, categoryFilter, sortBy]);

  // Get cart quantity for an item
  const getCartQuantity = (menuItemId: number) => {
    const cartItem = cartItems.find(item => item.menu_item_id === menuItemId);
    return cartItem ? cartItem.quantity : 0;
  };

  // Get stock status badge
  const getStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (quantity < 5) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Stock ({quantity} left)</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="border-orange-200 focus:border-orange-400"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(value: 'name' | 'price' | 'category') => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="price">Sort by Price</SelectItem>
            <SelectItem value="category">Sort by Category</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {filteredAndSortedItems.length} of {menuItems.filter(item => item.stock_quantity > 0).length} available items
        {searchTerm && ` matching "${searchTerm}"`}
        {categoryFilter !== 'all' && ` in ${categoryFilter}`}
      </div>

      {/* Menu Items Grid */}
      {filteredAndSortedItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || categoryFilter !== 'all' ? 'No Items Found' : 'No Menu Items Available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Check back later for delicious meal options!'
              }
            </p>
            {(searchTerm || categoryFilter !== 'all') && (
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
                variant="outline"
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedItems.map((item: MenuItem) => {
            const cartQuantity = getCartQuantity(item.id);
            const canAddMore = cartQuantity < item.stock_quantity;

            return (
              <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {item.image_url && (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xl font-bold text-orange-600">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center mb-4">
                    {getStockBadge(item.stock_quantity)}
                    {cartQuantity > 0 && (
                      <Badge className="bg-orange-100 text-orange-800">
                        🛒 {cartQuantity} in cart
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {cartQuantity === 0 ? (
                      <Button
                        onClick={() => onAddToCart(item.id, 1)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                        disabled={!canAddMore}
                      >
                        🛒 Add to Cart
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => onAddToCart(item.id, 1)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-orange-200 hover:bg-orange-50"
                          disabled={!canAddMore}
                        >
                          ➕ Add More
                        </Button>
                        <div className="flex items-center justify-center px-3 py-1 bg-orange-100 rounded text-orange-800 text-sm font-medium min-w-[3rem]">
                          {cartQuantity}
                        </div>
                      </div>
                    )}
                    
                    {!canAddMore && cartQuantity > 0 && (
                      <p className="text-xs text-center text-amber-600">
                        Maximum quantity reached
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}