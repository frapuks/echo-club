import type { Timestamp } from "firebase/firestore";
import type { Position } from "./group";

export interface UserProfile {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  clubId?: string;
  admin?: boolean;
  coachCategories: string[];
  playerCategories: string[];
  position?: Position;
  createdAt: Timestamp;
}
