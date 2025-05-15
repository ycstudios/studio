import type { UserRole } from "@/config/site";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string; // Added for potential profile completeness
  skills?: string[]; // Added for developer profiles
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string;
  requiredSkills: string[];
  availability: string;
  timeZone: string;
  status: "open" | "in-progress" | "completed" | "cancelled";
  createdAt: Date;
}

export interface DeveloperMatch {
  developerId: string; // In a real app, this would be an ID
  name: string;
  skills: string[];
  timezone: string;
  availability: string;
  matchScore?: number; // Optional: if AI provides a score
  profileUrl?: string; // Link to developer's profile
  avatarUrl?: string;
}

export interface MatchmakingResult {
  developerMatches: string[]; // As per AI flow output, these are developer profile descriptions
  reasoning: string;
}
