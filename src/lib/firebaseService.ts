
// src/lib/firebaseService.ts
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, Timestamp, where, addDoc, updateDoc, serverTimestamp, deleteField, type FieldValue, limit } from "firebase/firestore";
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

// Helper to ensure date is constructed correctly from various Firestore timestamp formats
function safeCreateDate(timestamp: any): Date | undefined {
    if (!timestamp) return undefined;
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
        const date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
         if (!isNaN(date.getTime())) return date;
    }
    console.warn("safeCreateDate encountered an unknown timestamp format:", timestamp);
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


export async function addUser(
  userData: Omit<User, 'id' | 'createdAt' | 'referralCode' | 'currentPlan' | 'planPrice' | 'isFlagged' | 'accountStatus' | 'avatarUrl' | 'bio'> & { id?: string, referredByCode?: string }
): Promise<User> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");

  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id;
  const generatedReferralCode = `CODECRAFT_${userId.substring(0, 8).toUpperCase()}`;
  const defaultAvatar = `https://placehold.co/100x100.png?text=${getInitialsForDefaultAvatar(userData.name)}`;

  const userDocumentData: Partial<User> = { // Use Partial<User> for flexibility
    id: userId, // Ensure ID is part of the data to be set
    name: userData.name,
    email: userData.email.toLowerCase(),
    role: userData.role,
    createdAt: serverTimestamp() as Timestamp, // serverTimestamp for Firestore
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
    userDocumentData.portfolioUrls = userData.portfolioUrls || [];
    userDocumentData.experienceLevel = userData.experienceLevel || '';
    userDocumentData.resumeFileUrl = userData.resumeFileUrl || undefined;
    userDocumentData.resumeFileName = userData.resumeFileName || undefined;
    userDocumentData.pastProjects = userData.pastProjects || undefined;
  }

  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), userDocumentData);

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


export async function getAllUsers(): Promise<User[]> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  try {
    const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(usersQuery);
    const users: User[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const defaultAvatar = `https://placehold.co/100x100.png?text=${getInitialsForDefaultAvatar(data.name)}`;
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
        portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
        experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
        resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
        resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
        pastProjects: data.role === 'developer' ? (data.pastProjects || undefined) : undefined,
      };
      users.push(user);
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
      const defaultAvatar = `https://placehold.co/100x100.png?text=${getInitialsForDefaultAvatar(data.name)}`;
      const user: User = {
        id: userDocSnap.id,
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
        skills: data.role === 'developer' ? (Array.isArray(data.skills) ? data.skills : []) : undefined,
        portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
        experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
        resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
        resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
        pastProjects: data.role === 'developer' ? (data.pastProjects || undefined) : undefined,
      };
      return user;
    } else {
      console.warn(`User with ID '${userId}' not found in Firestore.`);
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

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!db) throw new Error("Firestore is not initialized. Check Firebase configuration.");
  if (!email) {
    console.warn("getUserByEmail called with no email");
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
      const data = userDocSnap.data();
      const defaultAvatar = `https://placehold.co/100x100.png?text=${getInitialsForDefaultAvatar(data.name)}`;
      const user: User = {
        id: userDocSnap.id,
        name: data.name || "Unnamed User",
        email: data.email, 
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
        skills: data.role === 'developer' ? (Array.isArray(data.skills) ? data.skills : []) : undefined,
        portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
        experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
        resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
        resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
        pastProjects: data.role === 'developer' ? (data.pastProjects || undefined) : undefined,
      };
      return user;
    } else {
      return null; 
    }
  } catch (error) {
    console.error(`Error fetching user by email ${lowercasedEmail} from Firestore: `, error);
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

    const currentUserData = await getUserById(userId);
    if (!currentUserData) {
        throw new Error(`User ${userId} not found, cannot update.`);
    }
    const effectiveRole = currentUserData.role;

    // Handle specific fields based on role and potential deletion
    if (updateData.hasOwnProperty('bio')) {
      updateData.bio = updateData.bio === null || updateData.bio === "" ? deleteField() : updateData.bio;
    }
    if (updateData.hasOwnProperty('avatarUrl') && (updateData.avatarUrl === "" || updateData.avatarUrl === `https://placehold.co/100x100.png?text=${getInitialsForDefaultAvatar(currentUserData.name)}`)) {
        updateData.avatarUrl = deleteField();
    }


    if (effectiveRole === 'developer') {
      if (updateData.hasOwnProperty('skills')) {
        updateData.skills = Array.isArray(updateData.skills) ? updateData.skills : [];
      }
      if (updateData.hasOwnProperty('portfolioUrls')) {
         updateData.portfolioUrls = Array.isArray(updateData.portfolioUrls) ? updateData.portfolioUrls : [];
      }
      if (updateData.hasOwnProperty('experienceLevel')) {
        updateData.experienceLevel = typeof updateData.experienceLevel === 'string' ? updateData.experienceLevel : '';
      }
      if (updateData.hasOwnProperty('resumeFileUrl')) {
        updateData.resumeFileUrl = updateData.resumeFileUrl?.trim() || deleteField();
      }
      if (updateData.hasOwnProperty('resumeFileName')) {
        updateData.resumeFileName = updateData.resumeFileName?.trim() || deleteField();
      }
      if (updateData.hasOwnProperty('pastProjects')) {
        updateData.pastProjects = updateData.pastProjects?.trim() || deleteField();
      }
    } else { 
      if (data.hasOwnProperty('skills')) updateData.skills = deleteField();
      if (data.hasOwnProperty('portfolioUrls')) updateData.portfolioUrls = deleteField();
      if (data.hasOwnProperty('experienceLevel')) updateData.experienceLevel = deleteField();
      if (data.hasOwnProperty('resumeFileUrl')) updateData.resumeFileUrl = deleteField();
      if (data.hasOwnProperty('resumeFileName')) updateData.resumeFileName = deleteField();
      if (data.hasOwnProperty('pastProjects')) updateData.pastProjects = deleteField();
    }
    
    Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
            delete updateData[key]; 
        }
    });

    if (Object.keys(updateData).length > 0) {
        await updateDoc(userDocRef, updateData);
    } else {
        console.warn(`UpdateUser called for ${userId} but no valid fields to update after processing.`);
    }

  } catch (error) {
    console.error(`Error updating user ${userId} in Firestore: `, error);
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
      createdAt: serverTimestamp() as Timestamp,
    };
    const projectDocRef = await addDoc(collection(db, PROJECTS_COLLECTION), projectWithMetadata);

    const fetchedProject = await getProjectById(projectDocRef.id);
    if (!fetchedProject) throw new Error(`Project ${projectDocRef.id} was supposedly added but could not be retrieved.`);

    if (clientEmail && clientName) {
      try {
        const projectEmailHtml = await getClientProjectPostedEmailTemplate(clientName, fetchedProject.name, fetchedProject.id);
        await sendEmail(clientEmail, `Your Project "${fetchedProject.name}" is Live!`, projectEmailHtml);
      } catch (emailError) {
        console.error("Failed to send project confirmation email:", emailError);
      }
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
      projects.push({
        id: docSnap.id,
        name: data.name || "Unnamed Project",
        description: data.description || "",
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        availability: data.availability || "Not specified",
        timeZone: data.timeZone || "Not specified",
        status: data.status || "Unknown",
        clientId: data.clientId, 
        createdAt: safeCreateDate(data.createdAt) || new Date(), 
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
      return {
        id: projectDocSnap.id,
        name: data.name || "Unnamed Project",
        description: data.description || "",
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        availability: data.availability || "Not specified",
        timeZone: data.timeZone || "Not specified",
        status: data.status || "Unknown",
        clientId: data.clientId,
        createdAt: safeCreateDate(data.createdAt) || new Date(),
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
        name: data.name || "Unnamed Project",
        description: data.description || "",
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        availability: data.availability || "Not specified",
        timeZone: data.timeZone || "Not specified",
        status: data.status || "Unknown",
        clientId: data.clientId,
        createdAt: safeCreateDate(data.createdAt) || new Date(),
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
      const defaultAvatar = `https://placehold.co/100x100.png?text=${getInitialsForDefaultAvatar(data.name)}`;
      referredClientsData.push({
        id: docSnap.id,
        name: data.name || "Unnamed User",
        email: data.email || "No email",
        role: data.role, 
        createdAt: safeCreateDate(data.createdAt),
        bio: data.bio || "Client referred to CodeCrafter.",
        avatarUrl: data.avatarUrl || defaultAvatar,
        referralCode: data.referralCode || undefined,
        referredByCode: data.referredByCode, 
        currentPlan: data.currentPlan || "Free Tier",
        planPrice: data.planPrice || "$0/month",
        isFlagged: data.isFlagged === true,
        accountStatus: data.accountStatus || 'active',
        skills: data.role === 'developer' ? (Array.isArray(data.skills) ? data.skills : []) : undefined,
        portfolioUrls: data.role === 'developer' ? (Array.isArray(data.portfolioUrls) ? data.portfolioUrls : []) : undefined,
        experienceLevel: data.role === 'developer' ? (data.experienceLevel || '') as User["experienceLevel"] : undefined,
        resumeFileUrl: data.role === 'developer' ? (data.resumeFileUrl || undefined) : undefined,
        resumeFileName: data.role === 'developer' ? (data.resumeFileName || undefined) : undefined,
        pastProjects: data.role === 'developer' ? (data.pastProjects || undefined) : undefined,
      });
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


export async function addAdminActivityLog(logData: Omit<AdminActivityLog, 'id' | 'timestamp'>): Promise<void> {
  if (!db) {
    console.warn("Admin Activity Log: Firestore is not initialized. Log will not be saved.");
    return; 
  }

  const logEntry: Omit<AdminActivityLog, 'id'> = {
    ...logData,
    timestamp: serverTimestamp() as Timestamp, 
  };

  try {
    await addDoc(collection(db, ADMIN_ACTIVITY_LOGS_COLLECTION), logEntry);
  } catch (error) {
    console.error("Error adding admin activity log:", error);
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

    if (newStatus === "active") {
      const approvedEmailHtml = await getDeveloperApprovedEmailTemplate(userName);
      await sendEmail(userEmail, "Your CodeCrafter Developer Account is Approved!", approvedEmailHtml);
    } else if (newStatus === "rejected") {
      const rejectedEmailHtml = await getDeveloperRejectedEmailTemplate(userName);
      await sendEmail(userEmail, "Update on Your CodeCrafter Developer Application", rejectedEmailHtml);
    }
  } catch (error) {
    console.error(`Error updating account status for user ${userId} to ${newStatus}:`, error);
    if (error instanceof Error) {
      throw new Error(`Could not update account status for user ${userId}: ${error.message}`);
    }
    throw new Error(`Could not update account status for user ${userId} due to an unknown error.`);
  }
}
