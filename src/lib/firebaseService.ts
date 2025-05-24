
// src/lib/firebaseService.ts
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, Timestamp, where, addDoc, updateDoc, serverTimestamp, deleteField } from "firebase/firestore";
import { db } from "./firebase"; // Your Firebase app instance
import type { User, Project, AdminActivityLog } from "@/types";

const USERS_COLLECTION = "users";
const PROJECTS_COLLECTION = "projects";
const ADMIN_ACTIVITY_LOGS_COLLECTION = "adminActivityLogs";

/**
 * Adds a new user to the Firestore 'users' collection.
 * Includes a createdAt timestamp, generates a referral code, and sets a default plan.
 */
export async function addUser(userData: Omit<User, 'id' | 'createdAt' | 'referralCode' | 'currentPlan' | 'planPrice' | 'portfolioUrls' | 'experienceLevel' | 'isFlagged'> & { id?: string, referredByCode?: string }): Promise<User> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id;
  const generatedReferralCode = `CODECRAFT_${userId.substring(0, 6).toUpperCase()}`;
  
  const userToSave: User = {
    name: userData.name,
    email: userData.email,
    role: userData.role,
    id: userId,
    createdAt: serverTimestamp() as Timestamp, 
    bio: userData.bio || `New ${userData.role} on CodeCrafter.`,
    skills: userData.skills || (userData.role === 'developer' ? [] : undefined),
    avatarUrl: userData.avatarUrl || `https://placehold.co/100x100.png?text=${userData.name?.[0]?.toUpperCase() || 'U'}`,
    referralCode: generatedReferralCode,
    referredByCode: userData.referredByCode || undefined,
    currentPlan: "Free Tier",
    planPrice: "$0/month",
    portfolioUrls: userData.role === 'developer' ? [] : undefined,
    experienceLevel: userData.role === 'developer' ? '' : undefined,
    isFlagged: false, // Default to not flagged
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), userToSave);
    console.log("User added to Firestore with ID:", userId);
    // Return with JS Date for createdAt for consistency in app
    const fetchedUser = await getUserById(userId);
    if (!fetchedUser) throw new Error("Failed to retrieve user after adding.");
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
  if (!db) throw new Error("Firestore is not initialized.");
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
        isFlagged: data.isFlagged === true, // Ensure boolean
      } as User);
    });
    console.log("Fetched all users from Firestore:", users.length);
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
  if (!db) throw new Error("Firestore is not initialized.");
  if (!userId) {
    console.warn("getUserById called with no userId");
    return null;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      console.log("Fetched user by ID from Firestore:", userId);
      const data = userDocSnap.data();
      return { 
        id: userDocSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        portfolioUrls: Array.isArray(data.portfolioUrls) ? data.portfolioUrls : (data.role === 'developer' ? [] : undefined),
        experienceLevel: typeof data.experienceLevel === 'string' ? data.experienceLevel as User['experienceLevel'] : (data.role === 'developer' ? '' : undefined),
        isFlagged: data.isFlagged === true,
      } as User;
    } else {
      console.log("No such user found in Firestore with ID:", userId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by ID from Firestore: ", error);
     if (error instanceof Error) {
      throw new Error(`Could not fetch user ${userId} from database: ${error.message}`);
    }
    throw new Error(`Could not fetch user ${userId} from database due to an unknown error.`);
  }
}

/**
 * Updates a user's document in Firestore.
 */
export async function updateUser(userId: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!userId) {
    console.warn("updateUser called with no userId");
    throw new Error("User ID is required to update user.");
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    
    const updateData: any = { ...data };

    if (data.role && data.role !== 'developer') {
      updateData.skills = deleteField();
      updateData.portfolioUrls = deleteField();
      updateData.experienceLevel = deleteField();
    } else if (data.role === 'developer') {
      if (!('skills' in data)) updateData.skills = [];
      if (!('portfolioUrls' in data)) updateData.portfolioUrls = [];
      if (!('experienceLevel' in data)) updateData.experienceLevel = '';
    }
    
    await updateDoc(userDocRef, updateData);
    console.log("User updated in Firestore:", userId);
  } catch (error) {
    console.error("Error updating user in Firestore: ", error);
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
  clientId: string
): Promise<Project> {
  if (!db) throw new Error("Firestore is not initialized.");
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
    console.log("Project added to Firestore with ID:", projectDocRef.id);
    // Fetch the project to get server-generated timestamp as a Date object
    const savedProject = await getProjectById(projectDocRef.id);
    if (!savedProject) throw new Error("Failed to retrieve project after adding.");
    return savedProject;
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
  if (!db) throw new Error("Firestore is not initialized.");
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
    console.log(`Fetched ${projects.length} projects for client ID ${clientId} from Firestore.`);
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
  if (!db) throw new Error("Firestore is not initialized.");
  if (!projectId) {
    console.warn("getProjectById called with no projectId");
    return null;
  }
  try {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectDocSnap = await getDoc(projectDocRef);

    if (projectDocSnap.exists()) {
      console.log("Fetched project by ID from Firestore:", projectId);
      const data = projectDocSnap.data();
      return { 
        id: projectDocSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
      } as Project;
    } else {
      console.log("No such project found in Firestore with ID:", projectId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching project by ID from Firestore: ", error);
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
  if (!db) throw new Error("Firestore is not initialized.");
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
    console.log("Fetched all projects from Firestore:", projects.length);
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
  if (!db) throw new Error("Firestore is not initialized.");
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
    console.log(`Fetched ${referredClientsData.length} referred clients for code ${currentUserReferralCode}.`);
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
  if (!db) throw new Error("Firestore is not initialized.");
  if (!userId) throw new Error("User ID is required to toggle flag status.");

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, {
      isFlagged: !currentFlagStatus,
    });
    console.log(`User ${userId} flag status toggled to ${!currentFlagStatus}.`);
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
  if (!db) throw new Error("Firestore is not initialized.");
  
  const logEntry: Omit<AdminActivityLog, 'id'> = {
    ...logData,
    timestamp: serverTimestamp() as Timestamp,
  };

  try {
    await addDoc(collection(db, ADMIN_ACTIVITY_LOGS_COLLECTION), logEntry);
    console.log("Admin activity logged:", logData.action);
  } catch (error) {
    console.error("Error adding admin activity log:", error);
    // Log the error but don't necessarily throw to break the primary action (e.g., flagging user)
    // Depending on requirements, you might want to handle this more strictly.
  }
}
