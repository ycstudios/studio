
"use client";

import type { UserRole } from "@/config/site";
import type { User } from "@/types";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { allMockUsers } from "@/lib/mockData"; // Import mock data for initialization

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize with mock users from localStorage or mockData file
    const storedUsersString = localStorage.getItem("devconnect_allUsers");
    if (storedUsersString) {
      setAllUsers(JSON.parse(storedUsersString));
    } else {
      setAllUsers(allMockUsers); // Initialize with mock data if nothing in localStorage
      localStorage.setItem("devconnect_allUsers", JSON.stringify(allMockUsers));
    }

    const storedUserString = localStorage.getItem("devconnect_user");
    if (storedUserString) {
      setUser(JSON.parse(storedUserString));
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    localStorage.setItem("devconnect_user", JSON.stringify(userData));
    setUser(userData);

    // Add or update user in the allUsers list
    setAllUsers(prevAllUsers => {
      const userExists = prevAllUsers.some(u => u.id === userData.id || u.email === userData.email);
      let updatedUsers;
      if (userExists) {
        // Update existing user
        updatedUsers = prevAllUsers.map(u => (u.id === userData.id || u.email === userData.email ? userData : u));
      } else {
        // Add new user
        updatedUsers = [...prevAllUsers, userData];
      }
      localStorage.setItem("devconnect_allUsers", JSON.stringify(updatedUsers));
      return updatedUsers;
    });
  };

  const logout = () => {
    localStorage.removeItem("devconnect_user");
    setUser(null);
    // Note: We are not clearing allUsers on logout, so admin can still see them if they log back in.
    // To clear all users on logout and revert to initial mock data:
    // setAllUsers(allMockUsers);
    // localStorage.setItem("devconnect_allUsers", JSON.stringify(allMockUsers));
  };

  return (
    <AuthContext.Provider value={{ user, allUsers, login, logout, isLoading }}>
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
