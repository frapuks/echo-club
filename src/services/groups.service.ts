import {
  collection,
  query,
  where,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type {
  GroupWithId,
  Group,
  GroupMember,
  GroupMemberWithProfile,
  GroupRole,
} from "../types/group";
import type { UserProfile } from "../types/user";

export async function getGroup(groupId: string): Promise<GroupWithId | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Group) };
}

export async function getClubGroups(clubId: string): Promise<GroupWithId[]> {
  const q = query(collection(db, "groups"), where("clubId", "==", clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Group) }));
}

export async function createGroup(
  clubId: string,
  name: string
): Promise<string> {
  const ref = await addDoc(collection(db, "groups"), {
    name,
    clubId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGroup(
  groupId: string,
  data: { name: string }
): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), data);
}

export async function deleteGroup(groupId: string): Promise<void> {
  // Delete all members of the group first
  const q = query(
    collection(db, "groupMembers"),
    where("groupId", "==", groupId)
  );
  const snapshot = await getDocs(q);
  const deletes = snapshot.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletes);

  await deleteDoc(doc(db, "groups", groupId));
}

export async function getGroupMembers(
  groupId: string
): Promise<GroupMemberWithProfile[]> {
  const q = query(
    collection(db, "groupMembers"),
    where("groupId", "==", groupId)
  );
  const snapshot = await getDocs(q);
  const memberships = snapshot.docs.map((d) => ({
    memberId: d.id,
    ...(d.data() as GroupMember),
  }));

  // Fetch profiles for each member
  const results: GroupMemberWithProfile[] = [];
  for (const m of memberships) {
    const userSnap = await getDocs(
      query(collection(db, "users"), where("__name__", "==", m.userId))
    );
    if (!userSnap.empty) {
      const profile = userSnap.docs[0].data() as UserProfile;
      results.push({
        memberId: m.memberId,
        userId: m.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        role: m.role,
      });
    }
  }

  return results;
}

export async function addGroupMember(
  groupId: string,
  clubId: string,
  userId: string,
  role: GroupRole
): Promise<void> {
  // Check if already a member
  const q = query(
    collection(db, "groupMembers"),
    where("groupId", "==", groupId),
    where("userId", "==", userId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error("ALREADY_MEMBER");
  }

  await addDoc(collection(db, "groupMembers"), {
    groupId,
    clubId,
    userId,
    role,
    createdAt: serverTimestamp(),
  });
}

export async function getUserGroupIds(userId: string): Promise<string[]> {
  const q = query(
    collection(db, "groupMembers"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => (d.data() as GroupMember).groupId);
}

export async function setUserGroups(
  userId: string,
  clubId: string,
  groupIds: string[],
  currentGroupIds: string[]
): Promise<void> {
  const toAdd = groupIds.filter((id) => !currentGroupIds.includes(id));
  const toRemove = currentGroupIds.filter((id) => !groupIds.includes(id));

  // Remove memberships
  for (const groupId of toRemove) {
    const q = query(
      collection(db, "groupMembers"),
      where("groupId", "==", groupId),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  }

  // Add memberships
  for (const groupId of toAdd) {
    await addDoc(collection(db, "groupMembers"), {
      groupId,
      clubId,
      userId,
      role: "player" as GroupRole,
      createdAt: serverTimestamp(),
    });
  }
}

export async function removeGroupMember(memberId: string): Promise<void> {
  await deleteDoc(doc(db, "groupMembers", memberId));
}

export async function updateGroupMemberRole(
  memberId: string,
  role: GroupRole
): Promise<void> {
  await updateDoc(doc(db, "groupMembers", memberId), { role });
}
