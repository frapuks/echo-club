import type { Timestamp } from "firebase/firestore";
export type GroupRole = "coach" | "player";

export const POSITIONS = [
  "Gardien",
  "Pivot",
  "Ailier droit",
  "Arrière droit",
  "Ailier gauche",
  "Arrière gauche",
  "Demi centre",
] as const;

export type Position = (typeof POSITIONS)[number];

export interface Group {
  name: string;
  clubId: string;
  category: string;
  createdAt: Timestamp;
}

export interface GroupWithId extends Group {
  id: string;
}

export interface GroupMember {
  groupId: string;
  clubId: string;
  userId: string;
  roles: GroupRole[];
  createdAt: Timestamp;
}

