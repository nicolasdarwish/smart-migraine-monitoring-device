import * as React from 'react';
import firebase from 'firebase/compat/app';
import { listenToAuthChanges, signIn, signUp, logOut } from '../services/auth';

interface AuthContextType {
  user: firebase.User | null;
  loading: boolean;
  signIn: typeof signIn;
  signUp: typeof signUp;
  logOut: typeof logOut;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => { throw new Error('Auth not init'); },
  signUp: async () => { throw new Error('Auth not init'); },
  logOut: async () => { throw new Error('Auth not init'); }
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<firebase.User | null>(null);
  const [loading, setLoading] = React.useState(true);

React.useEffect(() => {
  let didResolve = false;

  try {
    const unsubscribe = listenToAuthChanges((u) => {
      didResolve = true;
      setUser(u);
      setLoading(false);
    });

    // ⏱️ Fallback: if Firebase never responds, unblock UI
    const timeout = setTimeout(() => {
      if (!didResolve) {
        console.warn("⚠️ Auth timeout — running in preview/simulation mode");
        setUser(null);
        setLoading(false);
      }
    }, 2000); // 2 seconds is enough

    return () => {
      clearTimeout(timeout);
      unsubscribe?.();
    };

  } catch (err) {
    console.warn("⚠️ Auth unavailable — continuing without login", err);
    setUser(null);
    setLoading(false);
  }
}, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);