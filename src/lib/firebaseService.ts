
// src/lib/firebaseService.ts
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, Timestamp, where, addDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase"; // Your Firebase app instance
import type { User, Project } from "@/types";

const USERS_COLLECTION = "users";
const PROJECTS_COLLECTION = "projects";

/**
 * Adds a new user to the Firestore 'users' collection.
 * Includes a createdAt timestamp.
 */
export async function addUser(userData: Omit<User, 'id'> & { id?: string }): Promise<User> {
  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id; // Generate ID if not provided
  const userWithTimestamp: User = {
    ...userData,
    id: userId,
    createdAt: Timestamp.now(),
    bio: userData.bio || "", 
    skills: userData.skills || [],
    avatarUrl: userData.avatarUrl || "",
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), userWithTimestamp);
    console.log("User added to Firestore with ID:", userId);
    return userWithTimestamp;
  } catch (error) {
    console.error("Error adding user to Firestore: ", error);
    throw new Error("Could not add user to database.");
  }
}

/**
 * Fetches all users from the Firestore 'users' collection, ordered by name.
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("name", "asc"));
    const querySnapshot = await getDocs(usersQuery);
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
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
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      console.log("Fetched user by ID from Firestore:", userId);
      // Convert Firestore Timestamp to Date for client-side consistency if needed, or handle as Timestamp
      const data = userDocSnap.data();
      if (data.createdAt && data.createdAt.toDate) {
        data.createdAt = data.createdAt.toDate();
      }
      return { id: userDocSnap.id, ...data } as User;
    } else {
      console.log("No such user found in Firestore with ID:", userId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by ID from Firestore: ", error);
    throw new Error("Could not fetch user from database.");
  }
}

/**
 * Updates a user's document in Firestore.
 */
export async function updateUser(userId: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, data);
    console.log("User updated in Firestore:", userId);
  } catch (error) {
    console.error("Error updating user in Firestore: ", error);
    throw new Error("Could not update user in database.");
  }
}


/**
 * Adds a new project to the Firestore 'projects' collection.
 */
export async function addProject(
  projectData: Omit<Project, 'id' | 'createdAt' | 'status' | 'clientId'>, 
  clientId: string
): Promise<Project> {
  try {
    const projectWithTimestampAndClient = {
      ...projectData,
      clientId,
      status: "Open" as Project["status"], // Default status
      createdAt: Timestamp.now(),
    };
    const projectDocRef = await addDoc(collection(db, PROJECTS_COLLECTION), projectWithTimestampAndClient);
    console.log("Project added to Firestore with ID:", projectDocRef.id);
    return { 
      id: projectDocRef.id, 
      ...projectWithTimestampAndClient 
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
  try {
    const projectsQuery = query(
      collection(db, PROJECTS_COLLECTION), 
      where("clientId", "==", clientId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(projectsQuery);
    const projects: Project[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Convert Firestore Timestamp to Date
      if (data.createdAt && data.createdAt.toDate) {
        data.createdAt = data.createdAt.toDate();
      }
      projects.push({ id: doc.id, ...data } as Project);
    });
    console.log(`Fetched ${projects.length} projects for client ID ${clientId} from Firestore.`);
    return projects;
  } catch (error) {
    console.error(`Error fetching projects for client ${clientId} from Firestore: `, error);
    throw new Error("Could not fetch projects from database.");
  }
}

/**
 * Fetches a single project by its ID from the Firestore 'projects' collection.
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectDocSnap = await getDoc(projectDocRef);

    if (projectDocSnap.exists()) {
      console.log("Fetched project by ID from Firestore:", projectId);
      const data = projectDocSnap.data();
      if (data.createdAt && data.createdAt.toDate) {
        data.createdAt = data.createdAt.toDate();
      }
      return { id: projectDocSnap.id, ...data } as Project;
    } else {
      console.log("No such project found in Firestore with ID:", projectId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching project by ID from Firestore: ", error);
    throw new Error("Could not fetch project from database.");
  }
}

/**
 * Fetches all projects from the Firestore 'projects' collection, ordered by creation date (descending).
 */
export async function getAllProjects(): Promise<Project[]> {
  try {
    const projectsQuery = query(collection(db, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(projectsQuery);
    const projects: Project[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.createdAt && data.createdAt.toDate) {
        data.createdAt = data.createdAt.toDate();
      }
      projects.push({ id: doc.id, ...data } as Project);
    });
    console.log("Fetched all projects from Firestore:", projects.length);
    return projects;
  } catch (error) {
    console.error("Error fetching all projects from Firestore: ", error);
    throw new Error("Could not fetch all projects from database.");
  }
}
