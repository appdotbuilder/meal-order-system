import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { MenuItem, CreateMenuItemInput, UpdateMenuItemInput } from '../../../server/src/schema';

export function MenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for creating menu items
  const [createForm, setCreateForm] = useState<CreateMenuItemInput>({
    name: '',
    price: 0,
    description: null,
    image_url: null,
    category: '',
    stock_quantity: 0
  });

  // Form state for editing menu items
  const [editForm, setEditForm] = useState<CreateMenuItemInput>({
    name: '',
    price: 0,
    description: null,
    image_url: null,
    category: '',
    stock_quantity: 0
  });

  // Load menu items
  const loadMenuItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await trpc.getMenuItems.query();
      setMenuItems(items);
      setError(null);
    } catch (error) {
      console.error('Failed to load menu items:', error);
      setError('Failed to load menu items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  // Handle create menu item
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.category.trim() || createForm.price <= 0) {
      setError('Please fill in all required fields with valid values.');
      return;
    }

    try {
      setIsLoading(true);
      const newItem = await trpc.createMenuItem.mutate(createForm);
      setMenuItems((prev: MenuItem[]) => [...prev, newItem]);
      setCreateForm({
        name: '',
        price: 0,
        description: null,
        image_url: null,
        category: '',
        stock_quantity: 0
      });
      setIsCreateDialogOpen(false);
      setError(null);
    } catch (error) {
      console.error('Failed to create menu item:', error);
      setError('Failed to create menu item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle update menu item
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editForm.name?.trim() || !editForm.category?.trim() || (editForm.price !== undefined && editForm.price <= 0)) {
      setError('Please fill in all required fields with valid values.');
      return;
    }

    try {
      setIsLoading(true);
      const updateData: UpdateMenuItemInput = {
        id: editingItem.id,
        ...editForm
      };
      const updatedItem = await trpc.updateMenuItem.mutate(updateData);
      setMenuItems((prev: MenuItem[]) => 
        prev.map(item => item.id === editingItem.id ? updatedItem : item)
      );
      setEditingItem(null);
      setIsEditDialogOpen(false);
      setError(null);
    } catch (error) {
      console.error('Failed to update menu item:', error);
      setError('Failed to update menu item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete menu item
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      setIsLoading(true);
      await trpc.deleteMenuItem.mutate({ id });
      setMenuItems((prev: MenuItem[]) => prev.filter(item => item.id !== id));
      setError(null);
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      setError('Failed to delete menu item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing
  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      price: item.price,
      description: item.description,
      image_url: item.image_url,
      category: item.category,
      stock_quantity: item.stock_quantity
    });
    setIsEditDialogOpen(true);
  };

  // Get stock status badge
  const getStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (quantity < 5) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Menu Items Management</h3>
          <p className="text-sm text-gray-600">Manage your restaurant's menu items, prices, and inventory</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              ➕ Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Menu Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <Input
                  value={createForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateMenuItemInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Grilled Chicken Sandwich"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price * ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={createForm.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateMenuItemInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <Input
                  value={createForm.category}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateMenuItemInput) => ({ ...prev, category: e.target.value }))
                  }
                  placeholder="e.g., Main Course, Beverages, Desserts"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.stock_quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateMenuItemInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={createForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCreateForm((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  placeholder="Brief description of the item"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <Input
                  type="url"
                  value={createForm.image_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      image_url: e.target.value || null 
                    }))
                  }
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Item'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Menu Items Grid */}
      {isLoading && menuItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Loading menu items...
        </div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🍽️</div>
          <p>No menu items yet. Create your first menu item above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item: MenuItem) => (
            <Card key={item.id} className="overflow-hidden">
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
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {item.category}
                    </Badge>
                  </div>
                  <div className="text-right">
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
                  <span className="text-sm text-gray-500">
                    Stock: {item.stock_quantity}
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => startEdit(item)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(item.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <Input
                  value={editForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: CreateMenuItemInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price * ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editForm.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: CreateMenuItemInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <Input
                  value={editForm.category}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: CreateMenuItemInput) => ({ ...prev, category: e.target.value }))
                  }
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.stock_quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: CreateMenuItemInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={editForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditForm((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <Input
                  type="url"
                  value={editForm.image_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      image_url: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingItem(null);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Item'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}