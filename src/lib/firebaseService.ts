
// src/lib/firebaseService.ts
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
export const PROJECT_APPLICATIONS_COLLECTION = "projectApplications"; // Export this
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
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    return undefined;
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
  const userNameForAvatar = data.name || "User";
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(getInitialsForDefaultAvatar(userNameForAvatar))}&background=random&size=100`;
  
  const user: User = {
    id: docSnap.id,
    name: data.name || "Unnamed User",
    email: data.email || "No email",
    role: data.role || "client",
    createdAt: safeCreateDate(data.createdAt) || new Date(0),
    bio: data.bio || (data.role === 'developer' ? "Skilled developer." : "Client on CodeCrafter."),
    avatarUrl: data.avatarUrl || defaultAvatar,
    referralCode: data.referralCode || undefined,
    referredByCode: data.referredByCode || undefined,
    currentPlan: data.currentPlan || "Free Tier",
    planPrice: data.planPrice || "$0/month",
    isFlagged: data.isFlagged === true,
    accountStatus: data.accountStatus || (data.role === 'developer' ? 'pending_approval' : 'active'),
    
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
    console.error("[firebaseService addUser] Firestore is not initialized!");
    throw new Error("Firestore is not initialized. Check Firebase configuration.");
  }

  const lowercasedEmail = userData.email.toLowerCase();
  console.log("[firebaseService addUser] Received userData:", JSON.stringify(userData, null, 2));


  const existingUser = await getUserByEmail(lowercasedEmail);
  if (existingUser) {
    throw new Error("Email already in use. Please try a different email or log in.");
  }

  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id;
  const generatedReferralCode = `CODECRAFT_${userId.substring(0, 8).toUpperCase()}`;
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(getInitialsForDefaultAvatar(userData.name))}&background=random&size=100`;

  const documentToWrite: { [key: string]: any } = {
    name: userData.name,
    email: lowercasedEmail,
    role: userData.role,
    createdAt: serverTimestamp(),
    bio: `New ${userData.role} on CodeCrafter.`,
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
        documentToWrite.skills = userData.skills;
    }
    if (userData.experienceLevel && userData.experienceLevel.trim() !== "") {
        documentToWrite.experienceLevel = userData.experienceLevel;
    }
    if (Array.isArray(userData.portfolioUrls) && userData.portfolioUrls.length > 0) {
        documentToWrite.portfolioUrls = userData.portfolioUrls;
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
  console.log("[firebaseService addUser] documentToWrite before setDoc:", JSON.stringify(documentToWrite, null, 2));

  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), documentToWrite);

    try {
      const welcomeEmailHtml = await getWelcomeEmailTemplate(documentToWrite.name!, documentToWrite.role!);
      await sendEmail(documentToWrite.email!, "Welcome to CodeCrafter!", welcomeEmailHtml);
    } catch (emailError) {
      console.error(`[firebaseService addUser] Failed to send welcome email to ${documentToWrite.email} during signup:`, emailError);
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
  if (!email) {
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

    if (data.name !== undefined && data.name.trim() !== "") updateData.name = data.name.trim();
    
    updateData.bio = (data.bio && data.bio.trim() !== "") ? data.bio.trim() : deleteField();
    updateData.avatarUrl = (data.avatarUrl && data.avatarUrl.trim() !== "" && !data.avatarUrl.includes('ui-avatars.com')) ? data.avatarUrl.trim() : deleteField();
    
    const currentUserSnap = await getDoc(userDocRef);
    const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() as User : null;
    const effectiveRole = currentUserData?.role;

    if (effectiveRole === 'developer') {
      updateData.skills = (Array.isArray(data.skills) && data.skills.length > 0) ? data.skills : deleteField();
      updateData.experienceLevel = data.experienceLevel || ''; // Keep as empty string if not specified, not deleteField()
      updateData.hourlyRate = (typeof data.hourlyRate === 'number' && data.hourlyRate >= 0) ? data.hourlyRate : deleteField();
      updateData.portfolioUrls = (Array.isArray(data.portfolioUrls) && data.portfolioUrls.length > 0) ? data.portfolioUrls : deleteField();
      updateData.resumeFileUrl = (data.resumeFileUrl && data.resumeFileUrl.trim() !== "") ? data.resumeFileUrl.trim() : deleteField();
      updateData.resumeFileName = (data.resumeFileName && data.resumeFileName.trim() !== "") ? data.resumeFileName.trim() : deleteField();
      updateData.pastProjects = (data.pastProjects && data.pastProjects.trim() !== "") ? data.pastProjects.trim() : deleteField();
    } else { 
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
    console.error("[firebaseService addProject] Firestore is not initialized!");
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
        return;
      }
      let statusValue = data.status || "Unknown";
      if (!["Open", "In Progress", "Completed", "Cancelled", "Unknown"].includes(statusValue)) {
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

    try {
      if (newStatus === "active") {
        const approvedEmailHtml = await getDeveloperApprovedEmailTemplate(userName);
        await sendEmail(userEmail, "Your CodeCrafter Developer Account is Approved!", approvedEmailHtml);
      } else if (newStatus === "rejected") {
        const rejectedEmailHtml = await getDeveloperRejectedEmailTemplate(userName);
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
    console.error("[firebaseService addProjectApplication] Firestore is not initialized!");
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
          console.error(`[firebaseService addProjectApplication] Failed to send application notification email to client ${client.email}:`, emailError);
        }
      }
    }

    const newAppSnap = await getDoc(appDocRef);
    if (!newAppSnap.exists()) {
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
      appliedAt: data.appliedAt, // Keep as Firestore Timestamp
      messageToClient: data.messageToClient,
      clientNotifiedOfNewApplication: data.clientNotifiedOfNewApplication,
      developerNotifiedOfStatus: data.developerNotifiedOfStatus,
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
  if (!db) throw new Error("Firestore is not initialized.");
  if (!developerId || !projectId) return [];

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
      } as ProjectApplication;
    });
  } catch (error) {
    console.error(`[firebaseService getApplicationsByDeveloperForProject] Error fetching applications for dev ${developerId} on project ${projectId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error("Could not fetch developer applications for project.");
  }
}

export async function getApplicationsByProjectId(projectId: string): Promise<ProjectApplication[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!projectId) return [];

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
      } as ProjectApplication;
    });
  } catch (error) {
    console.error(`[firebaseService getApplicationsByProjectId] Error fetching applications for project ${projectId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error("Could not fetch applications for project.");
  }
}

export async function updateProjectApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  actingUserId: string, 
  actingUserName?: string
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!applicationId) throw new Error("Application ID is required.");

  try {
    const appDocRef = doc(db, PROJECT_APPLICATIONS_COLLECTION, applicationId);
    const appSnap = await getDoc(appDocRef);
    if (!appSnap.exists()) throw new Error("Application not found.");
    
    const appData = appSnap.data() as ProjectApplication;

    await updateDoc(appDocRef, {
      status: newStatus,
      developerNotifiedOfStatus: false, // Reset notification status, will be updated after email attempt
    });

    await addAdminActivityLog({
        adminId: actingUserId,
        adminName: actingUserName || "System/Client",
        action: `PROJECT_APPLICATION_${newStatus.toUpperCase()}`,
        targetType: "project_application",
        targetId: applicationId,
        targetName: `Application for ${appData.projectName} by ${appData.developerName}`,
        details: { oldStatus: appData.status, newStatus: newStatus }
    });

  } catch (error) {
    console.error(`[firebaseService updateProjectApplicationStatus] Error updating application ${applicationId} to ${newStatus}:`, error);
    if (error instanceof Error) throw error;
    throw new Error("Could not update project application status.");
  }
}

export async function assignDeveloperToProject(
  projectId: string,
  applicationId: string, // Added applicationId to update its notification status
  developerId: string,
  developerName: string,
  developerEmail: string, // Added developerEmail for notification
  actingUserId: string,
  actingUserName?: string
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!projectId || !applicationId || !developerId || !developerName || !developerEmail) {
    throw new Error("Project ID, Application ID, Developer ID, Name, and Email are required.");
  }

  try {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectDocRef, {
      status: "In Progress" as ProjectStatus,
      assignedDeveloperId: developerId,
      assignedDeveloperName: developerName,
    });

    const projectSnap = await getDoc(projectDocRef);
    const projectName = projectSnap.exists() ? projectSnap.data()?.name : "Unknown Project";

    // Send email to developer
    try {
        const emailHtml = await getApplicationAcceptedEmailToDeveloper(developerName, projectName, projectId);
        await sendEmail(developerEmail, `Application Accepted for "${projectName}"!`, emailHtml);
        const appDocRef = doc(db, PROJECT_APPLICATIONS_COLLECTION, applicationId);
        await updateDoc(appDocRef, { developerNotifiedOfStatus: true });
    } catch (emailError) {
        console.error(`[firebaseService assignDeveloperToProject] Failed to send acceptance email to ${developerEmail} or update notification status for app ${applicationId}:`, emailError);
    }


    await addAdminActivityLog({
        adminId: actingUserId,
        adminName: actingUserName || "System/Client",
        action: "PROJECT_ASSIGNED_DEVELOPER",
        targetType: "project",
        targetId: projectId,
        targetName: projectName,
        details: { assignedDeveloperId: developerId, assignedDeveloperName: developerName }
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
  if (!db) throw new Error("Firestore is not initialized.");

  try {
    const q = query(
      collection(db, PROJECT_APPLICATIONS_COLLECTION),
      where("projectId", "==", projectId),
      where("status", "==", "pending" as ApplicationStatus)
    );
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    const emailPromises: Promise<void>[] = [];

    querySnapshot.forEach(docSnap => {
      if (docSnap.id !== acceptedApplicationId) {
        const appRef = doc(db, PROJECT_APPLICATIONS_COLLECTION, docSnap.id);
        batch.update(appRef, { status: "rejected" as ApplicationStatus, developerNotifiedOfStatus: false });
        
        const appData = docSnap.data() as ProjectApplication;
        if (appData.developerEmail && appData.developerName && appData.projectName && appData.projectId) {
            const emailPromise = getApplicationRejectedEmailToDeveloper(appData.developerName, appData.projectName, appData.projectId)
            .then(emailHtml => sendEmail(appData.developerEmail, `Update on Your Application for "${appData.projectName}"`, emailHtml))
            .then(async () => {
                if(db) { // Check db again before this isolated updateDoc
                    await updateDoc(appRef, { developerNotifiedOfStatus: true });
                }
            })
            .catch(emailError => console.error(`[firebaseService rejectOther] Failed to send rejection email to ${appData.developerEmail} or update status for app ${docSnap.id}:`, emailError));
            emailPromises.push(emailPromise);
        }

        addAdminActivityLog({
            adminId: actingUserId,
            adminName: actingUserName || "System/Client",
            action: "PROJECT_APPLICATION_AUTO_REJECTED",
            targetType: "project_application",
            targetId: docSnap.id,
            targetName: `Application for ${appData.projectName} by ${appData.developerName}`,
            details: { reason: "Another application was accepted." }
        }).catch(logError => console.error("[firebaseService rejectOther] Error logging auto-rejection:", logError));
      }
    });
    await batch.commit();
    await Promise.allSettled(emailPromises); // Wait for all email sending and status updates to attempt
  } catch (error) {
    console.error(`[firebaseService rejectOtherPendingApplications] Error rejecting other applications for project ${projectId}:`, error);
  }
}
