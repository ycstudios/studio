// src/lib/firebaseService.ts
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, Timestamp, where, addDoc, updateDoc, serverTimestamp, deleteField } from "firebase/firestore";
import { db } from "./firebase"; // Your Firebase app instance
import type { User, Project, AdminActivityLog, AccountStatus } from "@/types";
import { 
  sendEmail, 
  getWelcomeEmailTemplate, 
  getDeveloperApprovedEmailTemplate,
  getDeveloperRejectedEmailTemplate,
  getClientProjectPostedEmailTemplate
} from "./emailService";

const USERS_COLLECTION = "users";
const PROJECTS_COLLECTION = "projects";
const ADMIN_ACTIVITY_LOGS_COLLECTION = "adminActivityLogs";

/**
 * Adds a new user to the Firestore 'users' collection.
 * Includes a createdAt timestamp, generates a referral code, and sets a default plan.
 */
export async function addUser(userData: Omit<User, 'id' | 'createdAt' | 'referralCode' | 'currentPlan' | 'planPrice' | 'portfolioUrls' | 'experienceLevel' | 'isFlagged' | 'accountStatus' | 'avatarUrl' | 'bio' | 'skills' | 'resumeFileUrl' | 'resumeFileName'> & { id?: string, referredByCode?: string, resumeFileUrl?: string, resumeFileName?: string }): Promise<User> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  
  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id;
  const generatedReferralCode = `CODECRAFT_${userId.substring(0, 6).toUpperCase()}`;
  
  const userToSave: User = {
    name: userData.name,
    email: userData.email,
    role: userData.role,
    id: userId,
    createdAt: serverTimestamp() as Timestamp, 
    bio: `New ${userData.role} on CodeCrafter.`,
    skills: userData.role === 'developer' ? [] : undefined,
    avatarUrl: `https://placehold.co/100x100.png?text=${userData.name?.[0]?.toUpperCase() || 'U'}`,
    referralCode: generatedReferralCode,
    referredByCode: userData.referredByCode || undefined,
    currentPlan: "Free Tier",
    planPrice: "$0/month",
    portfolioUrls: userData.role === 'developer' ? [] : undefined,
    experienceLevel: userData.role === 'developer' ? '' : undefined,
    isFlagged: false,
    accountStatus: userData.role === 'developer' ? "pending_approval" : "active",
    resumeFileUrl: userData.role === 'developer' ? userData.resumeFileUrl : undefined,
    resumeFileName: userData.role === 'developer' ? userData.resumeFileName : undefined,
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), userToSave);
    
    const welcomeEmailHtml = await getWelcomeEmailTemplate(userToSave.name, userToSave.role);
    await sendEmail(userToSave.email, "Welcome to CodeCrafter!", welcomeEmailHtml);

    const fetchedUser = await getUserById(userId);
    if (!fetchedUser) throw new Error(`User ${userId} was supposedly added but could not be retrieved immediately.`);
    return fetchedUser;
  } catch (error) {
    console.error("Error adding user to Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not add user to database: ${error.message}`);
    }
    throw new Error("Could not add user to database due to an unknown error.");
  }
}

/**
 * Fetches all users from the Firestore 'users' collection, ordered by name.
 */
export async function getAllUsers(): Promise<User[]> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  try {
    const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("name", "asc"));
    const querySnapshot = await getDocs(usersQuery);
    const users: User[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({ 
        id: docSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        portfolioUrls: Array.isArray(data.portfolioUrls) ? data.portfolioUrls : (data.role === 'developer' ? [] : undefined),
        experienceLevel: typeof data.experienceLevel === 'string' ? data.experienceLevel as User['experienceLevel'] : (data.role === 'developer' ? '' : undefined),
        isFlagged: data.isFlagged === true,
        accountStatus: data.accountStatus || (data.role === 'developer' ? 'pending_approval' : 'active'),
        resumeFileUrl: data.resumeFileUrl || undefined,
        resumeFileName: data.resumeFileName || undefined,
      } as User);
    });
    return users;
  } catch (error) {
    console.error("Error fetching all users from Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch users from database: ${error.message}`);
    }
    throw new Error("Could not fetch users from database due to an unknown error.");
  }
}

/**
 * Fetches a single user by their ID from the Firestore 'users' collection.
 */
export async function getUserById(userId: string): Promise<User | null> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!userId) {
    console.warn("getUserById called with no userId");
    return null;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return { 
        id: userDocSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        portfolioUrls: Array.isArray(data.portfolioUrls) ? data.portfolioUrls : (data.role === 'developer' ? [] : undefined),
        experienceLevel: typeof data.experienceLevel === 'string' ? data.experienceLevel as User['experienceLevel'] : (data.role === 'developer' ? '' : undefined),
        isFlagged: data.isFlagged === true,
        accountStatus: data.accountStatus || (data.role === 'developer' ? 'pending_approval' : 'active'),
        resumeFileUrl: data.resumeFileUrl || undefined,
        resumeFileName: data.resumeFileName || undefined,
      } as User;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching user by ID ${userId} from Firestore: `, error);
     if (error instanceof Error) {
      throw new Error(`Could not fetch user ${userId} from database: ${error.message}`);
    }
    throw new Error(`Could not fetch user ${userId} from database due to an unknown error.`);
  }
}

/**
 * Updates a user's document in Firestore.
 */
export async function updateUser(userId: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'email' | 'role'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!userId) {
    throw new Error("User ID is required to update user.");
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    
    const updateData: any = { ...data };
    
    // If role is part of the update and it's not developer, clear developer-specific fields
    const currentUserData = await getUserById(userId); // Fetch current role if not in update data
    const currentRole = data.role || currentUserData?.role;

    if (currentRole && currentRole !== 'developer') {
      updateData.skills = deleteField();
      updateData.portfolioUrls = deleteField();
      updateData.experienceLevel = deleteField();
      updateData.resumeFileUrl = deleteField();
      updateData.resumeFileName = deleteField();
    } else if (currentRole === 'developer') {
      // Ensure developer fields are arrays/strings if not being explicitly set to undefined/null
      if (data.skills === undefined && !updateData.skills) updateData.skills = currentUserData?.skills || [];
      if (data.portfolioUrls === undefined && !updateData.portfolioUrls) updateData.portfolioUrls = currentUserData?.portfolioUrls || [];
      if (data.experienceLevel === undefined && !updateData.experienceLevel) updateData.experienceLevel = currentUserData?.experienceLevel || '';
    }
    
    await updateDoc(userDocRef, updateData);
  } catch (error) {
    console.error(`Error updating user ${userId} in Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not update user ${userId} in database: ${error.message}`);
    }
    throw new Error(`Could not update user ${userId} in database due to an unknown error.`);
  }
}

/**
 * Adds a new project to the Firestore 'projects' collection.
 */
export async function addProject(
  projectData: Omit<Project, 'id' | 'createdAt' | 'status' | 'clientId'>, 
  clientId: string,
  clientEmail?: string, 
  clientName?: string
): Promise<Project> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!clientId) {
    throw new Error("Client ID is required to add a project.");
  }
  
  try {
    const projectWithMetadata = {
      ...projectData,
      clientId,
      status: "Open" as Project["status"],
      createdAt: serverTimestamp() as Timestamp,
    };
    const projectDocRef = await addDoc(collection(db, PROJECTS_COLLECTION), projectWithMetadata);
    
    const fetchedProject = await getProjectById(projectDocRef.id);
    if (!fetchedProject) throw new Error(`Project ${projectDocRef.id} was supposedly added but could not be retrieved.`);
    

    if (clientEmail && clientName) {
      const projectEmailHtml = await getClientProjectPostedEmailTemplate(clientName, fetchedProject.name, fetchedProject.id);
      await sendEmail(clientEmail, `Your Project "${fetchedProject.name}" is Live!`, projectEmailHtml);
    }
    return fetchedProject;
  } catch (error) {
    console.error("Error adding project to Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not add project to database: ${error.message}`);
    }
    throw new Error("Could not add project to database due to an unknown error.");
  }
}

/**
 * Fetches all projects for a specific client ID from Firestore, ordered by creation date (descending).
 */
export async function getProjectsByClientId(clientId: string): Promise<Project[]> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!clientId) {
    console.warn("getProjectsByClientId called with no clientId");
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
      projects.push({ 
        id: docSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
      } as Project);
    });
    return projects;
  } catch (error) {
    console.error(`Error fetching projects for client ${clientId} from Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch client projects from database: ${error.message}`);
    }
    throw new Error("Could not fetch client projects from database due to an unknown error.");
  }
}

/**
 * Fetches a single project by its ID from the Firestore 'projects' collection.
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!projectId) {
    console.warn("getProjectById called with no projectId");
    return null;
  }
  try {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectDocSnap = await getDoc(projectDocRef);

    if (projectDocSnap.exists()) {
      const data = projectDocSnap.data();
      return { 
        id: projectDocSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
      } as Project;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching project by ID ${projectId} from Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch project ${projectId} from database: ${error.message}`);
    }
    throw new Error(`Could not fetch project ${projectId} from database due to an unknown error.`);
  }
}

/**
 * Fetches all projects from the Firestore 'projects' collection, ordered by creation date (descending).
 */
export async function getAllProjects(): Promise<Project[]> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  try {
    const projectsQuery = query(collection(db, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(projectsQuery);
    const projects: Project[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      projects.push({ 
        id: docSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
      } as Project);
    });
    return projects;
  } catch (error) {
    console.error("Error fetching all projects from Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch all projects from database: ${error.message}`);
    }
    throw new Error("Could not fetch all projects from database due to an unknown error.");
  }
}

/**
 * Fetches all client users referred by a specific referral code.
 */
export async function getReferredClients(currentUserReferralCode: string): Promise<User[]> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!currentUserReferralCode) {
    console.warn("getReferredClients called with no currentUserReferralCode");
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
    const referredClientsData: User[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      referredClientsData.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
      } as User);
    });
    return referredClientsData;
  } catch (error) {
    console.error(`Error fetching referred clients for code ${currentUserReferralCode}: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch referred clients: ${error.message}`);
    }
    throw new Error("Could not fetch referred clients due to an unknown error.");
  }
}

/**
 * Toggles the 'isFlagged' status of a user.
 */
export async function toggleUserFlag(userId: string, currentFlagStatus: boolean): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!userId) throw new Error("User ID is required to toggle flag status.");

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, {
      isFlagged: !currentFlagStatus,
    });
  } catch (error) {
    console.error(`Error toggling flag for user ${userId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Could not toggle flag status for user ${userId}: ${error.message}`);
    }
    throw new Error(`Could not toggle flag status for user ${userId} due to an unknown error.`);
  }
}

/**
 * Adds an entry to the Admin Activity Log.
 */
export async function addAdminActivityLog(logData: Omit<AdminActivityLog, 'id' | 'timestamp'>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  
  const logEntry: Omit<AdminActivityLog, 'id'> = {
    ...logData,
    timestamp: serverTimestamp() as Timestamp,
  };

  try {
    await addDoc(collection(db, ADMIN_ACTIVITY_LOGS_COLLECTION), logEntry);
  } catch (error) {
    console.error("Error adding admin activity log:", error);
    // Optionally re-throw or handle logging errors differently for production
  }
}

/**
 * Updates a user's account status in Firestore and sends notification emails.
 */
export async function updateUserAccountStatus(userId: string, newStatus: AccountStatus, userEmail: string, userName: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!userId) throw new Error("User ID is required to update account status.");

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, {
      accountStatus: newStatus,
    });

    // Send notification email based on status
    if (newStatus === "active") {
      const approvedEmailHtml = await getDeveloperApprovedEmailTemplate(userName);
      await sendEmail(userEmail, "Your CodeCrafter Developer Account is Approved!", approvedEmailHtml);
    } else if (newStatus === "rejected") {
      const rejectedEmailHtml = await getDeveloperRejectedEmailTemplate(userName);
      await sendEmail(userEmail, "Update on Your CodeCrafter Developer Application", rejectedEmailHtml);
    }
  } catch (error) {
    console.error(`Error updating account status for user ${userId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Could not update account status for user ${userId}: ${error.message}`);
    }
    throw new Error(`Could not update account status for user ${userId} due to an unknown error.`);
  }
}
