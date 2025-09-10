import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, LoginInput, CreateUserInput } from '../../server/src/schema';

// Import components
import { AdminDashboard } from '@/components/AdminDashboard';
import { UserDashboard } from '@/components/UserDashboard';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Login form state
  const [loginData, setLoginData] = useState<LoginInput>({
    contact_number: ''
  });
  
  // Registration form state
  const [registerData, setRegisterData] = useState<CreateUserInput>({
    name: '',
    contact_number: '',
    department: '',
    role: 'regular'
  });

  // Check for existing user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('meal_ordering_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('meal_ordering_user');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.contact_number.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await trpc.loginUser.mutate(loginData);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('meal_ordering_user', JSON.stringify(user));
        setLoginData({ contact_number: '' });
      } else {
        setError('User not found. Please check your contact number or register first.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.name.trim() || !registerData.contact_number.trim() || !registerData.department.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await trpc.registerUser.mutate(registerData);
      setCurrentUser(user);
      localStorage.setItem('meal_ordering_user', JSON.stringify(user));
      setRegisterData({
        name: '',
        contact_number: '',
        department: '',
        role: 'regular'
      });
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('meal_ordering_user');
    setError(null);
  };

  // Authentication forms
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="text-4xl mb-2">🍽️</div>
              <CardTitle className="text-2xl font-bold text-orange-800">
                Meal Ordering System
              </CardTitle>
              <p className="text-orange-600 text-sm">
                {authMode === 'login' ? 'Welcome back!' : 'Join our community!'}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <Input
                      type="tel"
                      value={loginData.contact_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginData((prev: LoginInput) => ({ 
                          ...prev, 
                          contact_number: e.target.value 
                        }))
                      }
                      placeholder="Enter your contact number"
                      required
                      disabled={isLoading}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={isLoading || !loginData.contact_number.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In 🍴'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <Input
                      value={registerData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: CreateUserInput) => ({ 
                          ...prev, 
                          name: e.target.value 
                        }))
                      }
                      placeholder="Enter your full name"
                      required
                      disabled={isLoading}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <Input
                      type="tel"
                      value={registerData.contact_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: CreateUserInput) => ({ 
                          ...prev, 
                          contact_number: e.target.value 
                        }))
                      }
                      placeholder="Enter your contact number"
                      required
                      disabled={isLoading}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <Input
                      value={registerData.department}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: CreateUserInput) => ({ 
                          ...prev, 
                          department: e.target.value 
                        }))
                      }
                      placeholder="Enter your department"
                      required
                      disabled={isLoading}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={isLoading || !registerData.name.trim() || !registerData.contact_number.trim() || !registerData.department.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isLoading ? 'Creating account...' : 'Create Account 🎉'}
                  </Button>
                </form>
              )}
              
              <div className="text-center pt-4 border-t border-orange-100">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                >
                  {authMode === 'login' 
                    ? "Don't have an account? Register here" 
                    : 'Already have an account? Sign in here'
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main application after authentication
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🍽️</div>
              <div>
                <h1 className="text-xl font-bold text-orange-800">
                  Meal Ordering System
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {currentUser.name}
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-gray-600">
                    {currentUser.department}
                  </p>
                  <Badge 
                    variant={currentUser.role === 'admin' ? 'default' : 'secondary'}
                    className={
                      currentUser.role === 'admin' 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-orange-100 text-orange-800'
                    }
                  >
                    {currentUser.role === 'admin' ? '👑 Admin' : '👤 User'}
                  </Badge>
                </div>
              </div>
              
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser.role === 'admin' ? (
          <AdminDashboard user={currentUser} />
        ) : (
          <UserDashboard user={currentUser} />
        )}
      </main>
    </div>
  );
}

export default App;