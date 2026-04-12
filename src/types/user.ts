import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  clubId?: string;
  admin?: boolean;
  createdAt: Timestamp;
}
