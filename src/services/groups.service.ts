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
        roles: m.roles,
        position: profile.position,
      });
    }
  }

  return results;
}

export async function addGroupMember(
  groupId: string,
  clubId: string,
  userId: string,
  roles: GroupRole[]
): Promise<void> {
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
    roles,
    createdAt: serverTimestamp(),
  });
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

export async function removeGroupMember(memberId: string): Promise<void> {
  await deleteDoc(doc(db, "groupMembers", memberId));
}

export async function updateGroupMemberRoles(
  memberId: string,
  roles: GroupRole[]
): Promise<void> {
  await updateDoc(doc(db, "groupMembers", memberId), { roles });
}

