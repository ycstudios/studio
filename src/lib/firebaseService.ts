
// src/lib/firebaseService.ts
'use server';
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, Timestamp, where, addDoc, updateDoc, serverTimestamp, deleteField, type FieldValue, limit, writeBatch } from "firebase/firestore";
import { db } from "./firebase"; // Your Firebase app instance
import type { User, Project, AdminActivityLog, AccountStatus, ProjectApplication, ProjectStatus, ApplicationStatus } from "@/types";
import {
  sendEmail,
  getWelcomeEmailTemplate,
  getDeveloperApprovedEmailTemplate,
  getDeveloperRejectedEmailTemplate,
  getClientProjectPostedEmailTemplate,
  getNewProjectApplicationEmailToClient,
  getApplicationAcceptedEmailToDeveloper,
  getApplicationRejectedEmailToDeveloper,
} from "./emailService";

// Collection name constants
const USERS_COLLECTION = "users";
const PROJECTS_COLLECTION = "projects";
const PROJECT_APPLICATIONS_COLLECTION = "projectApplications"; // No longer exported
const ADMIN_ACTIVITY_LOGS_COLLECTION = "adminActivityLogs";


// Helper to ensure date is constructed correctly from various Firestore timestamp formats
function safeCreateDate(timestamp: any): Date | undefined {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
        try {
            const date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
            if (!isNaN(date.getTime())) return date;
        } catch (e) {
            // console.warn("[firebaseService safeCreateDate] Failed to convert object to Timestamp, then to Date:", e);
        }
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    // console.warn("[firebaseService safeCreateDate] Could not parse timestamp into a valid Date:", timestamp);
    return undefined; // Return undefined if parsing fails, let calling code handle it
}

const getInitialsForDefaultAvatar = (nameStr?: string) => {
  if (!nameStr || typeof nameStr !== 'string' ) return "U";
  const names = nameStr.split(' ');
  if (names.length > 1 && names[0] && names[names.length - 1]) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return nameStr.substring(0, 2).toUpperCase();
};

// Helper to construct User object from Firestore data
const mapDocToUser = (docSnap: any): User => {
  const data = docSnap.data();
  if (!data) {
    console.error(`[firebaseService mapDocToUser] Document data is null/undefined for doc ID: ${docSnap.id}`);
    return {
        id: docSnap.id,
        name: "Error: Missing Data",
        email: "error@example.com",
        role: "client",
        accountStatus: "suspended",
        createdAt: new Date(),
        isFlagged: true,
    };
  }
  const userNameForAvatar = data.name || "User";
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(getInitialsForDefaultAvatar(userNameForAvatar))}&background=random&size=100`;

  const user: User = {
    id: docSnap.id,
    name: data.name || "Unnamed User",
    email: data.email || "No email",
    role: data.role || "client",
    createdAt: safeCreateDate(data.createdAt),
    bio: data.bio || (data.role === 'developer' ? "Skilled developer." : "Client on CodeCrafter."),
    avatarUrl: data.avatarUrl || defaultAvatar,
    referralCode: data.referralCode || undefined,
    referredByCode: data.referredByCode || undefined,
    currentPlan: data.currentPlan || "Free Tier",
    planPrice: data.planPrice || "$0/month",
    isFlagged: data.isFlagged === true,
    accountStatus: data.accountStatus || (data.role === 'developer' ? 'pending_approval' : 'active'),
    // Developer specific fields
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


export async function addUser(
  userData: Omit<User, 'id' | 'createdAt' | 'referralCode' | 'currentPlan' | 'planPrice' | 'isFlagged' | 'accountStatus' | 'avatarUrl' | 'bio'> & { id?: string, referredByCode?: string }
): Promise<User> {
  if (!db) {
    console.error("[firebaseService addUser] Firestore is not initialized! User not added.");
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  // console.log("[firebaseService addUser] Received userData:", JSON.stringify(userData, null, 2));

  const lowercasedEmail = userData.email.toLowerCase();

  const existingUser = await getUserByEmail(lowercasedEmail);
  if (existingUser) {
    throw new Error("Email already in use. Please try a different email or log in.");
  }

  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id;
  const generatedReferralCode = `CODECRAFT_${userId.substring(0, 8).toUpperCase()}`;
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(getInitialsForDefaultAvatar(userData.name))}&background=random&size=100`;
  const defaultBio = userData.role === 'developer' ? "Enthusiastic developer ready to craft some code!" : "Client looking for talented developers.";

  const documentToWrite: { [key: string]: any } = {
    name: userData.name,
    email: lowercasedEmail,
    role: userData.role,
    createdAt: serverTimestamp(),
    bio: defaultBio,
    avatarUrl: defaultAvatar,
    referralCode: generatedReferralCode,
    currentPlan: "Free Tier",
    planPrice: "$0/month",
    isFlagged: false,
    accountStatus: userData.role === 'developer' ? "pending_approval" : "active",
  };

  if (userData.referredByCode && userData.referredByCode.trim() !== "") {
    documentToWrite.referredByCode = userData.referredByCode.trim();
  }

  if (userData.role === 'developer') {
    if (Array.isArray(userData.skills) && userData.skills.length > 0) {
      documentToWrite.skills = userData.skills.filter(s => s && s.trim() !== "");
    }
    if (userData.experienceLevel && userData.experienceLevel.trim() !== "") {
      documentToWrite.experienceLevel = userData.experienceLevel;
    }
    if (Array.isArray(userData.portfolioUrls) && userData.portfolioUrls.length > 0) {
      documentToWrite.portfolioUrls = userData.portfolioUrls.filter(url => url && url.trim() !== "" && (url.startsWith('http://') || url.startsWith('https://')));
    }
    if (userData.pastProjects && userData.pastProjects.trim() !== "") {
      documentToWrite.pastProjects = userData.pastProjects.trim();
    }
    if (userData.resumeFileUrl && userData.resumeFileUrl.trim() !== "") {
      documentToWrite.resumeFileUrl = userData.resumeFileUrl.trim();
    }
    if (userData.resumeFileName && userData.resumeFileName.trim() !== "") {
      documentToWrite.resumeFileName = userData.resumeFileName.trim();
    }
    if (userData.hourlyRate !== undefined && !isNaN(userData.hourlyRate) && Number(userData.hourlyRate) >= 0) {
      documentToWrite.hourlyRate = Number(userData.hourlyRate);
    }
  }
  // console.log("[firebaseService addUser] documentToWrite before setDoc:", JSON.stringify(documentToWrite, (k, v) => v instanceof FieldValue ? "[FieldValue]" : v, 2));

  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), documentToWrite);

    try {
      const welcomeEmailHtml = await getWelcomeEmailTemplate(documentToWrite.name!, documentToWrite.role!);
      await sendEmail(documentToWrite.email!, "Welcome to CodeCrafter!", welcomeEmailHtml);
    } catch (emailError) {
      console.error(`[firebaseService addUser] Failed to send welcome email to ${documentToWrite.email} for user ${userId}:`, emailError);
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

export async function getAllUsers(): Promise<User[]> {
  if (!db) {
    console.error("[firebaseService getAllUsers] Firestore is not initialized! Cannot fetch users.");
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
  if (!userId || typeof userId !== 'string' || userId.trim() === "") {
    // console.warn("[firebaseService getUserById] Called with invalid userId:", userId);
    return null;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return mapDocToUser(userDocSnap);
    } else {
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
  if (!email || typeof email !== 'string' || email.trim() === "") {
    // console.warn("[firebaseService getUserByEmail] Called with invalid email:", email);
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
    const updateData: { [key: string]: any } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim() ? data.name.trim() : deleteField();
    }
    if (data.bio !== undefined) {
      updateData.bio = data.bio.trim() ? data.bio.trim() : deleteField();
    }
    if (data.avatarUrl !== undefined) {
        const trimmedAvatarUrl = data.avatarUrl.trim();
        if (trimmedAvatarUrl && (trimmedAvatarUrl.startsWith('http://') || trimmedAvatarUrl.startsWith('https://'))) {
            updateData.avatarUrl = trimmedAvatarUrl;
        } else if (!trimmedAvatarUrl) { // if cleared
            const currentUserSnap = await getDoc(userDocRef);
            const currentName = currentUserSnap.exists() ? currentUserSnap.data()?.name : "User";
            updateData.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(getInitialsForDefaultAvatar(currentName))}&background=random&size=100`;
        } // if invalid format but not empty, do nothing to avatarUrl
    }
    
    // Developer-specific fields
    const currentUserSnap = await getDoc(userDocRef);
    const effectiveRole = currentUserSnap.exists() ? currentUserSnap.data()?.role : null;

    if (effectiveRole === 'developer') {
      if (data.skills !== undefined) {
        updateData.skills = Array.isArray(data.skills) && data.skills.length > 0 ? data.skills.filter(s => s && s.trim() !== "") : deleteField();
      }
      if (data.experienceLevel !== undefined) {
        updateData.experienceLevel = data.experienceLevel && data.experienceLevel.trim() !== "" ? data.experienceLevel : deleteField();
      }
      if (data.hourlyRate !== undefined) {
        updateData.hourlyRate = (typeof data.hourlyRate === 'number' && data.hourlyRate >= 0) ? data.hourlyRate : deleteField();
      } else if (data.hourlyRate === null) { // Explicitly handle if profile page sends null for clearing
         updateData.hourlyRate = deleteField();
      }
      if (data.portfolioUrls !== undefined) {
        updateData.portfolioUrls = Array.isArray(data.portfolioUrls) && data.portfolioUrls.length > 0 ? data.portfolioUrls.filter(url => url && url.trim() !== "" && (url.startsWith('http://') || url.startsWith('https://'))) : deleteField();
      }
      if (data.resumeFileUrl !== undefined) {
        updateData.resumeFileUrl = data.resumeFileUrl.trim() ? data.resumeFileUrl.trim() : deleteField();
      }
      if (data.resumeFileName !== undefined) {
        updateData.resumeFileName = data.resumeFileName.trim() ? data.resumeFileName.trim() : deleteField();
      }
      if (data.pastProjects !== undefined) {
        updateData.pastProjects = data.pastProjects.trim() ? data.pastProjects.trim() : deleteField();
      }
    } else {
      // If role is not developer, ensure these developer-specific fields are removed.
      updateData.skills = deleteField();
      updateData.experienceLevel = deleteField();
      updateData.hourlyRate = deleteField();
      updateData.portfolioUrls = deleteField();
      updateData.resumeFileUrl = deleteField();
      updateData.resumeFileName = deleteField();
      updateData.pastProjects = deleteField();
    }
    
    if (Object.keys(updateData).length > 0) {
        await updateDoc(userDocRef, updateData);
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
    console.error("[firebaseService addProject] Firestore is not initialized! Project not added.");
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!clientId) {
    throw new Error("Client ID is required to add a project.");
  }

  try {
    const projectWithMetadata: Omit<Project, 'id'> = {
      ...projectData,
      clientId,
      status: "Open" as ProjectStatus,
      createdAt: serverTimestamp() as Timestamp, 
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
    // console.warn("[firebaseService getProjectsByClientId] Called with null or undefined clientId.");
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
        console.warn(`[firebaseService getProjectsByClientId] Project ${docSnap.id} has missing essential fields, skipping.`);
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
        assignedDeveloperId: data.assignedDeveloperId || undefined,
        assignedDeveloperName: data.assignedDeveloperName || undefined,
      });
    });
    return projects;
  } catch (error) {
    console.error(`[firebaseService getProjectsByClientId] Error fetching projects for client ${clientId}: `, error);
    if (error instanceof Error) {
      if (error.message.includes("The query requires an index.")) {
         throw new Error(`Firestore query for client projects failed. It requires a composite index. Please check the Firebase console for a link to create it. Error: ${error.message}`);
      }
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
    // console.warn("[firebaseService getProjectById] Called with null or undefined projectId.");
    return null;
  }
  try {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectDocSnap = await getDoc(projectDocRef);

    if (projectDocSnap.exists()) {
      const data = projectDocSnap.data();
      if (!data.name || typeof data.name !== 'string') { 
        console.warn(`[firebaseService getProjectById] Project ${projectId} missing or invalid 'name'. Returning null.`);
        return null;
      }
      if (!data.clientId || typeof data.clientId !== 'string') { 
        console.warn(`[firebaseService getProjectById] Project ${projectId} missing or invalid 'clientId'. Returning null.`);
        return null;
      }
      const createdAtDate = safeCreateDate(data.createdAt);
      if (!createdAtDate) { 
          console.warn(`[firebaseService getProjectById] Project ${projectId} missing or invalid 'createdAt'. Returning null.`);
          return null;
      }
      let statusValue = data.status || "Unknown";
       if (!["Open", "In Progress", "Completed", "Cancelled", "Unknown"].includes(statusValue)) {
          // console.warn(`[firebaseService getProjectById] Project ${projectId} has invalid status '${statusValue}', defaulting to 'Unknown'.`);
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
        assignedDeveloperId: data.assignedDeveloperId || undefined,
        assignedDeveloperName: data.assignedDeveloperName || undefined,
      };
    } else {
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
    console.error("[firebaseService getAllProjects] Firestore is not initialized! Cannot fetch projects.");
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
        console.warn(`[firebaseService getAllProjects] Project ${docSnap.id} has missing essential fields, skipping.`);
        return;
      }
      let statusValue = data.status || "Unknown";
      if (!["Open", "In Progress", "Completed", "Cancelled", "Unknown"].includes(statusValue)) {
         // console.warn(`[firebaseService getAllProjects] Project ${docSnap.id} has invalid status '${statusValue}', defaulting to 'Unknown'.`);
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
        assignedDeveloperId: data.assignedDeveloperId || undefined,
        assignedDeveloperName: data.assignedDeveloperName || undefined,
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
    // console.warn("[firebaseService getReferredClients] Called with null or undefined currentUserReferralCode.");
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
        if (error.message.includes("The query requires an index.")) {
         throw new Error(`Firestore query for referred clients failed. It requires a composite index. Please check the Firebase console for a link to create it. Error: ${error.message}`);
      }
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
    // console.warn("[firebaseService addAdminActivityLog] Firestore is not initialized! Log entry skipped.");
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

export async function updateUserAccountStatus(userId: string, newStatus: AccountStatus, userEmail: string, userName?: string): Promise<void> {
  if (!db) {
    console.error(`[firebaseService updateUserAccountStatus] Firestore is not initialized for user: ${userId}`);
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!userId) throw new Error("User ID is required to update account status.");

  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const effectiveUserName = userName || "User"; // Fallback if name isn't passed
  
  try {
    await updateDoc(userDocRef, {
      accountStatus: newStatus,
    });

    try {
      if (newStatus === "active") {
        const approvedEmailHtml = await getDeveloperApprovedEmailTemplate(effectiveUserName);
        await sendEmail(userEmail, "Your CodeCrafter Developer Account is Approved!", approvedEmailHtml);
      } else if (newStatus === "rejected") {
        const rejectedEmailHtml = await getDeveloperRejectedEmailTemplate(effectiveUserName);
        await sendEmail(userEmail, "Update on Your CodeCrafter Developer Application", rejectedEmailHtml);
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

// --- Project Application Functions ---

export async function addProjectApplication(
  applicationData: Omit<ProjectApplication, 'id' | 'appliedAt' | 'status'>
): Promise<ProjectApplication> {
  if (!db) {
    console.error("[firebaseService addProjectApplication] Firestore is not initialized! Application not added.");
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }
  if (!applicationData.projectId || !applicationData.developerId) {
    throw new Error("Project ID and Developer ID are required to add an application.");
  }

  try {
    const existingApplications = await getApplicationsByDeveloperForProject(applicationData.developerId, applicationData.projectId);
    if (existingApplications.length > 0) {
      throw new Error("You have already applied for this project.");
    }

    const applicationWithMetadata: Omit<ProjectApplication, 'id'> = {
      ...applicationData,
      status: "pending" as ApplicationStatus,
      appliedAt: serverTimestamp() as Timestamp,
      clientNotifiedOfNewApplication: false,
      developerNotifiedOfStatus: false,
    };
    const appDocRef = await addDoc(collection(db, PROJECT_APPLICATIONS_COLLECTION), applicationWithMetadata);
    
    const project = await getProjectById(applicationData.projectId);
    if (project && project.clientId) {
      const client = await getUserById(project.clientId);
      if (client && client.email && client.name) {
        try {
          const appEmailHtml = await getNewProjectApplicationEmailToClient(client.name, applicationData.developerName, applicationData.projectName, applicationData.projectId);
          await sendEmail(client.email, `New Application for "${applicationData.projectName}"`, appEmailHtml);
          await updateDoc(appDocRef, { clientNotifiedOfNewApplication: true });
        } catch (emailError) {
          console.error(`[firebaseService addProjectApplication] Failed to send application notification email to client ${client.email} for app ${appDocRef.id}:`, emailError);
        }
      }
    }

    const newAppSnap = await getDoc(appDocRef);
    if (!newAppSnap.exists()) {
      console.error(`[firebaseService addProjectApplication] Application ${appDocRef.id} was supposedly added but could not be retrieved.`);
      throw new Error("Failed to retrieve the newly created project application.");
    }
    const data = newAppSnap.data()!;

    return {
      id: newAppSnap.id,
      projectId: data.projectId,
      projectName: data.projectName,
      developerId: data.developerId,
      developerName: data.developerName,
      developerEmail: data.developerEmail,
      status: data.status,
      appliedAt: data.appliedAt, 
      messageToClient: data.messageToClient,
      clientNotifiedOfNewApplication: data.clientNotifiedOfNewApplication === true,
      developerNotifiedOfStatus: data.developerNotifiedOfStatus === true,
    } as ProjectApplication;

  } catch (error) {
    console.error("[firebaseService addProjectApplication] Error adding project application to Firestore: ", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Could not add project application due to an unknown error.");
  }
}

export async function getApplicationsByDeveloperForProject(developerId: string, projectId: string): Promise<ProjectApplication[]> {
  if (!db) {
    console.error(`[firebaseService getApplicationsByDeveloperForProject] Firestore is not initialized for dev ${developerId}, project ${projectId}.`);
    throw new Error("Firestore is not initialized.");
  }
  if (!developerId || !projectId) {
    // console.warn("[firebaseService getApplicationsByDeveloperForProject] Called with missing developerId or projectId.");
    return [];
  }

  try {
    const q = query(
      collection(db, PROJECT_APPLICATIONS_COLLECTION),
      where("developerId", "==", developerId),
      where("projectId", "==", projectId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        appliedAt: data.appliedAt, 
        clientNotifiedOfNewApplication: data.clientNotifiedOfNewApplication === true,
        developerNotifiedOfStatus: data.developerNotifiedOfStatus === true,
      } as ProjectApplication;
    });
  } catch (error) {
    console.error(`[firebaseService getApplicationsByDeveloperForProject] Error fetching applications for dev ${developerId} on project ${projectId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error("Could not fetch developer applications for project.");
  }
}

export async function getApplicationsByProjectId(projectId: string): Promise<ProjectApplication[]> {
  if (!db) {
    console.error(`[firebaseService getApplicationsByProjectId] Firestore is not initialized for project ${projectId}.`);
    throw new Error("Firestore is not initialized.");
  }
  if (!projectId) {
    // console.warn("[firebaseService getApplicationsByProjectId] Called with missing projectId.");
    return [];
  }

  try {
    const q = query(
      collection(db, PROJECT_APPLICATIONS_COLLECTION),
      where("projectId", "==", projectId),
      orderBy("appliedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        appliedAt: data.appliedAt, 
        clientNotifiedOfNewApplication: data.clientNotifiedOfNewApplication === true,
        developerNotifiedOfStatus: data.developerNotifiedOfStatus === true,
      } as ProjectApplication;
    });
  } catch (error) {
    console.error(`[firebaseService getApplicationsByProjectId] Error fetching applications for project ${projectId}:`, error);
    if (error instanceof Error) {
        if (error.message.includes("The query requires an index.")) {
         throw new Error(`Firestore query for project applications failed. It requires a composite index (projectId asc, appliedAt desc). Please check the Firebase console for a link to create it. Error: ${error.message}`);
      }
      throw error;
    }
    throw new Error("Could not fetch applications for project.");
  }
}

export async function updateProjectApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  actingUserId: string,
  actingUserName?: string
): Promise<void> {
  if (!db) {
    console.error(`[firebaseService updateProjectApplicationStatus] Firestore is not initialized for application ${applicationId}.`);
    throw new Error("Firestore is not initialized.");
  }
  if (!applicationId) throw new Error("Application ID is required.");

  const appDocRef = doc(db, PROJECT_APPLICATIONS_COLLECTION, applicationId);
  const appSnap = await getDoc(appDocRef);
  if (!appSnap.exists()) {
    console.error(`[firebaseService updateProjectApplicationStatus] Application ${applicationId} not found.`);
    throw new Error("Application not found.");
  }
  const appData = appSnap.data() as ProjectApplication;

  try {
    await updateDoc(appDocRef, {
      status: newStatus,
      developerNotifiedOfStatus: false, // Reset notification status for this specific update attempt
    });

    // Send email notifications (excluding acceptance, which is handled by assignDeveloperToProject logic for the accepted app)
    if (newStatus === 'rejected' && appData.developerEmail && appData.developerName && appData.projectName && appData.projectId) {
      try {
        const emailHtml = await getApplicationRejectedEmailToDeveloper(appData.developerName, appData.projectName, appData.projectId);
        await sendEmail(appData.developerEmail, `Update on Your Application for "${appData.projectName}"`, emailHtml);
        await updateDoc(appDocRef, { developerNotifiedOfStatus: true });
      } catch (emailError) {
        console.error(`[firebaseService updateProjectApplicationStatus] Failed to send rejection email for app ${applicationId}:`, emailError);
      }
    }

    await addAdminActivityLog({
        adminId: actingUserId,
        adminName: actingUserName || "System/Client",
        action: `PROJECT_APPLICATION_${newStatus.toUpperCase()}`,
        targetType: "project_application",
        targetId: applicationId,
        targetName: `Application for ${appData.projectName || 'unknown project'} by ${appData.developerName || 'unknown developer'}`,
        details: { oldStatus: appData.status, newStatus: newStatus, projectId: appData.projectId }
    });

  } catch (error) {
    console.error(`[firebaseService updateProjectApplicationStatus] Error updating application ${applicationId} to ${newStatus}:`, error);
    if (error instanceof Error) throw error;
    throw new Error("Could not update project application status.");
  }
}

export async function assignDeveloperToProject(
  projectId: string,
  applicationId: string, // The ID of the application that was accepted
  developerId: string,
  developerName: string,
  developerEmail: string,
  actingUserId: string,
  actingUserName?: string
): Promise<void> {
  if (!db) {
    console.error(`[firebaseService assignDeveloperToProject] Firestore is not initialized for project ${projectId}.`);
    throw new Error("Firestore is not initialized.");
  }
  if (!projectId || !applicationId || !developerId || !developerName || !developerEmail) {
    throw new Error("Project ID, Application ID, Developer ID, Name, and Email are required.");
  }

  const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
  const acceptedAppDocRef = doc(db, PROJECT_APPLICATIONS_COLLECTION, applicationId);

  try {
    const projectSnap = await getDoc(projectDocRef);
    const projectName = projectSnap.exists() ? projectSnap.data()?.name : "Unknown Project";

    const batch = writeBatch(db);
    batch.update(projectDocRef, {
      status: "In Progress" as ProjectStatus,
      assignedDeveloperId: developerId,
      assignedDeveloperName: developerName,
    });
    // Explicitly ensure the accepted application is marked as 'accepted' and 'developerNotifiedOfStatus' to false before email attempt
    batch.update(acceptedAppDocRef, { 
        status: "accepted" as ApplicationStatus,
        developerNotifiedOfStatus: false 
    });

    await batch.commit();
    
    // Now attempt to send email and update notification status for the accepted application
    try {
        const emailHtml = await getApplicationAcceptedEmailToDeveloper(developerName, projectName, projectId);
        await sendEmail(developerEmail, `Congratulations! Application Accepted for "${projectName}"`, emailHtml);
        await updateDoc(acceptedAppDocRef, { developerNotifiedOfStatus: true }); // Update after successful email attempt
    } catch (emailError) {
        console.error(`[firebaseService assignDeveloperToProject] Failed to send acceptance email to ${developerEmail} or update notification status for app ${applicationId}:`, emailError);
    }

    await addAdminActivityLog({
        adminId: actingUserId,
        adminName: actingUserName || "System/Client",
        action: "PROJECT_ASSIGNED_DEVELOPER",
        targetType: "project",
        targetId: projectId,
        targetName: projectName || `Project ${projectId}`,
        details: { assignedDeveloperId: developerId, assignedDeveloperName: developerName, fromApplicationId: applicationId }
    });

  } catch (error) {
    console.error(`[firebaseService assignDeveloperToProject] Error assigning developer ${developerId} to project ${projectId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error("Could not assign developer to project.");
  }
}

export async function rejectOtherPendingApplications(
  projectId: string,
  acceptedApplicationId: string,
  actingUserId: string,
  actingUserName?: string
): Promise<void> {
  if (!db) {
    console.error(`[firebaseService rejectOtherPendingApplications] Firestore is not initialized for project ${projectId}.`);
    throw new Error("Firestore is not initialized.");
  }

  try {
    const q = query(
      collection(db, PROJECT_APPLICATIONS_COLLECTION),
      where("projectId", "==", projectId),
      where("status", "==", "pending" as ApplicationStatus)
    );
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    const emailTasks: Array<Promise<void>> = [];

    querySnapshot.forEach(docSnap => {
      if (docSnap.id !== acceptedApplicationId) {
        const appRef = doc(db, PROJECT_APPLICATIONS_COLLECTION, docSnap.id);
        batch.update(appRef, { status: "rejected" as ApplicationStatus, developerNotifiedOfStatus: false }); 

        const appData = docSnap.data() as ProjectApplication;
        if (appData.developerEmail && appData.developerName && appData.projectName && appData.projectId) {
          const emailTask = async () => {
            try {
              const emailHtml = await getApplicationRejectedEmailToDeveloper(appData.developerName, appData.projectName, appData.projectId);
              await sendEmail(appData.developerEmail, `Update on Your Application for "${appData.projectName}"`, emailHtml);
              if (db) { // Ensure db is still defined in this scope
                await updateDoc(appRef, { developerNotifiedOfStatus: true }); 
              }
            } catch (emailError) {
              console.error(`[firebaseService rejectOtherPendingApplications] Failed to send rejection email to ${appData.developerEmail} or update status for app ${docSnap.id}:`, emailError);
            }
          };
          emailTasks.push(emailTask());
        }

        addAdminActivityLog({
            adminId: actingUserId,
            adminName: actingUserName || "System/Client",
            action: "PROJECT_APPLICATION_AUTO_REJECTED",
            targetType: "project_application",
            targetId: docSnap.id,
            targetName: `Application for ${appData.projectName || 'unknown project'} by ${appData.developerName || 'unknown developer'}`,
            details: { reason: "Another application was accepted for this project.", projectId: appData.projectId }
        }).catch(logError => console.error("[firebaseService rejectOtherPendingApplications] Error logging auto-rejection:", logError));
      }
    });

    const otherAppsToRejectCount = querySnapshot.docs.filter(d => d.id !== acceptedApplicationId).length;
    if (otherAppsToRejectCount > 0) {
        await batch.commit();
    }

    await Promise.allSettled(emailTasks); 

  } catch (error) {
    console.error(`[firebaseService rejectOtherPendingApplications] Error rejecting other applications for project ${projectId}:`, error);
  }
}
