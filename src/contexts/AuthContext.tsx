
"use client";

import type { User } from "@/types";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { getAllUsers } from "@/lib/firebaseService"; 
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      let storedUser: User | null = null;
      const storedUserString = localStorage.getItem("codecrafter_user"); // Updated localStorage key
      if (storedUserString) {
        try {
          storedUser = JSON.parse(storedUserString);
          setUser(storedUser);
        } catch (error) {
          console.error("Failed to parse stored user:", error);
          localStorage.removeItem("codecrafter_user");
        }
      }

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
        setAllUsers([]); 
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [toast]); 

  const login = (userData: User) => {
    localStorage.setItem("codecrafter_user", JSON.stringify(userData)); // Updated localStorage key
    setUser(userData);
    // If the logged-in user is not in allUsers or has different data, update/add them
    setAllUsers(prevUsers => {
      const userExists = prevUsers.find(u => u.id === userData.id);
      if (userExists) {
        return prevUsers.map(u => u.id === userData.id ? userData : u);
      }
      return [...prevUsers, userData].sort((a,b) => (a.name || "").localeCompare(b.name || ""));
    });
  };

  const logout = () => {
    localStorage.removeItem("codecrafter_user"); // Updated localStorage key
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, allUsers, setAllUsers, login, logout, isLoading }}>
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
