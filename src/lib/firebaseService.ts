
// src/lib/firebaseService.ts
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, Timestamp, where, addDoc, updateDoc, serverTimestamp, deleteField, type FieldValue } from "firebase/firestore";
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

interface UserWriteData {
  name: string;
  email: string;
  role: User['role'];
  id: string;
  createdAt: FieldValue; // For serverTimestamp
  bio: string;
  avatarUrl: string;
  referralCode: string;
  currentPlan: string;
  planPrice: string;
  isFlagged: boolean;
  accountStatus: AccountStatus;
  referredByCode?: string;
  skills?: string[];
  portfolioUrls?: string[];
  experienceLevel?: User['experienceLevel'];
  resumeFileUrl?: string;
  resumeFileName?: string;
}

/**
 * Adds a new user to the Firestore 'users' collection.
 * Includes a createdAt timestamp, generates a referral code, and sets a default plan.
 */
export async function addUser(userData: Omit<User, 'id' | 'createdAt' | 'referralCode' | 'currentPlan' | 'planPrice' | 'isFlagged' | 'accountStatus' | 'avatarUrl' | 'bio' | 'skills' | 'portfolioUrls' | 'experienceLevel' | 'resumeFileUrl' | 'resumeFileName'> & { id?: string, referredByCode?: string, resumeFileUrl?: string, resumeFileName?: string }): Promise<User> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");

  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id;
  const generatedReferralCode = `CODECRAFT_${userId.substring(0, 8).toUpperCase()}`;

  const userDocumentData: Partial<UserWriteData> = { // Use Partial for progressive assignment
    name: userData.name,
    email: userData.email,
    role: userData.role,
    id: userId,
    createdAt: serverTimestamp(),
    bio: `New ${userData.role} on CodeCrafter.`,
    avatarUrl: `https://placehold.co/100x100.png?text=${userData.name?.[0]?.toUpperCase() || 'U'}`,
    referralCode: generatedReferralCode,
    currentPlan: "Free Tier",
    planPrice: "$0/month",
    isFlagged: false,
    accountStatus: userData.role === 'developer' ? "pending_approval" : "active",
  };

  if (userData.referredByCode) {
    userDocumentData.referredByCode = userData.referredByCode;
  }

  if (userData.role === 'developer') {
    userDocumentData.skills = [];
    userDocumentData.portfolioUrls = [];
    userDocumentData.experienceLevel = '';
    if (userData.resumeFileUrl) {
      userDocumentData.resumeFileUrl = userData.resumeFileUrl;
    }
    if (userData.resumeFileName) {
      userDocumentData.resumeFileName = userData.resumeFileName;
    }
  }

  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), userDocumentData as UserWriteData); // Cast after all fields are set

    const welcomeEmailHtml = await getWelcomeEmailTemplate(userDocumentData.name!, userDocumentData.role!);
    await sendEmail(userDocumentData.email!, "Welcome to CodeCrafter!", welcomeEmailHtml);

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
      let createdAtDate: Date | undefined = undefined;
      if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
          createdAtDate = new Date(data.createdAt);
        } else if (data.createdAt.seconds && typeof data.createdAt.seconds === 'number') { // Handle plain object Timestamps
          createdAtDate = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate();
        }
      }

      users.push({
        id: docSnap.id,
        name: data.name || "Unnamed User",
        email: data.email || "No email",
        role: data.role || "client",
        createdAt: createdAtDate,
        bio: data.bio || (data.role === 'developer' ? "Skilled developer ready for new challenges." : "Client looking for expert developers."),
        avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.name?.[0] || 'U').toUpperCase()}`,
        referralCode: data.referralCode || undefined,
        referredByCode: data.referredByCode || undefined,
        currentPlan: data.currentPlan || "Free Tier",
        planPrice: data.planPrice || "$0/month",
        isFlagged: data.isFlagged === true,
        accountStatus: data.accountStatus || (data.role === 'developer' ? 'pending_approval' : 'active'),
        skills: data.role === 'developer' ? (Array.isArray(data.skills) ? data.skills : []) : undefined,
        portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
        experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
        resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
        resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
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
    // console.warn("getUserById called with no userId"); // Keep for debugging if needed
    return null;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      let createdAtDate: Date | undefined = undefined;
      if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
          createdAtDate = new Date(data.createdAt);
        } else if (data.createdAt.seconds && typeof data.createdAt.seconds === 'number') { // Handle plain object Timestamps
          createdAtDate = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate();
        }
      }

      const user: User = {
        id: userDocSnap.id,
        name: data.name || "Unnamed User",
        email: data.email || "No email",
        role: data.role || "client",
        createdAt: createdAtDate,
        bio: data.bio || (data.role === 'developer' ? "Skilled developer ready for new challenges." : "Client looking for expert developers."),
        avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.name?.[0] || 'U').toUpperCase()}`,
        referralCode: data.referralCode || undefined,
        referredByCode: data.referredByCode || undefined,
        currentPlan: data.currentPlan || "Free Tier",
        planPrice: data.planPrice || "$0/month",
        isFlagged: data.isFlagged === true,
        accountStatus: data.accountStatus || (data.role === 'developer' ? 'pending_approval' : 'active'),
        skills: data.role === 'developer' ? (Array.isArray(data.skills) ? data.skills : []) : undefined,
        portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
        experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
        resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
        resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
      };
      return user;
    } else {
      // console.warn(`User with ID '${userId}' not found in Firestore.`); // Keep for debugging
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

    const currentUserData = await getUserById(userId);
    const effectiveRole = data.role || currentUserData?.role;

    if (effectiveRole && effectiveRole !== 'developer') {
      updateData.skills = deleteField();
      updateData.portfolioUrls = deleteField();
      updateData.experienceLevel = deleteField();
      updateData.resumeFileUrl = deleteField();
      updateData.resumeFileName = deleteField();
    } else if (effectiveRole === 'developer') {
      // Ensure arrays are not set to undefined if they are part of the update
      if ('skills' in data && !Array.isArray(data.skills)) updateData.skills = [];
      if ('portfolioUrls' in data && !Array.isArray(data.portfolioUrls)) updateData.portfolioUrls = [];
      if ('experienceLevel' in data && typeof data.experienceLevel !== 'string') updateData.experienceLevel = '';

    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined && key !== 'role' && key !== 'referredByCode' && key !== 'resumeFileUrl' && key !== 'resumeFileName') {
         // Allow 'referredByCode' etc. to be explicitly set to undefined to be removed by deleteField if needed, or simply omitted
        if (data.hasOwnProperty(key as keyof typeof data) && data[key as keyof typeof data] === undefined) {
          // If explicitly set to undefined in the input, prepare for deletion if appropriate, or just omit if it was never there
        } else {
          delete updateData[key];
        }
      }
    });
    
    // Explicitly use deleteField for fields that should be removed if they become undefined
    if (updateData.bio === undefined && data.hasOwnProperty('bio')) updateData.bio = deleteField();
    if (updateData.avatarUrl === undefined && data.hasOwnProperty('avatarUrl')) updateData.avatarUrl = deleteField();
    // etc. for other optional top-level fields if they can be cleared

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
      createdAt: serverTimestamp(),
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
      let createdAtDate: Date | undefined = undefined;
       if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
          createdAtDate = new Date(data.createdAt);
        } else if (data.createdAt.seconds && typeof data.createdAt.seconds === 'number') {
          createdAtDate = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate();
        }
      }
      projects.push({
        id: docSnap.id,
        name: data.name || "Unnamed Project",
        description: data.description || "",
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        availability: data.availability || "Not specified",
        timeZone: data.timeZone || "Not specified",
        status: data.status || "Unknown",
        clientId: data.clientId, // Should always exist based on query
        createdAt: createdAtDate || new Date(), // Fallback if somehow missing, though orderBy should ensure it
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
    return null;
  }
  try {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectDocSnap = await getDoc(projectDocRef);

    if (projectDocSnap.exists()) {
      const data = projectDocSnap.data();
      let createdAtDate: Date | undefined = undefined;
      if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
          createdAtDate = new Date(data.createdAt);
        } else if (data.createdAt.seconds && typeof data.createdAt.seconds === 'number') {
          createdAtDate = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate();
        }
      }
      return {
        id: projectDocSnap.id,
        name: data.name || "Unnamed Project",
        description: data.description || "",
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        availability: data.availability || "Not specified",
        timeZone: data.timeZone || "Not specified",
        status: data.status || "Unknown",
        clientId: data.clientId,
        createdAt: createdAtDate || new Date(),
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
       let createdAtDate: Date | undefined = undefined;
       if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
          createdAtDate = new Date(data.createdAt);
        } else if (data.createdAt.seconds && typeof data.createdAt.seconds === 'number') {
          createdAtDate = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate();
        }
      }
      projects.push({
        id: docSnap.id,
        name: data.name || "Unnamed Project",
        description: data.description || "",
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        availability: data.availability || "Not specified",
        timeZone: data.timeZone || "Not specified",
        status: data.status || "Unknown",
        clientId: data.clientId,
        createdAt: createdAtDate || new Date(),
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
      let createdAtDate: Date | undefined = undefined;
      if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
          createdAtDate = new Date(data.createdAt);
        } else if (data.createdAt.seconds && typeof data.createdAt.seconds === 'number') {
          createdAtDate = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate();
        }
      }
      referredClientsData.push({
        id: docSnap.id,
        name: data.name || "Unnamed User",
        email: data.email || "No email",
        role: data.role, // Should be 'client' based on query
        createdAt: createdAtDate,
        // Include other fields as needed, consistent with User type
        bio: data.bio || "Client referred to CodeCrafter.",
        avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.name?.[0] || 'U').toUpperCase()}`,
        referralCode: data.referralCode || undefined,
        referredByCode: data.referredByCode, // Should match currentUserReferralCode
        currentPlan: data.currentPlan || "Free Tier",
        planPrice: data.planPrice || "$0/month",
        isFlagged: data.isFlagged === true,
        accountStatus: data.accountStatus || 'active',
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
