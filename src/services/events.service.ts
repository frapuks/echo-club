import {
  collection,
  query,
  where,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { ClubEvent, EventWithId, CreateEventData } from "../types/event";

export interface SeriesSlotMapping {
  originalDay: number;
  originalTime: string;
  newDay: number;
  newTime: string;
}

export interface SeriesSlotKey {
  day: number;
  time: string;
}
import { getUserGroupMemberships } from "./groups.service";

export async function getUserEvents(userId: string, clubId: string): Promise<EventWithId[]> {
  const memberships = await getUserGroupMemberships(userId);
  const groupIds = memberships.map((m) => m.groupId);

  const resultsById = new Map<string, EventWithId>();
  const addDocs = (docs: { id: string; data: () => unknown }[]) => {
    for (const d of docs) {
      if (!resultsById.has(d.id)) {
        resultsById.set(d.id, { id: d.id, ...(d.data() as ClubEvent) });
      }
    }
  };

  // Events whose primary group is one of the user's groups
  if (groupIds.length > 0) {
    // Firestore "in" limit is 30
    for (let i = 0; i < groupIds.length; i += 30) {
      const chunk = groupIds.slice(i, i + 30);
      const primaryQ = query(
        collection(db, "events"),
        where("clubId", "==", clubId),
        where("groupId", "in", chunk),
      );
      const primarySnap = await getDocs(primaryQ);
      addDocs(primarySnap.docs);
    }
  }

  // Events where the user is invited individually
  const invitedUserQ = query(
    collection(db, "events"),
    where("clubId", "==", clubId),
    where("invitedUserIds", "array-contains", userId),
  );
  const invitedUserSnap = await getDocs(invitedUserQ);
  addDocs(invitedUserSnap.docs);

  return Array.from(resultsById.values());
}

export async function getAllClubEvents(clubId: string): Promise<EventWithId[]> {
  const q = query(collection(db, "events"), where("clubId", "==", clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as ClubEvent) }));
}

export async function getEvent(eventId: string): Promise<EventWithId | null> {
  const snap = await getDoc(doc(db, "events", eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as ClubEvent) };
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

export async function createEventsBatch(
  events: CreateEventData[],
  createdBy: string,
): Promise<EventWithId[]> {
  const created: EventWithId[] = [];
  // Firestore batch limit is 500 — chunk to stay safe
  for (let i = 0; i < events.length; i += 400) {
    const chunk = events.slice(i, i + 400);
    const batch = writeBatch(db);
    const refs = chunk.map(() => doc(collection(db, "events")));
    chunk.forEach((data, idx) => {
      batch.set(refs[idx], {
        ...data,
        createdBy,
        createdAt: serverTimestamp(),
      });
      created.push({ ...data, id: refs[idx].id, createdBy } as unknown as EventWithId);
    });
    await batch.commit();
  }
  return created;
}

export async function updateEvent(
  eventId: string,
  data: CreateEventData,
): Promise<void> {
  await updateDoc(doc(db, "events", eventId), data);
}

export async function setEventResponses(
  eventId: string,
  responses: Record<string, "present" | "absent">,
): Promise<void> {
  await updateDoc(doc(db, "events", eventId), { responses });
}

export async function updateSeries(
  seriesId: string,
  clubId: string,
  sharedData: { groupId: string; location: string; name: string },
  slotMappings: SeriesSlotMapping[],
  deletedSlots: SeriesSlotKey[],
  newEndDate: Date | null,
  cutoff: Date,
  createdBy: string,
): Promise<{ updated: EventWithId[]; deletedIds: string[]; created: EventWithId[] }> {
  const q = query(
    collection(db, "events"),
    where("clubId", "==", clubId),
    where("seriesId", "==", seriesId),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return { updated: [], deletedIds: [], created: [] };

  // Only impact future events
  const future = snapshot.docs.filter(
    (d) => (d.data() as ClubEvent).date.toDate() >= cutoff,
  );

  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  // Convert JS weekday (0=Sun..6=Sat) to European (0=Mon..6=Sun) for date shifts
  const toEuro = (d: number) => (d + 6) % 7;

  const updated: EventWithId[] = [];
  const deletedIds: string[] = [];
  // Track latest effective date per kept slot key `${newDay}_${newTime}`
  const remainingSlotMaxDate = new Map<string, Date>();

  for (let i = 0; i < future.length; i += 400) {
    const chunk = future.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const d of chunk) {
      const data = d.data() as ClubEvent;
      const dt = data.date.toDate();
      const day = dt.getDay();
      const time = fmtTime(dt);

      if (deletedSlots.some((s) => s.day === day && s.time === time)) {
        batch.delete(d.ref);
        deletedIds.push(d.id);
        continue;
      }

      const mapping = slotMappings.find(
        (m) => m.originalDay === day && m.originalTime === time,
      );

      let effectiveDate = dt;
      let effDay = day;
      let effTime = time;
      const slotChanged =
        mapping && (mapping.newDay !== mapping.originalDay || mapping.newTime !== mapping.originalTime);
      if (slotChanged && mapping) {
        const dayDiff = toEuro(mapping.newDay) - toEuro(mapping.originalDay);
        const newDt = new Date(dt);
        newDt.setDate(newDt.getDate() + dayDiff);
        const [h, mm] = mapping.newTime.split(":").map(Number);
        newDt.setHours(h, mm, 0, 0);
        effectiveDate = newDt;
        effDay = mapping.newDay;
        effTime = mapping.newTime;
      }

      if (newEndDate && effectiveDate > newEndDate) {
        batch.delete(d.ref);
        deletedIds.push(d.id);
        continue;
      }

      if (slotChanged) {
        const patch = { ...sharedData, date: Timestamp.fromDate(effectiveDate) };
        batch.update(d.ref, patch);
        updated.push({ ...data, ...patch, id: d.id } as EventWithId);
      } else {
        batch.update(d.ref, sharedData);
        updated.push({ ...data, ...sharedData, id: d.id } as EventWithId);
      }

      const slotKey = `${effDay}_${effTime}`;
      const prev = remainingSlotMaxDate.get(slotKey);
      if (!prev || effectiveDate > prev) remainingSlotMaxDate.set(slotKey, effectiveDate);
    }
    await batch.commit();
  }

  const created: EventWithId[] = [];
  if (newEndDate) {
    const deletedKeys = new Set(deletedSlots.map((s) => `${s.day}_${s.time}`));
    const remainingMappings = slotMappings.filter(
      (m) => !deletedKeys.has(`${m.originalDay}_${m.originalTime}`),
    );
    const extendedSlots = new Set<string>();
    const toCreate: CreateEventData[] = [];

    for (const mapping of remainingMappings) {
      const slotKey = `${mapping.newDay}_${mapping.newTime}`;
      if (extendedSlots.has(slotKey)) continue;
      extendedSlots.add(slotKey);

      const lastDate = remainingSlotMaxDate.get(slotKey);
      if (!lastDate) continue;

      const cursor = new Date(lastDate);
      cursor.setDate(cursor.getDate() + 7);
      while (cursor <= newEndDate) {
        const [h, mm] = mapping.newTime.split(":").map(Number);
        const occ = new Date(cursor);
        occ.setHours(h, mm, 0, 0);
        toCreate.push({
          type: "training",
          clubId,
          groupId: sharedData.groupId,
          date: Timestamp.fromDate(occ),
          location: sharedData.location,
          name: sharedData.name,
          seriesId,
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    }

    for (let i = 0; i < toCreate.length; i += 400) {
      const chunk = toCreate.slice(i, i + 400);
      const batch = writeBatch(db);
      const refs = chunk.map(() => doc(collection(db, "events")));
      chunk.forEach((data, idx) => {
        batch.set(refs[idx], { ...data, createdBy, createdAt: serverTimestamp() });
        created.push({ ...data, id: refs[idx].id, createdBy } as unknown as EventWithId);
      });
      await batch.commit();
    }
  }

  return { updated, deletedIds, created };
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, "events", eventId));
}

export async function deleteSeriesFuture(
  seriesId: string,
  clubId: string,
  cutoff: Date,
): Promise<string[]> {
  const q = query(
    collection(db, "events"),
    where("clubId", "==", clubId),
    where("seriesId", "==", seriesId),
  );
  const snapshot = await getDocs(q);
  const future = snapshot.docs.filter(
    (d) => (d.data() as ClubEvent).date.toDate() >= cutoff,
  );
  const deletedIds: string[] = [];
  for (let i = 0; i < future.length; i += 400) {
    const chunk = future.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
      deletedIds.push(d.id);
    }
    await batch.commit();
  }
  return deletedIds;
}
