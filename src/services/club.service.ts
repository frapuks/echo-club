import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface Club {
  name: string;
  inviteCode: string;
  categories: string[];
}

export async function createClub(
  uid: string,
  clubName: string
): Promise<void> {
  const code = generateCode();

  const clubRef = await addDoc(collection(db, "clubs"), {
    name: clubName,
    inviteCode: code,
    categories: ["Seniors", "-18", "-17", "-15", "-13"],
    createdAt: serverTimestamp(),
    createdBy: uid,
  });

  await updateDoc(doc(db, "users", uid), {
    clubId: clubRef.id,
    admin: true,
  });
}

export async function updateClub(
  clubId: string,
  data: { name: string }
): Promise<void> {
  await updateDoc(doc(db, "clubs", clubId), data);
}

export async function updateClubCategories(
  clubId: string,
  categories: string[]
): Promise<void> {
  await updateDoc(doc(db, "clubs", clubId), { categories });
}

export async function getClub(clubId: string): Promise<Club | null> {
  const snap = await getDoc(doc(db, "clubs", clubId));
  return snap.exists() ? (snap.data() as Club) : null;
}

export async function regenerateInviteCode(clubId: string): Promise<string> {
  const code = generateCode();
  await updateDoc(doc(db, "clubs", clubId), { inviteCode: code });
  return code;
}

export async function joinClub(uid: string, code: string): Promise<void> {
  const q = query(
    collection(db, "clubs"),
    where("inviteCode", "==", code.toUpperCase().trim())
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("INVALID_INVITATION_CODE");
  }

  const clubDoc = snapshot.docs[0];

  await updateDoc(doc(db, "users", uid), {
    clubId: clubDoc.id,
    admin: false,
  });
}

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
