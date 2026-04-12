import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import {
  validateInvitationCode,
  consumeInvitation,
} from "./invitation.service";
import type { UserRole } from "../types/user";

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  invitationCode: string;
}

export async function register(data: RegisterData): Promise<void> {
  const result = await validateInvitationCode(data.invitationCode);

  if (!result) {
    throw new Error("INVALID_INVITATION_CODE");
  }

  const { id: invitationId, invitation } = result;

  const credential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  );

  const uid = credential.user.uid;

  try {
    await setDoc(doc(db, "users", uid), {
      email: data.email,
      displayName: `${data.firstName} ${data.lastName}`,
      firstName: data.firstName,
      lastName: data.lastName,
      clubId: invitation.clubId,
      role: invitation.role as UserRole,
      createdAt: serverTimestamp(),
      invitationCode: invitation.code,
    });

    await consumeInvitation(invitationId, uid);
  } catch (error) {
    await credential.user.delete();
    throw error;
  }
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
