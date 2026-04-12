import type { Timestamp } from "firebase/firestore";

export interface Invitation {
  code: string;
  clubId: string;
  groupId?: string;
  categoryId?: string;
  used: boolean;
  usedBy?: string;
  usedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
}
