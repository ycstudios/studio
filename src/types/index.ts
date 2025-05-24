
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
  portfolioUrls?: string[];
  experienceLevel?: 'Entry' | 'Junior' | 'Mid-level' | 'Senior' | 'Lead' | 'Principal' | '';
  createdAt?: Date | Timestamp; 
  referralCode?: string;
  referredByCode?: string; 
  currentPlan?: string;
  planPrice?: string;
  isFlagged?: boolean; // New: For user flagging
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

// New: For Admin Activity Logs
export interface AdminActivityLog {
  id?: string; // Firestore document ID
  adminId: string; // ID of the admin who performed the action
  adminName?: string; // Optional: Name of the admin (denormalized for easier display)
  action: string; // e.g., "USER_FLAGGED", "USER_UNFLAGGED", "PROJECT_STATUS_CHANGED"
  targetType: "user" | "project" | "system";
  targetId: string; // ID of the user/project affected
  targetName?: string; // Optional: Name of the user/project (denormalized)
  timestamp: Timestamp;
  details?: Record<string, any>; // Any additional relevant information (e.g., old_status, new_status)
}
