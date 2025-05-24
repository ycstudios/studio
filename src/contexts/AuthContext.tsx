
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
        description: "Could not fetch user list from the database. Some features may be limited.",
        variant: "destructive",
      });
      setAllUsers([]);
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
          if (storedUser && storedUser.id) { // Added check for storedUser itself
             const freshUser = await getUserById(storedUser.id); // This fetches from Firestore
             if (freshUser) {
                initialUser = freshUser; // Use the fresh data from DB
                localStorage.setItem("codecrafter_user", JSON.stringify(freshUser)); // Update localStorage with fresh data
             } else {
                // User was in localStorage but not in DB (e.g., deleted)
                localStorage.removeItem("codecrafter_user");
                // console.warn(`User ${storedUser.id} found in localStorage but not in DB. Cleared from storage.`);
             }
          } else {
            // Malformed or incomplete user in localStorage
            localStorage.removeItem("codecrafter_user");
          }
        } catch (error) {
          console.error("Failed to parse or refresh stored user:", error);
          localStorage.removeItem("codecrafter_user");
        }
      }
      setUser(initialUser);
      await fetchAllUsersFromDb();
      setIsLoading(false);
    };

    loadInitialData();
  }, [fetchAllUsersFromDb]);

  const login = (userData: User) => {
    if (!userData || !userData.id) {
      console.error("Login attempt with invalid or missing user data:", userData);
      toast({ title: "Login Error", description: "User data is incomplete or missing.", variant: "destructive" });
      return;
    }
    localStorage.setItem("codecrafter_user", JSON.stringify(userData));
    setUser(userData);
    // Optimistically update allUsers list for immediate UI feedback
    setAllUsers(prevUsers => {
      const userExists = prevUsers.find(u => u.id === userData.id);
      if (userExists) {
        return prevUsers.map(u => u.id === userData.id ? userData : u).sort((a,b) => (a.name || "").localeCompare(b.name || ""));
      }
      return [...prevUsers, userData].sort((a,b) => (a.name || "").localeCompare(b.name || ""));
    });
  };

  const logout = () => {
    localStorage.removeItem("codecrafter_user");
    setUser(null);
  };

  const updateSingleUserInList = (updatedUser: User) => {
    setAllUsers(prevUsers =>
      prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
               .sort((a,b) => (a.name || "").localeCompare(b.name || ""))
    );
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
            updateSingleUserInList(refreshedUser);
        } else {
           if (user && user.id === userId) {
              logout();
              toast({ title: "Session Expired", description: "Your user account could not be found. Please log in again.", variant: "destructive" });
           }
        }
    } catch (error) {
        console.error(`Failed to refresh user ${userId}:`, error);
        // Do not toast here for background refreshes, can be annoying.
        // Initial load errors are handled in loadInitialData.
    }
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
