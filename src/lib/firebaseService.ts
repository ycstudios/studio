
// src/lib/firebaseService.ts
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, Timestamp, where, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase"; // Your Firebase app instance
import type { User, Project } from "@/types";

const USERS_COLLECTION = "users";
const PROJECTS_COLLECTION = "projects";

/**
 * Adds a new user to the Firestore 'users' collection.
 * Includes a createdAt timestamp.
 */
export async function addUser(userData: Omit<User, 'id' | 'createdAt'> & { id?: string }): Promise<User> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id;
  
  const userToSave: User = {
    ...userData,
    id: userId,
    createdAt: serverTimestamp() as Timestamp, // Use serverTimestamp for creation
    bio: userData.bio || `New ${userData.role} on CodeCrafter.`,
    skills: userData.skills || (userData.role === 'developer' ? [] : undefined),
    avatarUrl: userData.avatarUrl || `https://placehold.co/100x100.png?text=${userData.name?.[0]?.toUpperCase() || 'U'}`,
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), userToSave);
    console.log("User added to Firestore with ID:", userId);
    // Firestore serverTimestamp is an object; for immediate use, we might want current client time or re-fetch
    // For consistency, let's return what was intended to be saved, createdAt will be a server value
    return { ...userToSave, createdAt: new Date() }; // Approximate with client time for immediate return
  } catch (error) {
    console.error("Error adding user to Firestore: ", error);
    throw new Error("Could not add user to database.");
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date() 
      } as User);
    });
    console.log("Fetched all users from Firestore:", users.length);
    return users;
  } catch (error) {
    console.error("Error fetching all users from Firestore: ", error);
    throw new Error("Could not fetch users from database.");
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
      } as User;
    } else {
      console.log("No such user found in Firestore with ID:", userId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by ID from Firestore: ", error);
    throw new Error(`Could not fetch user ${userId} from database.`);
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
    await updateDoc(userDocRef, data);
    console.log("User updated in Firestore:", userId);
  } catch (error) {
    console.error("Error updating user in Firestore: ", error);
    throw new Error(`Could not update user ${userId} in database.`);
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
    return { 
      id: projectDocRef.id, 
      ...projectWithMetadata,
      createdAt: new Date() // Approximate with client time for immediate return
    } as Project;
  } catch (error) {
    console.error("Error adding project to Firestore: ", error);
    throw new Error("Could not add project to database.");
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date() 
      } as Project);
    });
    console.log(`Fetched ${projects.length} projects for client ID ${clientId} from Firestore.`);
    return projects;
  } catch (error) {
    console.error(`Error fetching projects for client ${clientId} from Firestore: `, error);
    throw new Error("Could not fetch client projects from database.");
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
      } as Project;
    } else {
      console.log("No such project found in Firestore with ID:", projectId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching project by ID from Firestore: ", error);
    throw new Error(`Could not fetch project ${projectId} from database.`);
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
      } as Project);
    });
    console.log("Fetched all projects from Firestore:", projects.length);
    return projects;
  } catch (error) {
    console.error("Error fetching all projects from Firestore: ", error);
    throw new Error("Could not fetch all projects from database.");
  }
}
