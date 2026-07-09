/**
 * User Context
 * Provides authentication state and user information
 */

import {
  createContext,
  useState,
  useEffect,
  useContext,
  type ReactNode,
} from 'react';
import { checkAuth } from '@/services/api/config';
import logger from '@/utils/logger';

/** User info */
export interface User {
  id?: string;
  name?: string;
  email?: string;
  broker?: string;
}

/** User context value */
export interface UserContextValue {
  isAuthenticated: boolean | null;
  setIsAuthenticated: (auth: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const isAuth = await checkAuth();
        setIsAuthenticated(isAuth);
      } catch (error) {
        logger.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
    };
    verifyAuth();
  }, []);

  return (
    <UserContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, user, setUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext;
