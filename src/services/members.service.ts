import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type { UserProfile } from "../types/user";
import type { Position } from "../types/group";

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

export async function getCategoryPlayers(
  clubId: string,
  category: string
): Promise<MemberWithId[]> {
  const q = query(
    collection(db, "users"),
    where("clubId", "==", clubId),
    where("playerCategories", "array-contains", category)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    uid: d.id,
    ...(d.data() as UserProfile),
  }));
}

export async function getCategoryCoaches(
  clubId: string,
  category: string
): Promise<MemberWithId[]> {
  const q = query(
    collection(db, "users"),
    where("clubId", "==", clubId),
    where("coachCategories", "array-contains", category)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    uid: d.id,
    ...(d.data() as UserProfile),
  }));
}

export async function setMemberCoachCategories(
  uid: string,
  categories: string[]
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { coachCategories: categories });
}

export async function setMemberPlayerCategories(
  uid: string,
  categories: string[]
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { playerCategories: categories });
}

export async function setMemberPosition(
  uid: string,
  position: Position | null
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { position: position ?? null });
}

export async function setMemberAdmin(
  uid: string,
  admin: boolean
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { admin });
}
