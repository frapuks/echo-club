import type { Timestamp } from "firebase/firestore";

export interface Venue {
  name: string;
  address: string;
  clubId: string;
  order?: number;
  createdAt: Timestamp;
}

export interface VenueWithId extends Venue {
  id: string;
}
