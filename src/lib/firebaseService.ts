
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
  getQuickServiceRequestAdminNotificationHtml,
  getQuickServiceRequestClientConfirmationHtml
} from "./emailService";

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
    // Attempt to parse if it's a string or number representing a date
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    // Handle Firestore Timestamp-like objects that might come from server-side rendering or other sources
    if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
        const date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
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

// Define a more specific type for writing user data to avoid issues with serverTimestamp
interface UserWriteData {
  name: string;
  email: string; // Will be stored in lowercase
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
  hourlyRate?: number | FieldValue; // Allow FieldValue for deleteField
  portfolioUrls?: string[];
  resumeFileUrl?: string | FieldValue;
  resumeFileName?: string | FieldValue;
  pastProjects?: string | FieldValue;
}


export async function addUser(
  userData: Omit<User, 'id' | 'createdAt' | 'referralCode' | 'currentPlan' | 'planPrice' | 'isFlagged' | 'accountStatus' | 'avatarUrl' | 'bio'> & { id?: string, referredByCode?: string }
): Promise<User> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");

  const lowercasedEmail = userData.email.toLowerCase();

  // Check if user with this email already exists
  const existingUser = await getUserByEmail(lowercasedEmail);
  if (existingUser) {
    throw new Error("Email already in use. Please try a different email or log in.");
  }

  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id;
  const generatedReferralCode = `CODECRAFT_${userId.substring(0, 8).toUpperCase()}`;
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random&size=100`;

  const userDocumentData: UserWriteData = {
    name: userData.name,
    email: lowercasedEmail, // Store email in lowercase
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

  if (userData.referredByCode) {
    userDocumentData.referredByCode = userData.referredByCode.trim();
  }

  if (userData.role === 'developer') {
    userDocumentData.skills = userData.skills || [];
    userDocumentData.experienceLevel = userData.experienceLevel || '';
    userDocumentData.hourlyRate = userData.hourlyRate === undefined ? deleteField() as any : userData.hourlyRate;
    userDocumentData.portfolioUrls = userData.portfolioUrls || [];
    userDocumentData.resumeFileUrl = userData.resumeFileUrl || undefined;
    userDocumentData.resumeFileName = userData.resumeFileName || undefined;
    userDocumentData.pastProjects = userData.pastProjects || undefined;
  }

  // Remove undefined fields explicitly before setting to avoid Firestore error
  Object.keys(userDocumentData).forEach(keyStr => {
    const key = keyStr as keyof typeof userDocumentData;
    if ((userDocumentData as any)[key] === undefined) {
      delete (userDocumentData as any)[key];
    }
  });


  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), userDocumentData);
    console.log(`[firebaseService] User ${userId} added to Firestore.`);

    try {
      const welcomeEmailHtml = await getWelcomeEmailTemplate(userDocumentData.name!, userDocumentData.role!);
      await sendEmail(userDocumentData.email!, "Welcome to CodeCrafter!", welcomeEmailHtml);
      console.log(`[firebaseService] Welcome email attempt for ${userDocumentData.email} finished.`);
    } catch (emailError) {
      console.error(`[firebaseService] Failed to send welcome email to ${userDocumentData.email} during signup:`, emailError);
      // Do not re-throw here if user creation itself was successful, but log the email error.
    }

    const fetchedUser = await getUserById(userId);
    if (!fetchedUser) throw new Error(`User ${userId} was supposedly added but could not be retrieved immediately.`);
    return fetchedUser;
  } catch (error) {
    console.error("[firebaseService] Error adding user to Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not add user to database: ${error.message}`);
    }
    throw new Error("Could not add user to database due to an unknown error.");
  }
}


export async function getAllUsers(): Promise<User[]> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  try {
    const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(usersQuery);
    const users: User[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&size=100`;
      const user: User = {
        id: docSnap.id,
        name: data.name || "Unnamed User",
        email: data.email || "No email", // Should be lowercase from addUser
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
        skills: data.role === 'developer' ? (Array.isArray(data.skills) ? data.skills : []) : undefined,
        experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
        hourlyRate: data.role === 'developer' ? (typeof data.hourlyRate === 'number' ? data.hourlyRate : undefined) : undefined,
        portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
        resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
        resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
        pastProjects: data.role === 'developer' ? (data.pastProjects || undefined) : undefined,
      };
      users.push(user);
    });
    return users;
  } catch (error) {
    console.error("[firebaseService] Error fetching all users from Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch users from database: ${error.message}`);
    }
    throw new Error("Could not fetch users from database due to an unknown error.");
  }
}


export async function getUserById(userId: string): Promise<User | null> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!userId) {
    console.warn("[firebaseService] getUserById called with no userId");
    return null;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&size=100`;
      const user: User = {
        id: userDocSnap.id,
        name: data.name || "Unnamed User",
        email: data.email || "No email", // Should be lowercase
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
        skills: data.role === 'developer' ? (Array.isArray(data.skills) ? data.skills : []) : undefined,
        experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
        hourlyRate: data.role === 'developer' ? (typeof data.hourlyRate === 'number' ? data.hourlyRate : undefined) : undefined,
        portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
        resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
        resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
        pastProjects: data.role === 'developer' ? (data.pastProjects || undefined) : undefined,
      };
      return user;
    } else {
      console.warn(`[firebaseService] User with ID '${userId}' not found in Firestore.`);
      return null;
    }
  } catch (error) {
    console.error(`[firebaseService] Error fetching user by ID ${userId} from Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch user ${userId} from database: ${error.message}`);
    }
    throw new Error(`Could not fetch user ${userId} from database due to an unknown error.`);
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!email) {
    console.warn("[firebaseService] getUserByEmail called with no email");
    return null;
  }

  const lowercasedEmail = email.toLowerCase(); // Ensure check is case-insensitive

  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where("email", "==", lowercasedEmail),
      limit(1)
    );
    const querySnapshot = await getDocs(usersQuery);

    if (!querySnapshot.empty) {
      const userDocSnap = querySnapshot.docs[0];
      const data = userDocSnap.data();
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&size=100`;
      const user: User = {
        id: userDocSnap.id,
        name: data.name || "Unnamed User",
        email: data.email, // Already lowercased from storage
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
        skills: data.role === 'developer' ? (Array.isArray(data.skills) ? data.skills : []) : undefined,
        experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
        hourlyRate: data.role === 'developer' ? (typeof data.hourlyRate === 'number' ? data.hourlyRate : undefined) : undefined,
        portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
        resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
        resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
        pastProjects: data.role === 'developer' ? (data.pastProjects || undefined) : undefined,
      };
      return user;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`[firebaseService] Error fetching user by email ${lowercasedEmail} from Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch user by email from database: ${error.message}`);
    }
    throw new Error("Could not fetch user by email from database due to an unknown error.");
  }
}


export async function updateUser(userId: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'email' | 'role' | 'referralCode' | 'currentPlan' | 'planPrice' | 'accountStatus'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!userId) {
    throw new Error("User ID is required to update user.");
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const updateData: { [key: string]: any } = { ...data };

    // Fetch current user data to determine role for conditional field deletion
    const currentUserData = await getUserById(userId);
    if (!currentUserData) {
        throw new Error(`User ${userId} not found, cannot update.`);
    }
    const effectiveRole = currentUserData.role;

    // Handle specific fields that should be deleted if empty, rather than set to null or empty string
    if (updateData.hasOwnProperty('bio')) {
      updateData.bio = updateData.bio === null || updateData.bio === "" ? deleteField() : updateData.bio;
    }
    if (updateData.hasOwnProperty('avatarUrl') && (updateData.avatarUrl === "" || updateData.avatarUrl?.includes('placehold.co') || updateData.avatarUrl?.includes('ui-avatars.com'))) {
        // If avatar is empty or a placeholder, delete the field so Firestore uses default or it's simply not set
        updateData.avatarUrl = deleteField();
    }

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
        updateData.resumeFileUrl = updateData.resumeFileUrl?.trim() ? updateData.resumeFileUrl.trim() : deleteField();
      }
       if (updateData.hasOwnProperty('resumeFileName')) {
        updateData.resumeFileName = updateData.resumeFileName?.trim() ? updateData.resumeFileName.trim() : deleteField();
      }
       if (updateData.hasOwnProperty('pastProjects')) {
        updateData.pastProjects = updateData.pastProjects?.trim() ? updateData.pastProjects.trim() : deleteField();
      }
      if (updateData.hasOwnProperty('hourlyRate')) {
        // Ensure hourlyRate is a number or deleted
        const rate = updateData.hourlyRate;
        updateData.hourlyRate = (typeof rate === 'number' && rate >= 0) ? rate : deleteField();
      }
    } else { // If user is not a developer, ensure developer-specific fields are removed
      if (data.hasOwnProperty('skills')) updateData.skills = deleteField();
      if (data.hasOwnProperty('portfolioUrls')) updateData.portfolioUrls = deleteField();
      if (data.hasOwnProperty('experienceLevel')) updateData.experienceLevel = deleteField();
      if (data.hasOwnProperty('hourlyRate')) updateData.hourlyRate = deleteField();
      if (data.hasOwnProperty('resumeFileUrl')) updateData.resumeFileUrl = deleteField();
      if (data.hasOwnProperty('resumeFileName')) updateData.resumeFileName = deleteField();
      if (data.hasOwnProperty('pastProjects')) updateData.pastProjects = deleteField();
    }
    
    // Final pass to remove any fields that ended up as undefined after processing
    Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
            updateData[key] = deleteField();
        }
    });

    if (Object.keys(updateData).length > 0) {
        await updateDoc(userDocRef, updateData);
    } else {
        console.warn(`[firebaseService] UpdateUser called for ${userId} but no valid fields to update after processing.`);
    }

  } catch (error) {
    console.error(`[firebaseService] Error updating user ${userId} in Firestore: `, error);
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
      try {
        const projectEmailHtml = await getClientProjectPostedEmailTemplate(clientName, fetchedProject.name, fetchedProject.id);
        await sendEmail(clientEmail, `Your Project "${fetchedProject.name}" is Live!`, projectEmailHtml);
      } catch (emailError) {
        console.error(`[firebaseService] Failed to send project confirmation email for project ${fetchedProject.id}:`, emailError);
      }
    }
    return fetchedProject;
  } catch (error) {
    console.error("[firebaseService] Error adding project to Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not add project to database: ${error.message}`);
    }
    throw new Error("Could not add project to database due to an unknown error.");
  }
}


export async function getProjectsByClientId(clientId: string): Promise<Project[]> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!clientId) {
    console.warn("[firebaseService] getProjectsByClientId called with no clientId");
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
        console.warn(`[firebaseService] Skipping project ${docSnap.id} in getProjectsByClientId due to missing essential fields (name, clientId, or createdAt).`);
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
    console.error(`[firebaseService] Error fetching projects for client ${clientId} from Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch client projects from database: ${error.message}`);
    }
    throw new Error("Could not fetch client projects from database due to an unknown error.");
  }
}


export async function getProjectById(projectId: string): Promise<Project | null> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!projectId) {
    console.warn("[firebaseService] getProjectById called with no projectId");
    return null;
  }
  try {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectDocSnap = await getDoc(projectDocRef);

    if (projectDocSnap.exists()) {
      const data = projectDocSnap.data();

      if (!data.name || typeof data.name !== 'string') {
        console.warn(`[firebaseService] Project ${projectId} missing or invalid 'name'. Returning null.`);
        return null;
      }
      if (!data.clientId || typeof data.clientId !== 'string') {
        console.warn(`[firebaseService] Project ${projectId} missing or invalid 'clientId'. Returning null.`);
        return null;
      }
      const createdAtDate = safeCreateDate(data.createdAt);
      if (!createdAtDate) {
          console.warn(`[firebaseService] Project ${projectId} missing or invalid 'createdAt'. Returning null.`);
          return null;
      }
      let statusValue = data.status || "Unknown";
       if (!["Open", "In Progress", "Completed", "Cancelled", "Unknown"].includes(statusValue)) {
          console.warn(`[firebaseService] Project ${projectId} has invalid 'status': ${statusValue}. Setting to Unknown.`);
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
      console.warn(`[firebaseService] Project with ID '${projectId}' not found in Firestore.`);
      return null;
    }
  } catch (error) {
    console.error(`[firebaseService] Error fetching project by ID ${projectId} from Firestore: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch project ${projectId} from database: ${error.message}`);
    }
    throw new Error(`Could not fetch project ${projectId} from database due to an unknown error.`);
  }
}


export async function getAllProjects(): Promise<Project[]> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  try {
    const projectsQuery = query(collection(db, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(projectsQuery);
    const projects: Project[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAtDate = safeCreateDate(data.createdAt);
       if (!data.name || !data.clientId || !createdAtDate) {
        console.warn(`[firebaseService] Skipping project ${docSnap.id} in getAllProjects due to missing essential fields (name, clientId, or createdAt).`);
        return;
      }
      let statusValue = data.status || "Unknown";
      if (!["Open", "In Progress", "Completed", "Cancelled", "Unknown"].includes(statusValue)) {
         console.warn(`[firebaseService] Project ${docSnap.id} in getAllProjects has invalid 'status': ${statusValue}. Setting to Unknown.`);
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
    console.error("[firebaseService] Error fetching all projects from Firestore: ", error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch all projects from database: ${error.message}`);
    }
    throw new Error("Could not fetch all projects from database due to an unknown error.");
  }
}


export async function getReferredClients(currentUserReferralCode: string): Promise<User[]> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!currentUserReferralCode) {
    console.warn("[firebaseService] getReferredClients called with no currentUserReferralCode");
    return [];
  }
  try {
    const referredClientsQuery = query(
      collection(db, USERS_COLLECTION),
      where("referredByCode", "==", currentUserReferralCode),
      where("role", "==", "client"), // Ensure we only fetch clients
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(referredClientsQuery);
    const referredClientsData: User[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&size=100`;
      referredClientsData.push({
        id: docSnap.id,
        name: data.name || "Unnamed User",
        email: data.email || "No email",
        role: data.role, // Should be 'client' due to query
        createdAt: safeCreateDate(data.createdAt) || new Date(),
        bio: data.bio || "Client referred to CodeCrafter.",
        avatarUrl: data.avatarUrl || defaultAvatar,
        referralCode: data.referralCode || undefined, // Their own referral code
        referredByCode: data.referredByCode, // The code they were referred by
        currentPlan: data.currentPlan || "Free Tier",
        planPrice: data.planPrice || "$0/month",
        isFlagged: data.isFlagged === true,
        accountStatus: data.accountStatus || 'active', // Referred clients are active by default
        // Developer specific fields are not expected for clients
        skills: undefined,
        experienceLevel: undefined,
        hourlyRate: undefined,
        portfolioUrls: undefined,
        resumeFileUrl: undefined,
        resumeFileName: undefined,
        pastProjects: undefined,
      });
    });
    return referredClientsData;
  } catch (error) {
    console.error(`[firebaseService] Error fetching referred clients for code ${currentUserReferralCode}: `, error);
    if (error instanceof Error) {
      throw new Error(`Could not fetch referred clients: ${error.message}`);
    }
    throw new Error("Could not fetch referred clients due to an unknown error.");
  }
}


export async function toggleUserFlag(userId: string, currentFlagStatus: boolean): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!userId) throw new Error("User ID is required to toggle flag status.");

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, {
      isFlagged: !currentFlagStatus,
    });
  } catch (error) {
    console.error(`[firebaseService] Error toggling flag for user ${userId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Could not toggle flag status for user ${userId}: ${error.message}`);
    }
    throw new Error(`Could not toggle flag status for user ${userId} due to an unknown error.`);
  }
}


export async function addAdminActivityLog(logData: Omit<AdminActivityLog, 'id' | 'timestamp'>): Promise<void> {
  if (!db) {
    console.warn("[firebaseService] Admin Activity Log: Firestore is not initialized. Log will not be saved.");
    return; // Don't throw an error for logging failure, just warn.
  }

  const logEntry: Omit<AdminActivityLog, 'id'> = {
    ...logData,
    timestamp: serverTimestamp() as Timestamp, // Firestore will convert this to a Timestamp
  };

  try {
    await addDoc(collection(db, ADMIN_ACTIVITY_LOGS_COLLECTION), logEntry);
  } catch (error) {
    console.error("[firebaseService] Error adding admin activity log:", error);
    // Optionally, you could re-throw or handle this more explicitly if admin logs are critical
  }
}


export async function updateUserAccountStatus(userId: string, newStatus: AccountStatus, userEmail: string, userName: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!userId) throw new Error("User ID is required to update account status.");

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, {
      accountStatus: newStatus,
    });
    console.log(`[firebaseService] User ${userId} account status updated to ${newStatus}.`);

    try {
      if (newStatus === "active") {
        const approvedEmailHtml = await getDeveloperApprovedEmailTemplate(userName);
        await sendEmail(userEmail, "Your CodeCrafter Developer Account is Approved!", approvedEmailHtml);
      } else if (newStatus === "rejected") {
        const rejectedEmailHtml = await getDeveloperRejectedEmailTemplate(userName);
        await sendEmail(userEmail, "Update on Your CodeCrafter Developer Application", rejectedEmailHtml);
      }
      console.log(`[firebaseService] Account status notification email attempt for ${userEmail} (status: ${newStatus}) finished.`);
    } catch (emailError) {
        console.error(`[firebaseService] Failed to send account status notification email to ${userEmail} for status ${newStatus}:`, emailError);
    }
  } catch (error) {
    console.error(`[firebaseService] Error updating account status for user ${userId} to ${newStatus}:`, error);
    if (error instanceof Error) {
      throw new Error(`Could not update account status for user ${userId}: ${error.message}`);
    }
    throw new Error(`Could not update account status for user ${userId} due to an unknown error.`);
  }
}
