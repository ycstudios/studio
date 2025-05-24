
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
  portfolioUrls?: string[]; // New: For developer portfolio links
  experienceLevel?: 'Entry' | 'Junior' | 'Mid-level' | 'Senior' | 'Lead' | 'Principal' | ''; // New: For developer experience
  createdAt?: Date | Timestamp; 
  referralCode?: string;
  referredByCode?: string; 
  currentPlan?: string;
  planPrice?: string;
}

export interface Project {
  id: string;
  clientId: string; 
  name: string;
  description: string;
  requiredSkills: string[];
  availability: string; 
  timeZone: string; 
  status: "Open" | "In Progress" | "Completed" | "Cancelled" | "Unknown";
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

