import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Department, CreateDepartmentInput, UpdateDepartmentInput } from '../../../server/src/schema';

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for creating departments
  const [createForm, setCreateForm] = useState<CreateDepartmentInput>({
    name: ''
  });

  // Form state for editing departments
  const [editForm, setEditForm] = useState<CreateDepartmentInput>({
    name: ''
  });

  // Load departments
  const loadDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      const deps = await trpc.getDepartments.query();
      setDepartments(deps);
      setError(null);
    } catch (error) {
      console.error('Failed to load departments:', error);
      setError('Failed to load departments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Handle create department
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setError('Please enter a department name.');
      return;
    }

    try {
      setIsLoading(true);
      const newDepartment = await trpc.createDepartment.mutate(createForm);
      setDepartments((prev: Department[]) => [...prev, newDepartment]);
      setCreateForm({ name: '' });
      setIsCreateDialogOpen(false);
      setError(null);
    } catch (error) {
      console.error('Failed to create department:', error);
      setError('Failed to create department. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle update department
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDepartment || !editForm.name.trim()) {
      setError('Please enter a department name.');
      return;
    }

    try {
      setIsLoading(true);
      const updateData: UpdateDepartmentInput = {
        id: editingDepartment.id,
        name: editForm.name
      };
      const updatedDepartment = await trpc.updateDepartment.mutate(updateData);
      setDepartments((prev: Department[]) => 
        prev.map(dept => dept.id === editingDepartment.id ? updatedDepartment : dept)
      );
      setEditingDepartment(null);
      setIsEditDialogOpen(false);
      setError(null);
    } catch (error) {
      console.error('Failed to update department:', error);
      setError('Failed to update department. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete department
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) return;

    try {
      setIsLoading(true);
      await trpc.deleteDepartment.mutate({ id });
      setDepartments((prev: Department[]) => prev.filter(dept => dept.id !== id));
      setError(null);
    } catch (error) {
      console.error('Failed to delete department:', error);
      setError('Failed to delete department. It may be in use by existing users.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing
  const startEdit = (department: Department) => {
    setEditingDepartment(department);
    setEditForm({ name: department.name });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Department Management</h3>
          <p className="text-sm text-gray-600">Manage organizational departments for user assignments</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              ➕ Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <Input
                  value={createForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateDepartmentInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Human Resources, Information Technology"
                  required
                  autoFocus
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
                  {isLoading ? 'Creating...' : 'Create Department'}
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

      {/* Departments List */}
      {isLoading && departments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Loading departments...
        </div>
      ) : departments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-4xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Departments Yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first department to organize users effectively.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((department: Department) => (
            <Card key={department.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🏢</div>
                    <div>
                      <CardTitle className="text-lg">{department.name}</CardTitle>
                      <p className="text-sm text-gray-500">
                        Created {department.created_at.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex space-x-2">
                  <Button
                    onClick={() => startEdit(department)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(department.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={isLoading}
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
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          {editingDepartment && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <Input
                  value={editForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: CreateDepartmentInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingDepartment(null);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Department'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}