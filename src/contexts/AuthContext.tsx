
"use client";

import type { UserRole } from "@/config/site";
import type { User } from "@/types";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
// import { allMockUsers } from "@/lib/mockData"; // No longer initializing with allMockUsers

interface AuthContextType {
  user: User | null;
  allUsers: User[]; // This will be populated from Firestore
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>; // Allow updating allUsers from Firestore fetches
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Starts empty, to be fetched from Firestore
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    // Note: Fetching allUsers from Firestore would typically happen here or in the admin panel itself.
    // For now, allUsers will remain empty until we implement that.
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    localStorage.setItem("devconnect_user", JSON.stringify(userData));
    setUser(userData);
    // Adding the logged-in user to `allUsers` if they aren't there could be a temporary measure
    // But ideally, `allUsers` is purely from a Firestore source of truth for the admin panel.
    // For now, we won't modify allUsers here. Sign-up will need to write to Firestore.
  };

  const logout = () => {
    localStorage.removeItem("devconnect_user");
    setUser(null);
    // `allUsers` list remains as is (which is typically empty or from a previous Firestore fetch)
    // or could be cleared: setAllUsers([]);
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
