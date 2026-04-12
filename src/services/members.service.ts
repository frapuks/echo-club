import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type { UserProfile } from "../types/user";

export interface MemberWithId extends UserProfile {
  uid: string;
}

export async function getClubMembers(
  clubId: string
): Promise<MemberWithId[]> {
  const q = query(
    collection(db, "users"),
    where("clubId", "==", clubId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    uid: d.id,
    ...(d.data() as UserProfile),
  }));
}

export async function setMemberAdmin(
  uid: string,
  admin: boolean
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { admin });
}
