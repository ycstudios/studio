
"use client";

import type { User } from "@/types";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { getAllUsers, getUserById } // Import getUserById if needed for refreshing single user
from "@/lib/firebaseService"; 
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean; 
  updateSingleUserInList: (updatedUser: User) => void; // New function
  refreshUser: (userId: string) => Promise<void>; // New function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAllUsersFromDb = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersFromDb = await getAllUsers();
      setAllUsers(usersFromDb);
    } catch (error) {
      console.error("Failed to fetch all users from Firestore:", error);
      toast({
        title: "Error Loading Users",
        description: "Could not fetch user list from the database. Admin features may be limited.",
        variant: "destructive",
      });
      setAllUsers([]); 
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const storedUserString = localStorage.getItem("codecrafter_user");
      if (storedUserString) {
        try {
          const storedUser = JSON.parse(storedUserString) as User;
          setUser(storedUser);
          // Optionally refresh the stored user from DB to ensure it's up-to-date
          if (storedUser.id) {
             const freshUser = await getUserById(storedUser.id);
             if (freshUser) {
                setUser(freshUser);
                localStorage.setItem("codecrafter_user", JSON.stringify(freshUser));
             } else {
                // User might have been deleted from DB
                localStorage.removeItem("codecrafter_user");
                setUser(null);
             }
          }

        } catch (error) {
          console.error("Failed to parse or refresh stored user:", error);
          localStorage.removeItem("codecrafter_user");
          setUser(null);
        }
      }
      await fetchAllUsersFromDb(); // Fetches all users for admin panel etc.
      // setIsLoading(false); // Already handled in fetchAllUsersFromDb
    };

    loadInitialData();
  }, [fetchAllUsersFromDb]); 

  const login = (userData: User) => {
    localStorage.setItem("codecrafter_user", JSON.stringify(userData)); 
    setUser(userData);
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
    // If the updated user is the currently logged-in user, update them too
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
        }
    } catch (error) {
        console.error(`Failed to refresh user ${userId}:`, error);
        toast({
            title: "Error Refreshing User",
            description: `Could not refresh user data for ${userId}.`,
            variant: "destructive"
        });
    }
  }, [toast]); // updateSingleUserInList is stable due to how setAllUsers works

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
