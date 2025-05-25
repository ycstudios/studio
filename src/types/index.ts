
// src/types/index.ts
import type { Timestamp } from "firebase/firestore";

export type UserRole = "client" | "developer" | "admin";
export type AccountStatus = 'active' | 'pending_approval' | 'suspended' | 'rejected';
export type ProjectStatus = "Open" | "In Progress" | "Completed" | "Cancelled" | "Unknown";
export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
  experienceLevel?: 'Entry' | 'Junior' | 'Mid-level' | 'Senior' | 'Lead' | 'Principal' | '';
  hourlyRate?: number;
  portfolioUrls?: string[];
  resumeFileUrl?: string;
  resumeFileName?: string;
  pastProjects?: string;
  createdAt?: Date | Timestamp;
  referralCode?: string;
  referredByCode?: string;
  currentPlan?: string;
  planPrice?: string;
  isFlagged?: boolean;
  accountStatus: AccountStatus;
}

export interface Project {
  id: string;
  clientId: string;
  name:string;
  description: string;
  requiredSkills: string[];
  availability: string;
  timeZone: string;
  status: ProjectStatus;
  createdAt: Date | Timestamp;
  assignedDeveloperId?: string;
  assignedDeveloperName?: string;
}

export interface ProjectApplication {
  id: string; // Firestore document ID
  projectId: string;
  projectName: string; // Denormalized
  developerId: string;
  developerName: string; // Denormalized
  developerEmail: string; // Denormalized
  status: ApplicationStatus;
  appliedAt: Timestamp;
  messageToClient?: string; // Optional message from developer
  clientNotifiedOfNewApplication?: boolean;
  developerNotifiedOfStatus?: boolean;
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
  matchQuality?: "Strong Fit" | "Moderate Fit" | "Good Fit";
}

// This is the AI flow output schema from match-developers.ts
export interface MatchDevelopersOutput {
  developerMatches: string[];
  reasoning: string;
}

// New: For Admin Activity Logs
export interface AdminActivityLog {
  id?: string; // Firestore document ID
  adminId: string; // ID of the admin who performed the action (or system/client ID for app events)
  adminName?: string; // Optional: Name of the admin/user (denormalized for easier display)
  action: string; // e.g., "USER_FLAGGED", "PROJECT_APPLICATION_ACCEPTED", "PROJECT_APPLICATION_REJECTED"
  targetType: "user" | "project" | "system" | "quick_request" | "project_application";
  targetId: string; // ID of the user/project/application affected
  targetName?: string; // Optional: Name of the user/project/application (denormalized)
  timestamp: Timestamp;
  details?: Record<string, any>; // Any additional relevant information
}

// For Quick Service Request Form
export type BudgetRange = '' | '$500-$1k' | '$1k-$2.5k' | '$2.5k-$5k' | '$5k-$10k' | '$10k+';
export type UrgencyLevel = '' | 'Low' | 'Medium' | 'High' | 'Critical';

export interface QuickServiceRequestData {
  name: string;
  email: string;
  description: string;
  budget?: BudgetRange;
  urgency?: UrgencyLevel;
}
