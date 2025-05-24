
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
    // Keep isLoading true until all initial data (auth user & all users) is loaded
    // setIsLoading(true); // This is handled by the outer loadInitialData
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
    // finally { setIsLoading(false); } // This is handled by the outer loadInitialData
  }, [toast]);


  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      let initialUser: User | null = null;
      const storedUserString = localStorage.getItem("codecrafter_user");

      if (storedUserString) {
        try {
          const storedUser = JSON.parse(storedUserString) as User;
          if (storedUser.id) {
             const freshUser = await getUserById(storedUser.id);
             if (freshUser) {
                initialUser = freshUser;
                localStorage.setItem("codecrafter_user", JSON.stringify(freshUser));
             } else {
                localStorage.removeItem("codecrafter_user"); // User deleted from DB
             }
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
    localStorage.setItem("codecrafter_user", JSON.stringify(userData)); 
    setUser(userData);
    // Optimistically update allUsers list if the user is new or updated
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
           // If user not found (e.g. deleted), and it's the current auth user, log them out
           if (user && user.id === userId) {
              logout();
              toast({ title: "Session Expired", description: "Your user account could not be found. Please log in again.", variant: "destructive" });
           }
        }
    } catch (error) {
        console.error(`Failed to refresh user ${userId}:`, error);
        toast({
            title: "Error Refreshing User Data",
            description: `Could not refresh user data. Please try again later.`,
            variant: "destructive"
        });
    }
  }, [toast, user]); // updateSingleUserInList is stable

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
