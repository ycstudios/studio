
// src/lib/firebaseService.ts
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "./firebase"; // Your Firebase app instance
import type { User } from "@/types";

const USERS_COLLECTION = "users";

/**
 * Adds a new user to the Firestore 'users' collection.
 * Includes a createdAt timestamp.
 */
export async function addUser(userData: Omit<User, 'id'> & { id?: string }): Promise<User> {
  const userId = userData.id || doc(collection(db, USERS_COLLECTION)).id; // Generate ID if not provided
  const userWithTimestamp: User & { createdAt: Timestamp } = {
    ...userData,
    id: userId,
    createdAt: Timestamp.now(),
    // Ensure default empty strings for optional fields if not provided, to avoid Firestore errors
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
      // Note: Timestamps will be Firestore Timestamps. Convert to Date if needed, or handle in UI.
      // For simplicity, we're casting directly. Ensure your User type can handle Timestamps or convert.
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
      return { id: userDocSnap.id, ...userDocSnap.data() } as User;
    } else {
      console.log("No such user found in Firestore with ID:", userId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by ID from Firestore: ", error);
    throw new Error("Could not fetch user from database.");
  }
}
