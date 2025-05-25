// src/lib/firebaseService.ts
'use server';
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, Timestamp, where, addDoc, updateDoc, serverTimestamp, deleteField, type FieldValue, limit } from "firebase/firestore";
import { db } from "./firebase"; // Your Firebase app instance
import type { User, Project, AdminActivityLog, AccountStatus } from "@/types";
import {
  sendEmail,
  getWelcomeEmailTemplate,
  getDeveloperApprovedEmailTemplate,
  getDeveloperRejectedEmailTemplate,
  getClientProjectPostedEmailTemplate,
} from "./emailService";

// Collection name constants
const USERS_COLLECTION = "users";
const PROJECTS_COLLECTION = "projects";
const ADMIN_ACTIVITY_LOGS_COLLECTION = "adminActivityLogs";

// Helper to ensure date is constructed correctly from various Firestore timestamp formats
function safeCreateDate(timestamp: any): Date | undefined {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp; // Already a JS Date
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
        const date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
         if (!isNaN(date.getTime())) return date;
    }
    // Attempt to parse if it's a string or number representing a date (less reliable)
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    console.warn("[safeCreateDate] encountered an unknown timestamp format:", timestamp);
    return undefined;
}

const getInitialsForDefaultAvatar = (nameStr?: string) => {
  if (!nameStr) return "U";
  const names = nameStr.split(' ');
  if (names.length > 1 && names[0] && names[names.length - 1]) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return nameStr.substring(0, 2).toUpperCase();
};

interface UserWriteData {
  name: string;
  email: string;
  role: User['role'];
  createdAt: FieldValue;
  bio?: string;
  avatarUrl?: string;
  referralCode?: string;
  referredByCode?: string;
  currentPlan?: string;
  planPrice?: string;
  isFlagged?: boolean;
  accountStatus: AccountStatus;
  skills?: string[];
  experienceLevel?: User["experienceLevel"];
  hourlyRate?: number | FieldValue;
  portfolioUrls?: string[];
  resumeFileUrl?: string | FieldValue;
  resumeFileName?: string | FieldValue;
  pastProjects?: string | FieldValue;
}


export async function addUser(
  userData: Omit<User, 'id' | 'createdAt' | 'referralCode' | 'currentPlan' | 'planPrice' | 'isFlagged' | 'accountStatus' | 'avatarUrl' | 'bio'> & { id?: string, referredByCode?: string }
): Promise<User> {
  console.log("[firebaseService addUser] Received userData:", JSON.stringify(userData, null, 2));

  if (!db) {
    console.error("[firebaseService addUser] Firestore is not initialized!");
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }

  const lowercasedEmail = userData.email.toLowerCase();

  const existingUser = await getUserByEmail(lowercasedEmail);
  if (existingUser) {
    throw new Error("Email already in use. Please try a different email or log in.");
  }

  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id;
  const generatedReferralCode = `CODECRAFT_${userId.substring(0, 8).toUpperCase()}`;
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random&size=100`;

  // Start with a base object containing common fields
  // Use a more flexible type for construction, then cast if needed or ensure type safety
  const documentToWrite: { [key: string]: any } = {
    name: userData.name,
    email: lowercasedEmail,
    role: userData.role,
    createdAt: serverTimestamp(),
    bio: `New ${userData.role} on CodeCrafter.`, // Default bio
    avatarUrl: defaultAvatar,
    referralCode: generatedReferralCode,
    currentPlan: "Free Tier",
    planPrice: "$0/month",
    isFlagged: false,
    accountStatus: userData.role === 'developer' ? "pending_approval" : "active",
  };

  // Add referredByCode if it exists and is not empty
  if (userData.referredByCode && userData.referredByCode.trim() !== "") {
    documentToWrite.referredByCode = userData.referredByCode.trim();
  }

  // Add developer-specific fields only if the role is 'developer'
  if (userData.role === 'developer') {
    // Skills: Zod schema in SignupForm ensures values.skills is a non-empty string for developers.
    // skillsArray in SignupForm parses this. userData.skills should be a string[] here.
    documentToWrite.skills = userData.skills || []; // Default to empty array if it somehow became undefined (shouldn't with Zod)

    // ExperienceLevel: Zod ensures values.experienceLevel is a non-empty string for developers.
    documentToWrite.experienceLevel = userData.experienceLevel || ''; // Default to empty string

    // PortfolioUrls: Zod ensures values.portfolioUrls is a non-empty string with valid URLs for developers.
    // portfolioUrlsArray in SignupForm parses this. userData.portfolioUrls should be a string[] here.
    documentToWrite.portfolioUrls = userData.portfolioUrls || []; // Default to empty array

    // PastProjects: Zod ensures values.pastProjects is a non-empty string for developers.
    if (userData.pastProjects && userData.pastProjects.trim() !== "") {
        documentToWrite.pastProjects = userData.pastProjects.trim();
    } else {
        // This case should be caught by Zod, but as a fallback.
        documentToWrite.pastProjects = ""; // Store empty string, Firestore allows this.
    }

    // ResumeFileUrl: Zod ensures values.resumeFileUrl is a non-empty string (valid URL) for developers.
    if (userData.resumeFileUrl && userData.resumeFileUrl.trim() !== "") {
        documentToWrite.resumeFileUrl = userData.resumeFileUrl.trim();
    } // If empty or undefined, field is not added

    // ResumeFileName: Optional.
    if (userData.resumeFileName && userData.resumeFileName.trim() !== "") {
        documentToWrite.resumeFileName = userData.resumeFileName.trim();
    } // If empty or undefined, field is not added

    // HourlyRate: Optional number.
    if (userData.hourlyRate !== undefined && userData.hourlyRate !== null && !isNaN(userData.hourlyRate)) {
        documentToWrite.hourlyRate = Number(userData.hourlyRate);
    } // If undefined, null, or NaN, field is not added
  }

  console.log("[firebaseService addUser] documentToWrite before setDoc:", JSON.stringify(documentToWrite, null, 2));

  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), documentToWrite as UserWriteData); // Cast here if documentToWrite matches UserWriteData

    // Send welcome email
    try {
      const welcomeEmailHtml = await getWelcomeEmailTemplate(documentToWrite.name!, documentToWrite.role!);
      await sendEmail(documentToWrite.email!, "Welcome to CodeCrafter!", welcomeEmailHtml);
      console.log(`[firebaseService addUser] Welcome email triggered for ${documentToWrite.email}.`);
    } catch (emailError) {
      console.error(`[firebaseService addUser] Failed to send welcome email to ${documentToWrite.email} during signup:`, emailError);
      // Do not re-throw; user creation should succeed even if email fails.
    }

    const fetchedUser = await getUserById(userId);
    if (!fetchedUser) {
      console.error(`[firebaseService addUser] User ${userId} was supposedly added but could not be retrieved immediately.`);
      throw new Error(`User ${userId} was added but could not be retrieved.`);
    }
    return fetchedUser;

  } catch (error) {
    console.error("[firebaseService addUser] Error during setDoc or subsequent operations: ", error);
    if (error instanceof Error) {
      if (error.message.includes("Unsupported field value") || error.message.includes("invalid data")) {
        throw new Error(`Could not add user to database due to invalid data: ${error.message}. Document data being sent: ${JSON.stringify(documentToWrite)}`);
      }
      throw new Error(`Could not add user to database: ${error.message}`);
    }
    throw new Error("Could not add user to database due to an unknown error.");
  }
}

// Helper to construct User object from Firestore data
const mapDocToUser = (docSnap: any): User => {
  const data = docSnap.data();
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&size=100`;
  
  const user: User = {
    id: docSnap.id,
    name: data.name || "Unnamed User",
    email: data.email || "No email",
    role: data.role || "client",
    createdAt: safeCreateDate(data.createdAt) || new Date(),
    bio: data.bio || (data.role === 'developer' ? "Skilled developer." : "Client on CodeCrafter."),
    avatarUrl: data.avatarUrl || defaultAvatar,
    referralCode: data.referralCode || undefined,
    referredByCode: data.referredByCode || undefined,
    currentPlan: data.currentPlan || "Free Tier",
    planPrice: data.planPrice || "$0/month",
    isFlagged: data.isFlagged === true,
    accountStatus: data.accountStatus || (data.role === 'developer' ? 'pending_approval' : 'active'),
    
    // Developer specific fields - ensure they default correctly
    skills: data.role === 'developer' ? (Array.isArray(data.skills) ? data.skills : []) : undefined,
    experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
    hourlyRate: data.role === 'developer' ? (typeof data.hourlyRate === 'number' ? data.hourlyRate : undefined) : undefined,
    portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
    resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
    resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
    pastProjects: data.role === 'developer' ? (data.pastProjects || undefined) : undefined,
  };
  return user;
};


export async function getAllUsers(): Promise<User[]> {
  if (!db) {
    console.error("[firebaseService getAllUsers] Firestore is not initialized!");
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  try {
    const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(usersQuery);
    return querySnapshot.docs.map(mapDocToUser);
  } catch (error) {
    console.error("[firebaseService getAllUsers] Error fetching all users from Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch users from database: ${error.message}`);
    }
    throw new Error("Could not fetch users from database due to an unknown error.");
  }
}


export async function getUserById(userId: string): Promise<User | null> {
  if (!db) {
     console.error(`[firebaseService getUserById] Firestore is not initialized attempting to fetch user: ${userId}`);
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!userId) {
    console.warn("[firebaseService getUserById] called with no userId");
    return null;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return mapDocToUser(userDocSnap);
    } else {
      console.warn(`[firebaseService getUserById] User with ID '${userId}' not found in Firestore.`);
      return null;
    }
  } catch (error) {
    console.error(`[firebaseService getUserById] Error fetching user by ID ${userId} from Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch user ${userId} from database: ${error.message}`);
    }
    throw new Error(`Could not fetch user ${userId} from database due to an unknown error.`);
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!db) {
    console.error(`[firebaseService getUserByEmail] Firestore is not initialized attempting to fetch user by email: ${email}`);
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!email) {
    console.warn("[firebaseService getUserByEmail] called with no email");
    return null;
  }

  const lowercasedEmail = email.toLowerCase();

  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where("email", "==", lowercasedEmail),
      limit(1)
    );
    const querySnapshot = await getDocs(usersQuery);

    if (!querySnapshot.empty) {
      const userDocSnap = querySnapshot.docs[0];
      return mapDocToUser(userDocSnap);
    } else {
      return null;
    }
  } catch (error) {
    console.error(`[firebaseService getUserByEmail] Error fetching user by email ${lowercasedEmail} from Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch user by email from database: ${error.message}`);
    }
    throw new Error("Could not fetch user by email from database due to an unknown error.");
  }
}

export async function updateUser(userId: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'email' | 'role' | 'referralCode' | 'currentPlan' | 'planPrice' | 'accountStatus'>>): Promise<void> {
  if (!db) {
    console.error(`[firebaseService updateUser] Firestore is not initialized for user: ${userId}`);
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!userId) {
    throw new Error("User ID is required to update user.");
  }

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    
    // Create a new object for update to avoid mutating original data and to handle FieldValue.delete()
    const updateData: { [key: string]: any } = {};

    // Copy defined properties from data to updateData
    (Object.keys(data) as Array<keyof typeof data>).forEach(key => {
        if (data[key] !== undefined) {
            updateData[key] = data[key];
        }
    });
    
    // Handle specific fields that should be explicitly deleted if empty or null
    if (updateData.hasOwnProperty('bio')) {
      updateData.bio = (updateData.bio === null || updateData.bio === "") ? deleteField() : updateData.bio;
    }
    if (updateData.hasOwnProperty('avatarUrl') && (updateData.avatarUrl === "" || updateData.avatarUrl?.includes('placehold.co') || updateData.avatarUrl?.includes('ui-avatars.com'))) {
        updateData.avatarUrl = deleteField();
    }

    // Fetch current user to determine role for conditional developer field handling
    const currentUserSnap = await getDoc(userDocRef);
    const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() as User : null;
    const effectiveRole = currentUserData?.role;

    if (effectiveRole === 'developer') {
      if (updateData.hasOwnProperty('skills')) {
        updateData.skills = Array.isArray(updateData.skills) && updateData.skills.length > 0 ? updateData.skills : deleteField();
      }
      if (updateData.hasOwnProperty('portfolioUrls')) {
         updateData.portfolioUrls = Array.isArray(updateData.portfolioUrls) && updateData.portfolioUrls.length > 0 ? updateData.portfolioUrls : deleteField();
      }
      if (updateData.hasOwnProperty('experienceLevel')) {
        updateData.experienceLevel = (typeof updateData.experienceLevel === 'string' && updateData.experienceLevel.trim() !== '') ? updateData.experienceLevel : deleteField();
      }
      if (updateData.hasOwnProperty('resumeFileUrl')) {
        updateData.resumeFileUrl = typeof updateData.resumeFileUrl === 'string' && updateData.resumeFileUrl.trim() ? updateData.resumeFileUrl.trim() : deleteField();
      }
      if (updateData.hasOwnProperty('resumeFileName')) {
        updateData.resumeFileName = typeof updateData.resumeFileName === 'string' && updateData.resumeFileName.trim() ? updateData.resumeFileName.trim() : deleteField();
      }
      if (updateData.hasOwnProperty('pastProjects')) {
        updateData.pastProjects = typeof updateData.pastProjects === 'string' && updateData.pastProjects.trim() ? updateData.pastProjects.trim() : deleteField();
      }
      if (updateData.hasOwnProperty('hourlyRate')) {
        const rate = updateData.hourlyRate;
        updateData.hourlyRate = (typeof rate === 'number' && rate >= 0) ? rate : deleteField();
      }
    } else { // If not a developer, ensure these fields are deleted if they were part of the update data
      if (data.hasOwnProperty('skills')) updateData.skills = deleteField();
      if (data.hasOwnProperty('portfolioUrls')) updateData.portfolioUrls = deleteField();
      if (data.hasOwnProperty('experienceLevel')) updateData.experienceLevel = deleteField();
      if (data.hasOwnProperty('hourlyRate')) updateData.hourlyRate = deleteField();
      if (data.hasOwnProperty('resumeFileUrl')) updateData.resumeFileUrl = deleteField();
      if (data.hasOwnProperty('resumeFileName')) updateData.resumeFileName = deleteField();
      if (data.hasOwnProperty('pastProjects')) updateData.pastProjects = deleteField();
    }
    
    if (Object.keys(updateData).length > 0) {
        await updateDoc(userDocRef, updateData);
    } else {
        console.warn(`[firebaseService updateUser] UpdateUser called for ${userId} but no valid fields to update after processing.`);
    }

  } catch (error) {
    console.error(`[firebaseService updateUser] Error updating user ${userId} in Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not update user ${userId} in database: ${error.message}`);
    }
    throw new Error(`Could not update user ${userId} in database due to an unknown error.`);
  }
}

export async function addProject(
  projectData: Omit<Project, 'id' | 'createdAt' | 'status' | 'clientId'>,
  clientId: string,
  clientEmail?: string,
  clientName?: string
): Promise<Project> {
  if (!db) {
    console.error("[firebaseService addProject] Firestore is not initialized!");
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!clientId) {
    throw new Error("Client ID is required to add a project.");
  }

  try {
    const projectWithMetadata = {
      ...projectData,
      clientId,
      status: "Open" as Project["status"],
      createdAt: serverTimestamp(),
    };
    const projectDocRef = await addDoc(collection(db, PROJECTS_COLLECTION), projectWithMetadata);

    const fetchedProject = await getProjectById(projectDocRef.id);
    if (!fetchedProject) {
        console.error(`[firebaseService addProject] Project ${projectDocRef.id} was supposedly added but could not be retrieved.`);
        throw new Error(`Project ${projectDocRef.id} was added but could not be retrieved.`);
    }

    if (clientEmail && clientName) {
      try {
        const projectEmailHtml = await getClientProjectPostedEmailTemplate(clientName, fetchedProject.name, fetchedProject.id);
        await sendEmail(clientEmail, `Your Project "${fetchedProject.name}" is Live!`, projectEmailHtml);
        console.log(`[firebaseService addProject] Project confirmation email triggered for ${clientEmail} for project ${fetchedProject.id}.`);
      } catch (emailError) {
        console.error(`[firebaseService addProject] Failed to send project confirmation email for project ${fetchedProject.id}:`, emailError);
      }
    }
    return fetchedProject;
  } catch (error) {
    console.error("[firebaseService addProject] Error adding project to Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not add project to database: ${error.message}`);
    }
    throw new Error("Could not add project to database due to an unknown error.");
  }
}

export async function getProjectsByClientId(clientId: string): Promise<Project[]> {
  if (!db) {
    console.error(`[firebaseService getProjectsByClientId] Firestore is not initialized for client: ${clientId}`);
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!clientId) {
    console.warn("[firebaseService getProjectsByClientId] called with no clientId");
    return [];
  }
  try {
    const projectsQuery = query(
      collection(db, PROJECTS_COLLECTION),
      where("clientId", "==", clientId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(projectsQuery);
    const projects: Project[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAtDate = safeCreateDate(data.createdAt);
      if (!data.name || !data.clientId || !createdAtDate) {
        console.warn(`[firebaseService getProjectsByClientId] Skipping project ${docSnap.id} due to missing essential fields.`);
        return;
      }
      projects.push({
        id: docSnap.id,
        name: data.name,
        description: data.description || "",
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        availability: data.availability || "Not specified",
        timeZone: data.timeZone || "Not specified",
        status: ["Open", "In Progress", "Completed", "Cancelled", "Unknown"].includes(data.status) ? data.status : "Unknown",
        clientId: data.clientId,
        createdAt: createdAtDate,
      });
    });
    return projects;
  } catch (error) {
    console.error(`[firebaseService getProjectsByClientId] Error fetching projects for client ${clientId}: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch client projects from database: ${error.message}`);
    }
    throw new Error("Could not fetch client projects from database due to an unknown error.");
  }
}


export async function getProjectById(projectId: string): Promise<Project | null> {
  if (!db) {
     console.error(`[firebaseService getProjectById] Firestore is not initialized for project: ${projectId}`);
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!projectId) {
    console.warn("[firebaseService getProjectById] called with no projectId");
    return null;
  }
  try {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectDocSnap = await getDoc(projectDocRef);

    if (projectDocSnap.exists()) {
      const data = projectDocSnap.data();

      if (!data.name || typeof data.name !== 'string') {
        console.warn(`[firebaseService getProjectById] Project ${projectId} missing or invalid 'name'.`);
        return null;
      }
      if (!data.clientId || typeof data.clientId !== 'string') {
        console.warn(`[firebaseService getProjectById] Project ${projectId} missing or invalid 'clientId'.`);
        return null;
      }
      const createdAtDate = safeCreateDate(data.createdAt);
      if (!createdAtDate) {
          console.warn(`[firebaseService getProjectById] Project ${projectId} missing or invalid 'createdAt'.`);
          return null;
      }
      let statusValue = data.status || "Unknown";
       if (!["Open", "In Progress", "Completed", "Cancelled", "Unknown"].includes(statusValue)) {
          console.warn(`[firebaseService getProjectById] Project ${projectId} has invalid 'status': ${statusValue}. Setting to Unknown.`);
          statusValue = "Unknown";
      }

      return {
        id: projectDocSnap.id,
        name: data.name,
        description: data.description || "",
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        availability: data.availability || "Not specified",
        timeZone: data.timeZone || "Not specified",
        status: statusValue as Project["status"],
        clientId: data.clientId,
        createdAt: createdAtDate,
      };
    } else {
      console.warn(`[firebaseService getProjectById] Project with ID '${projectId}' not found in Firestore.`);
      return null;
    }
  } catch (error) {
    console.error(`[firebaseService getProjectById] Error fetching project by ID ${projectId}: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch project ${projectId} from database: ${error.message}`);
    }
    throw new Error(`Could not fetch project ${projectId} from database due to an unknown error.`);
  }
}


export async function getAllProjects(): Promise<Project[]> {
  if (!db) {
    console.error("[firebaseService getAllProjects] Firestore is not initialized!");
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  try {
    const projectsQuery = query(collection(db, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(projectsQuery);
    const projects: Project[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAtDate = safeCreateDate(data.createdAt);
       if (!data.name || !data.clientId || !createdAtDate) {
        console.warn(`[firebaseService getAllProjects] Skipping project ${docSnap.id} due to missing essential fields.`);
        return;
      }
      let statusValue = data.status || "Unknown";
      if (!["Open", "In Progress", "Completed", "Cancelled", "Unknown"].includes(statusValue)) {
         console.warn(`[firebaseService getAllProjects] Project ${docSnap.id} has invalid 'status': ${statusValue}. Setting to Unknown.`);
         statusValue = "Unknown";
     }
      projects.push({
        id: docSnap.id,
        name: data.name,
        description: data.description || "",
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        availability: data.availability || "Not specified",
        timeZone: data.timeZone || "Not specified",
        status: statusValue as Project["status"],
        clientId: data.clientId,
        createdAt: createdAtDate,
      });
    });
    return projects;
  } catch (error) {
    console.error("[firebaseService getAllProjects] Error fetching all projects from Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch all projects from database: ${error.message}`);
    }
    throw new Error("Could not fetch all projects from database due to an unknown error.");
  }
}

export async function getReferredClients(currentUserReferralCode: string): Promise<User[]> {
  if (!db) {
    console.error(`[firebaseService getReferredClients] Firestore is not initialized for referral code: ${currentUserReferralCode}`);
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!currentUserReferralCode) {
    console.warn("[firebaseService getReferredClients] called with no currentUserReferralCode");
    return [];
  }
  try {
    const referredClientsQuery = query(
      collection(db, USERS_COLLECTION),
      where("referredByCode", "==", currentUserReferralCode),
      where("role", "==", "client"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(referredClientsQuery);
    return querySnapshot.docs.map(mapDocToUser);
  } catch (error) {
    console.error(`[firebaseService getReferredClients] Error fetching referred clients for code ${currentUserReferralCode}: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch referred clients: ${error.message}`);
    }
    throw new Error("Could not fetch referred clients due to an unknown error.");
  }
}


export async function toggleUserFlag(userId: string, currentFlagStatus: boolean): Promise<void> {
  if (!db) {
    console.error(`[firebaseService toggleUserFlag] Firestore is not initialized for user: ${userId}`);
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!userId) throw new Error("User ID is required to toggle flag status.");

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, {
      isFlagged: !currentFlagStatus,
    });
  } catch (error) {
    console.error(`[firebaseService toggleUserFlag] Error toggling flag for user ${userId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Could not toggle flag status for user ${userId}: ${error.message}`);
    }
    throw new Error(`Could not toggle flag status for user ${userId} due to an unknown error.`);
  }
}


export async function addAdminActivityLog(logData: Omit<AdminActivityLog, 'id' | 'timestamp'>): Promise<void> {
  if (!db) {
    console.warn("[firebaseService addAdminActivityLog] Firestore is not initialized. Log will not be saved.");
    return; 
  }

  const logEntry: Omit<AdminActivityLog, 'id'> = {
    ...logData,
    timestamp: serverTimestamp() as Timestamp,
  };

  try {
    await addDoc(collection(db, ADMIN_ACTIVITY_LOGS_COLLECTION), logEntry);
  } catch (error) {
    console.error("[firebaseService addAdminActivityLog] Error adding admin activity log:", error);
  }
}


export async function updateUserAccountStatus(userId: string, newStatus: AccountStatus, userEmail: string, userName: string): Promise<void> {
  if (!db) {
    console.error(`[firebaseService updateUserAccountStatus] Firestore is not initialized for user: ${userId}`);
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!userId) throw new Error("User ID is required to update account status.");

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, {
      accountStatus: newStatus,
    });
    console.log(`[firebaseService updateUserAccountStatus] User ${userId} status updated to ${newStatus}. Attempting to send email.`);

    try {
      if (newStatus === "active") {
        const approvedEmailHtml = await getDeveloperApprovedEmailTemplate(userName);
        await sendEmail(userEmail, "Your CodeCrafter Developer Account is Approved!", approvedEmailHtml);
        console.log(`[firebaseService updateUserAccountStatus] Account approval email triggered for ${userEmail}.`);
      } else if (newStatus === "rejected") {
        const rejectedEmailHtml = await getDeveloperRejectedEmailTemplate(userName);
        await sendEmail(userEmail, "Update on Your CodeCrafter Developer Application", rejectedEmailHtml);
        console.log(`[firebaseService updateUserAccountStatus] Account rejection email triggered for ${userEmail}.`);
      }
    } catch (emailError) {
        console.error(`[firebaseService updateUserAccountStatus] Failed to send account status notification email to ${userEmail} for status ${newStatus}:`, emailError);
    }
  } catch (error) {
    console.error(`[firebaseService updateUserAccountStatus] Error updating account status for user ${userId} to ${newStatus}:`, error);
    if (error instanceof Error) {
      throw new Error(`Could not update account status for user ${userId}: ${error.message}`);
    }
    throw new Error(`Could not update account status for user ${userId} due to an unknown error.`);
  }
}
