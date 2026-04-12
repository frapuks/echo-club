import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import type { UserProfile } from "../types/user";
import {
  login as loginService,
  register as registerService,
  logout as logoutService,
} from "../services/auth.service";
import {
  joinClub as joinClubService,
  createClub as createClubService,
} from "../services/club.service";

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  clubName: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  joinClub: (code: string) => Promise<void>;
  createClub: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (profileDoc.exists()) {
          const profile = profileDoc.data() as UserProfile;
          setUserProfile(profile);

          if (profile.clubId) {
            const clubDoc = await getDoc(doc(db, "clubs", profile.clubId));
            setClubName(clubDoc.exists() ? (clubDoc.data().name as string) : null);
          } else {
            setClubName(null);
          }
        } else {
          setUserProfile(null);
          setClubName(null);
        }
      } else {
        setUserProfile(null);
        setClubName(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await loginService(email, password);
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    await registerService(data);
  };

  const logout = async () => {
    await logoutService();
  };

  const joinClub = async (code: string) => {
    if (!user) throw new Error("Not authenticated");
    await joinClubService(user.uid, code);
    await refreshProfile();
  };

  const createClub = async (name: string) => {
    if (!user) throw new Error("Not authenticated");
    await createClubService(user.uid, name);
    await refreshProfile();
  };

  const refreshProfile = async () => {
    if (user) {
      const profileDoc = await getDoc(doc(db, "users", user.uid));
      if (profileDoc.exists()) {
        const profile = profileDoc.data() as UserProfile;
        setUserProfile(profile);

        if (profile.clubId) {
          const clubDoc = await getDoc(doc(db, "clubs", profile.clubId));
          setClubName(clubDoc.exists() ? (clubDoc.data().name as string) : null);
        } else {
          setClubName(null);
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, userProfile, clubName, loading, login, register, logout, refreshProfile, joinClub, createClub }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
