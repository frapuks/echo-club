import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "coach" | "player";

export interface UserProfile {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  clubId: string;
  role: UserRole;
  createdAt: Timestamp;
  invitationCode: string;
}
