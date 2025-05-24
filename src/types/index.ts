
import type { UserRole } from "@/config/site";
import type { Timestamp } from "firebase/firestore"; // Import Timestamp

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
  createdAt?: Date | Timestamp; // Can be Date on client, Timestamp from Firestore
}

export interface Project {
  id: string;
  clientId: string; // User ID of the client who submitted it
  name: string;
  description: string;
  requiredSkills: string[];
  availability: string; // Client's availability/timeline for the project
  timeZone: string; // Client's timezone
  status: "open" | "in-progress" | "completed" | "cancelled";
  createdAt: Date | Timestamp; // Can be Date on client, Timestamp from Firestore
  // Potentially add budget, proposals, matchedDevelopers array later
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

// This remains the same as it's the AI flow output
export interface MatchmakingResult {
  developerMatches: string[]; 
  reasoning: string;
}
