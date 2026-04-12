import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Invitation } from "../types/invitation";

export async function validateInvitationCode(
  code: string
): Promise<{ id: string; invitation: Invitation } | null> {
  const q = query(
    collection(db, "invitations"),
    where("code", "==", code.toUpperCase().trim()),
    where("used", "==", false)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, invitation: docSnap.data() as Invitation };
}

export async function consumeInvitation(
  invitationId: string,
  uid: string
): Promise<void> {
  const ref = doc(db, "invitations", invitationId);
  await updateDoc(ref, {
    used: true,
    usedBy: uid,
    usedAt: serverTimestamp(),
  });
}
