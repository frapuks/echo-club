import type { Timestamp } from "firebase/firestore";
import type { UserRole } from "./user";

export interface Invitation {
  code: string;
  clubId: string;
  role: UserRole;
  groupId?: string;
  categoryId?: string;
  used: boolean;
  usedBy?: string;
  usedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
}
