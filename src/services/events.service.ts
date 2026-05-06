import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { ClubEvent, EventWithId, CreateEventData } from "../types/event";
import { getUserGroupMemberships } from "./groups.service";

export async function getUserEvents(userId: string, clubId: string): Promise<EventWithId[]> {
  const memberships = await getUserGroupMemberships(userId);
  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) return [];

  // Firestore "in" limit is 30 values — chunk if needed
  const chunks: string[][] = [];
  for (let i = 0; i < groupIds.length; i += 30) {
    chunks.push(groupIds.slice(i, i + 30));
  }

  const results: EventWithId[] = [];
  for (const chunk of chunks) {
    const q = query(
      collection(db, "events"),
      where("clubId", "==", clubId),
      where("groupId", "in", chunk),
    );
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      results.push({ id: d.id, ...(d.data() as ClubEvent) });
    }
  }
  return results;
}

export async function getAllClubEvents(clubId: string): Promise<EventWithId[]> {
  const q = query(collection(db, "events"), where("clubId", "==", clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as ClubEvent) }));
}

export async function createEvent(
  data: CreateEventData,
  createdBy: string,
): Promise<string> {
  const ref = await addDoc(collection(db, "events"), {
    ...data,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, "events", eventId));
}
