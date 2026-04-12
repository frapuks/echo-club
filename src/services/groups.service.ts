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
  GroupRole,
} from "../types/group";

export async function getGroup(groupId: string): Promise<GroupWithId | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Group) };
}

export async function getCategoryGroups(
  clubId: string,
  category: string
): Promise<GroupWithId[]> {
  const q = query(
    collection(db, "groups"),
    where("clubId", "==", clubId),
    where("category", "==", category)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Group) }));
}

export async function createGroup(
  clubId: string,
  name: string,
  category: string
): Promise<string> {
  const ref = await addDoc(collection(db, "groups"), {
    name,
    clubId,
    category,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export interface UserGroupMembership {
  groupId: string;
  roles: GroupRole[];
}

export async function getUserGroupMemberships(
  userId: string
): Promise<UserGroupMembership[]> {
  const q = query(
    collection(db, "groupMembers"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data() as GroupMember;
    return { groupId: data.groupId, roles: data.roles };
  });
}

export async function setUserGroupsForRole(
  userId: string,
  clubId: string,
  newGroupIds: string[],
  currentGroupIds: string[],
  role: GroupRole
): Promise<void> {
  const toAdd = newGroupIds.filter((id) => !currentGroupIds.includes(id));
  const toRemove = currentGroupIds.filter((id) => !newGroupIds.includes(id));

  for (const groupId of toRemove) {
    const q = query(
      collection(db, "groupMembers"),
      where("groupId", "==", groupId),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const data = d.data() as GroupMember;
      const remainingRoles = data.roles.filter((r) => r !== role);
      if (remainingRoles.length === 0) {
        await deleteDoc(d.ref);
      } else {
        await updateDoc(d.ref, { roles: remainingRoles });
      }
    }
  }

  for (const groupId of toAdd) {
    const q = query(
      collection(db, "groupMembers"),
      where("groupId", "==", groupId),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await addDoc(collection(db, "groupMembers"), {
        groupId,
        clubId,
        userId,
        roles: [role],
        createdAt: serverTimestamp(),
      });
    } else {
      const d = snapshot.docs[0];
      const data = d.data() as GroupMember;
      if (!data.roles.includes(role)) {
        await updateDoc(d.ref, { roles: [...data.roles, role] });
      }
    }
  }
}


