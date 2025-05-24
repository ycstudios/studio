
"use client";

import type { User } from "@/types";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { getAllUsers } from "@/lib/firebaseService"; // Import Firestore service
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean; // Indicates loading of current user session AND initial allUsers list
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
      // Load current user from localStorage
      const storedUserString = localStorage.getItem("devconnect_user");
      if (storedUserString) {
        try {
          setUser(JSON.parse(storedUserString));
        } catch (error) {
          console.error("Failed to parse stored user:", error);
          localStorage.removeItem("devconnect_user");
        }
      }

      // Fetch all users from Firestore
      try {
        const usersFromDb = await getAllUsers();
        setAllUsers(usersFromDb);
      } catch (error) {
        console.error("Failed to fetch all users from Firestore:", error);
        toast({
          title: "Error Loading Users",
          description: "Could not fetch user list from the database.",
          variant: "destructive",
        });
        // Set to empty array or handle as appropriate
        setAllUsers([]); 
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [toast]); // Added toast to dependency array

  const login = (userData: User) => {
    localStorage.setItem("devconnect_user", JSON.stringify(userData));
    setUser(userData);
    // Note: allUsers list is primarily managed by the initial fetch and signup.
    // If a user logs in who isn't in the `allUsers` list (e.g. admin user not signed up via form),
    // they won't appear in the admin panel unless fetched/added separately.
    // For now, we assume sign-up is the primary way users get into the `allUsers` list via Firestore.
  };

  const logout = () => {
    localStorage.removeItem("devconnect_user");
    setUser(null);
    // `allUsers` list could be re-fetched or cleared if desired, but for now, it remains.
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
