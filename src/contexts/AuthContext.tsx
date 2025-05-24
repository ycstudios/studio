
"use client";

import type { User } from "@/types";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { getAllUsers, getUserById }
from "@/lib/firebaseService";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
  updateSingleUserInList: (updatedUser: User) => void;
  refreshUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAllUsersFromDb = useCallback(async () => {
    try {
      const usersFromDb = await getAllUsers();
      setAllUsers(usersFromDb);
    } catch (error) {
      console.error("Failed to fetch all users from Firestore:", error);
      toast({
        title: "Error Loading Users",
        description: "Could not fetch user list from the database. Some admin features may be limited.",
        variant: "destructive",
      });
      setAllUsers([]); // Set to empty on error
    }
  }, [toast]);


  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      let initialUser: User | null = null;
      const storedUserString = localStorage.getItem("codecrafter_user");

      if (storedUserString) {
        try {
          const storedUser = JSON.parse(storedUserString) as User;
          if (storedUser && storedUser.id) {
             const freshUser = await getUserById(storedUser.id);
             if (freshUser) {
                initialUser = freshUser;
                localStorage.setItem("codecrafter_user", JSON.stringify(freshUser));
             } else { // User ID was in localStorage, but user not found in DB (e.g., deleted)
                localStorage.removeItem("codecrafter_user");
                toast({
                  title: "Session Invalid",
                  description: "Your previous session data could not be verified. Please log in again.",
                  variant: "default",
                  duration: 7000,
                });
             }
          } else {
            localStorage.removeItem("codecrafter_user");
          }
        } catch (error) {
          console.error("Failed to parse or refresh stored user:", error);
          localStorage.removeItem("codecrafter_user");
          // Do not toast here, as it might be annoying on every load if localStorage is malformed.
          // Let login be the primary way to establish a new session.
        }
      }
      setUser(initialUser);

      // Fetch all users only if current user is an admin, or consider if allUsers is needed globally.
      // For now, let's assume admin might access it. For production, profile data could be fetched on demand.
      // However, the admin panel relies on this, so we fetch it if admin is potentially logging in.
      await fetchAllUsersFromDb();
      setIsLoading(false);
    };

    loadInitialData();
  }, [fetchAllUsersFromDb, toast]);

  const login = (userData: User) => {
    if (!userData || !userData.id) {
      console.error("Login attempt with invalid or missing user data:", userData);
      toast({ title: "Login Error", description: "User data is incomplete or missing.", variant: "destructive" });
      return;
    }
    localStorage.setItem("codecrafter_user", JSON.stringify(userData));
    setUser(userData);
    
    // Optimistically update allUsers list if the logged-in user is new or updated
    // This is helpful for admin view immediate consistency after their own profile update for instance
    setAllUsers(prevUsers => {
      const userExists = prevUsers.find(u => u.id === userData.id);
      if (userExists) {
        return prevUsers.map(u => u.id === userData.id ? userData : u).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      }
      // Only add if it's a new user not from a general list refresh (less likely here)
      // More importantly, if an admin logs in, their data might be fresher than what's in allUsers from initial load.
      // This doesn't add other users, only ensures the current logged-in user's data in allUsers is fresh.
      return prevUsers.map(u => u.id === userData.id ? userData : u);
    });
  };

  const logout = () => {
    localStorage.removeItem("codecrafter_user");
    setUser(null);
    // Optionally clear allUsers if it's only relevant for an active session
    // setAllUsers([]);
  };

  const updateSingleUserInList = (updatedUser: User) => {
    setAllUsers(prevUsers =>
      prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
               .sort((a,b) => (a.name || "").localeCompare(b.name || ""))
    );
    // If the updated user is the currently logged-in user, update the user state too
    if (user && user.id === updatedUser.id) {
      setUser(updatedUser);
      localStorage.setItem("codecrafter_user", JSON.stringify(updatedUser));
    }
  };

  const refreshUser = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
        const refreshedUser = await getUserById(userId);
        if (refreshedUser) {
            updateSingleUserInList(refreshedUser); // This will also update `user` if it's the current user
        } else {
           // User not found in DB, potentially deleted
           if (user && user.id === userId) { 
              logout(); // Log out the current user
              toast({ title: "Session Expired", description: "Your user account could not be found. Please log in again.", variant: "destructive" });
           }
        }
    } catch (error) {
        console.error(`Failed to refresh user ${userId}:`, error);
        // Avoid toasting for every background refresh error unless critical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast]); // updateSingleUserInList and logout are stable

  return (
    <AuthContext.Provider value={{ user, allUsers, setAllUsers, login, logout, isLoading, updateSingleUserInList, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
