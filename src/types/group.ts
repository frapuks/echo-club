import type { Timestamp } from "firebase/firestore";

export type GroupRole = "coach" | "player";

export interface Group {
  name: string;
  clubId: string;
  createdAt: Timestamp;
}

export interface GroupWithId extends Group {
  id: string;
}

export interface GroupMember {
  groupId: string;
  clubId: string;
  userId: string;
  role: GroupRole;
  createdAt: Timestamp;
}

export interface GroupMemberWithProfile {
  memberId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: GroupRole;
}
