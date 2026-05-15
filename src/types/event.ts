import type { Timestamp } from "firebase/firestore";

export type EventType = "training" | "match" | "other";

interface BaseEvent {
  clubId: string;
  groupId: string;
  date: Timestamp;
  location: string;
  invitedUserIds?: string[];
  seriesId?: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface TrainingEvent extends BaseEvent {
  type: "training";
  name: string;
}

export interface MatchEvent extends BaseEvent {
  type: "match";
  opponent: string;
  home: boolean;
  meetingTime: Timestamp;
}

export interface OtherEvent extends BaseEvent {
  type: "other";
  name: string;
  description?: string;
}

export type ClubEvent = TrainingEvent | MatchEvent | OtherEvent;

export type EventWithId = ClubEvent & { id: string };

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type CreateEventData = DistributiveOmit<ClubEvent, "createdAt" | "createdBy">;
