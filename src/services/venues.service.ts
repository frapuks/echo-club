import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Venue, VenueWithId } from "../types/venue";

export async function getClubVenues(clubId: string): Promise<VenueWithId[]> {
  const q = query(collection(db, "venues"), where("clubId", "==", clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...(d.data() as Venue) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function createVenue(
  clubId: string,
  name: string,
  address: string,
  order: number,
): Promise<string> {
  const ref = await addDoc(collection(db, "venues"), {
    clubId,
    name,
    address,
    order,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateVenue(
  venueId: string,
  data: { name: string; address: string },
): Promise<void> {
  await updateDoc(doc(db, "venues", venueId), data);
}

export async function deleteVenue(venueId: string): Promise<void> {
  await deleteDoc(doc(db, "venues", venueId));
}

export async function reorderVenues(venueIds: string[]): Promise<void> {
  for (let i = 0; i < venueIds.length; i++) {
    await updateDoc(doc(db, "venues", venueIds[i]), { order: i });
  }
}
