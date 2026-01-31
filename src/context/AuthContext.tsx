import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  users: User[];
  toggleUserStatus: (userId: string) => void;
  deleteUser: (userId: string) => void;
  getUserStats: () => { total: number; active: number; admins: number; todayNew: number };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock admin account
const ADMIN_USER: User = {
  id: 'admin-001',
  username: 'admin',
  email: 'admin@hunteralpha.com',
  role: 'admin',
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
  isActive: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('hunter_users');
    const parsed = saved ? JSON.parse(saved) : [];
    return [ADMIN_USER, ...parsed.filter((u: User) => u.id !== 'admin-001')];
  });

  // Persist users to localStorage
  useEffect(() => {
    localStorage.setItem('hunter_users', JSON.stringify(users));
  }, [users]);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check admin login
    if (email === 'admin@hunteralpha.com' && password === 'admin123') {
      const updatedAdmin = { ...ADMIN_USER, lastLogin: new Date().toISOString() };
      setUser(updatedAdmin);
      return true;
    }
    
    // Check user login
    const foundUser = users.find(u => u.email === email && u.isActive);
    if (foundUser && password.length >= 6) {
      const updatedUser = { ...foundUser, lastLogin: new Date().toISOString() };
      setUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      return true;
    }
    
    return false;
  };

  const register = async (username: string, email: string, _password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if email already exists
    if (users.some(u => u.email === email)) {
      return false;
    }
    
    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      email,
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true,
    };
    
    setUsers(prev => [...prev, newUser]);
    setUser(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const toggleUserStatus = (userId: string) => {
    if (userId === 'admin-001') return; // Cannot disable admin
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    ));
  };

  const deleteUser = (userId: string) => {
    if (userId === 'admin-001') return; // Cannot delete admin
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const getUserStats = () => {
    const today = new Date().toDateString();
    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      admins: users.filter(u => u.role === 'admin').length,
      todayNew: users.filter(u => new Date(u.createdAt).toDateString() === today).length,
    };
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isAdmin,
      login,
      register,
      logout,
      users,
      toggleUserStatus,
      deleteUser,
      getUserStats,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
