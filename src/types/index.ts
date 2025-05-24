
import type { Timestamp } from "firebase/firestore"; 

export type UserRole = "client" | "developer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
  createdAt?: Date | Timestamp; // Firestore uses Timestamp, client might use Date
}

export interface Project {
  id: string;
  clientId: string; 
  name: string;
  description: string;
  requiredSkills: string[];
  availability: string; 
  timeZone: string; 
  status: "Open" | "In Progress" | "Completed" | "Cancelled" | "Unknown"; // Added "Unknown" for safety
  createdAt: Date | Timestamp;
}

export interface DeveloperMatch {
  developerId: string; 
  name: string;
  skills: string[];
  timezone: string;
  availability: string;
  matchScore?: number; 
  profileUrl?: string; 
  avatarUrl?: string;
}

// This is the AI flow output schema from match-developers.ts
export interface MatchDevelopersOutput {
  developerMatches: string[]; 
  reasoning: string;
}
