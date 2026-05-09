import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { jwtDecode } from "jwt-decode";
import {
  getAuthToken,
  removeAuthToken,
  setAuthToken
} from "../services/authStorage";

type DecodedToken = {
  exp: number;
  id?: number;
  email?: string;
  superuser?: number | string;
  role?: string;
};

type AuthContextType = {
  token: string | null;
  user: DecodedToken | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextType | null>(null);

function decodeToken(token: string): DecodedToken | null {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
}

function isTokenValid(token: string) {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return false;

  return decoded.exp > Date.now() / 1000;
}

function isSuperAdminToken(decoded: DecodedToken | null) {
  if (!decoded) return false;

  return Number(decoded.superuser) === 1 || decoded.role === "super_admin";
}

export const AuthProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = async (newToken: string | null) => {
    if (!newToken) {
      await removeAuthToken();
      setToken(null);
      setUser(null);
      setIsSuperAdmin(false);
      return;
    }

    const decoded = decodeToken(newToken);
    if (!decoded || !isTokenValid(newToken)) {
      await removeAuthToken();
      setToken(null);
      setUser(null);
      setIsSuperAdmin(false);
      return;
    }

    await setAuthToken(newToken);
    setToken(newToken);
    setUser(decoded);
    setIsSuperAdmin(isSuperAdminToken(decoded));
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await getAuthToken();

        if (savedToken && isTokenValid(savedToken)) {
          const decoded = decodeToken(savedToken);

          if (decoded) {
            setToken(savedToken);
            setUser(decoded);
            setIsSuperAdmin(isSuperAdminToken(decoded));
          } else {
            await removeAuthToken();
            setToken(null);
            setUser(null);
            setIsSuperAdmin(false);
          }
        } else {
          await removeAuthToken();
          setToken(null);
          setUser(null);
          setIsSuperAdmin(false);
        }
      } catch {
        setToken(null);
        setUser(null);
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (newToken: string) => {
    await syncSession(newToken);
  };

  const logout = async () => {
    await syncSession(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      user,
      isLoggedIn: token !== null,
      isLoading,
      isSuperAdmin,
      login,
      logout
    }),
    [token, user, isLoading, isSuperAdmin]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
