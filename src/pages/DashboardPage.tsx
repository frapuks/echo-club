import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Fab,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import { useAuth } from "../contexts/AuthContext";
import JoinClubPage from "./JoinClubPage";
import EventCard from "../components/events/EventCard";
import CreateEventDialog from "../components/events/CreateEventDialog";
import { getClub } from "../services/club.service";
import {
  getUserEvents,
  getAllClubEvents,
  createEvent,
  createEventsBatch,
  updateEvent,
  updateSeries,
  deleteEvent,
  deleteSeriesFuture,
} from "../services/events.service";
import {
  getCategoryGroups,
  getUserGroupMemberships,
  getGroup,
  getClubGroupMembers,
} from "../services/groups.service";
import { getClubVenues } from "../services/venues.service";
import { getClubMembers } from "../services/members.service";
import type { EventWithId, CreateEventData, EventType } from "../types/event";
import type { GroupWithId } from "../types/group";
import type { VenueWithId } from "../types/venue";
import type { InviteOption } from "../components/events/CreateEventDialog";

export default function DashboardPage() {
  const { user, userProfile } = useAuth();

  const [events, setEvents] = useState<EventWithId[]>([]);
  const [groups, setGroups] = useState<GroupWithId[]>([]);
  const [createGroups, setCreateGroups] = useState<GroupWithId[]>([]);
  const [inviteOptions, setInviteOptions] = useState<InviteOption[]>([]);
  const [venues, setVenues] = useState<VenueWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState<"all" | EventType | "past">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithId | null>(null);

  const isAdmin = userProfile?.admin === true;
  const coachCats = userProfile?.coachCategories ?? [];
  const canCreate = isAdmin || coachCats.length > 0;

  useEffect(() => {
    if (!user || !userProfile?.clubId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const evts = isAdmin
          ? await getAllClubEvents(userProfile.clubId!)
          : await getUserEvents(user.uid, userProfile.clubId!);
        setEvents(evts);
      } catch (e) {
        console.error("Failed to load events", e);
        setEvents([]);
      }

      let myGroups: GroupWithId[] = [];
      try {
        const club = await getClub(userProfile.clubId!);
        const catsToLoad = isAdmin ? (club?.categories ?? []) : coachCats;
        const allGroups: GroupWithId[] = [];
        for (const cat of catsToLoad) {
          const catGroups = await getCategoryGroups(userProfile.clubId!, cat);
          allGroups.push(...catGroups);
        }
        myGroups = allGroups;
        setGroups(allGroups);
      } catch (e) {
        console.error("Failed to load groups", e);
        setGroups([]);
      }

      try {
        const vs = await getClubVenues(userProfile.clubId!);
        setVenues(vs);
      } catch (e) {
        console.error("Failed to load venues", e);
        setVenues([]);
      }

      try {
        // Groups the user is actually a member of (via groupMembers) — used as the "Groupe associé" choices
        let userGroups: GroupWithId[] = [];
        if (isAdmin) {
          userGroups = myGroups;
        } else {
          const memberships = await getUserGroupMemberships(user.uid);
          const ownGroupDocs = await Promise.all(
            memberships.map((m) => getGroup(m.groupId)),
          );
          userGroups = ownGroupDocs.filter(
            (g): g is GroupWithId => g !== null && g.clubId === userProfile.clubId,
          );
        }
        setCreateGroups(userGroups);

        // Broader "accessible" set used for the invite picker:
        // admin → all groups; coach → user's groups ∪ groups in their coached categories
        let accessibleGroups: GroupWithId[];
        if (isAdmin) {
          accessibleGroups = myGroups;
        } else {
          const coachGroupLists = await Promise.all(
            (userProfile.coachCategories ?? []).map((c) =>
              getCategoryGroups(userProfile.clubId!, c),
            ),
          );
          const combined = new Map<string, GroupWithId>();
          for (const g of [...userGroups, ...coachGroupLists.flat()]) combined.set(g.id, g);
          accessibleGroups = Array.from(combined.values());
        }

        const accessibleIds = new Set(accessibleGroups.map((g) => g.id));
        const groupNameById = new Map(
          accessibleGroups.map((g) => [g.id, `${g.category} — ${g.name}`]),
        );

        const [members, clubMemberships] = await Promise.all([
          getClubMembers(userProfile.clubId!),
          getClubGroupMembers(userProfile.clubId!),
        ]);
        const memberByUid = new Map(members.map((m) => [m.uid, m]));

        const options: InviteOption[] = [];
        for (const gm of clubMemberships) {
          if (!accessibleIds.has(gm.groupId)) continue;
          const member = memberByUid.get(gm.userId);
          if (!member) continue;
          options.push({
            uid: member.uid,
            displayName:
              member.displayName?.trim() ||
              `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() ||
              member.email,
            groupId: gm.groupId,
            groupName: groupNameById.get(gm.groupId) ?? "",
          });
        }
        options.sort(
          (a, b) =>
            a.groupName.localeCompare(b.groupName) ||
            a.displayName.localeCompare(b.displayName),
        );
        setInviteOptions(options);
      } catch (e) {
        console.error("Failed to load invite candidates", e);
        setCreateGroups([]);
        setInviteOptions([]);
      }

      setLoading(false);
    };
    load();
  }, [user, userProfile]);

  const groupNameById = useMemo(() => {
    const m: Record<string, string> = {};
    groups.forEach((g) => (m[g.id] = g.name));
    return m;
  }, [groups]);

  const editingSeriesSlots = useMemo(() => {
    if (!editingEvent?.seriesId) return [];
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const map = new Map<string, { day: number; time: string }>();
    for (const e of events) {
      if (e.seriesId !== editingEvent.seriesId) continue;
      const d = e.date.toDate();
      if (d < now) continue;
      const day = d.getDay();
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const key = `${day}_${time}`;
      if (!map.has(key)) map.set(key, { day, time });
    }
    return Array.from(map.values());
  }, [editingEvent, events]);

  const editingSeriesEndDate = useMemo<Date | null>(() => {
    if (!editingEvent?.seriesId) return null;
    let max: Date | null = null;
    for (const e of events) {
      if (e.seriesId !== editingEvent.seriesId) continue;
      const d = e.date.toDate();
      if (!max || d > max) max = d;
    }
    return max;
  }, [editingEvent, events]);

  const handleCreate = async (data: CreateEventData) => {
    if (!user) return;
    const id = await createEvent(data, user.uid);
    // Add optimistically — date comes from form, no serverTimestamp needed for it
    setEvents((prev) => [
      ...prev,
      { ...data, id, createdBy: user.uid } as unknown as EventWithId,
    ]);
  };

  const handleCreateMany = async (data: CreateEventData[]) => {
    if (!user) return;
    const created = await createEventsBatch(data, user.uid);
    setEvents((prev) => [...prev, ...created]);
  };

  const handleUpdate = async (id: string, data: CreateEventData) => {
    await updateEvent(id, data);
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? ({ ...data, id, createdBy: e.createdBy } as unknown as EventWithId)
          : e,
      ),
    );
  };

  const handleUpdateSeries = async (
    seriesId: string,
    sharedData: { groupId: string; location: string; name: string },
    slotMappings: {
      originalDay: number;
      originalTime: string;
      day: number;
      time: string;
    }[],
    deletedSlots: { day: number; time: string }[],
    newEndDate: Date | null,
  ) => {
    if (!user) return;
    const cutoff = new Date();
    const mappings = slotMappings.map((m) => ({
      originalDay: m.originalDay,
      originalTime: m.originalTime,
      newDay: m.day,
      newTime: m.time,
    }));
    if (!userProfile?.clubId) return;
    const { updated, deletedIds, created } = await updateSeries(
      seriesId,
      userProfile.clubId,
      sharedData,
      mappings,
      deletedSlots,
      newEndDate,
      cutoff,
      user.uid,
    );
    const updatedById = new Map(updated.map((e) => [e.id, e]));
    const deletedSet = new Set(deletedIds);
    setEvents((prev) => [
      ...prev
        .filter((e) => !deletedSet.has(e.id))
        .map((e) => updatedById.get(e.id) ?? e),
      ...created,
    ]);
  };

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (event: EventWithId) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteSeries = async (event: EventWithId) => {
    if (!event.seriesId || !userProfile?.clubId) return;
    try {
      const deletedIds = await deleteSeriesFuture(
        event.seriesId,
        userProfile.clubId,
        new Date(),
      );
      const deletedSet = new Set(deletedIds);
      setEvents((prev) => prev.filter((e) => !deletedSet.has(e.id)));
    } catch {
      setError("Erreur lors de la suppression.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("Erreur lors de la suppression.");
    }
  };

  if (!userProfile?.clubId) {
    return <JoinClubPage />;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const now = new Date();
  const isPastTab = typeFilter === "past";

  const upcoming = events
    .filter((e) => e.date.toDate() >= now)
    .filter((e) => typeFilter === "all" || e.type === typeFilter)
    .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

  const past = events
    .filter((e) => e.date.toDate() < now)
    .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());

  const canDeleteEvent = (event: EventWithId) => {
    if (isAdmin) return true;
    const group = groups.find((g) => g.id === event.groupId);
    if (!group) return false;
    return coachCats.includes(group.category);
  };

  return (
    <Box sx={{ pb: 10 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Tabs
        value={typeFilter}
        onChange={(_e, v) => setTypeFilter(v)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab value="all" label="Tous" />
        <Tab value="training" label="Entraînements" />
        <Tab value="match" label="Matchs" />
        <Tab value="other" label="Autres" />
        <Tab value="past" label="Passés" />
      </Tabs>

      {isPastTab ? (
        past.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Aucun événement passé.
          </Typography>
        ) : (
          past.map((e) => (
            <Box key={e.id} sx={{ opacity: 0.6 }}>
              <EventCard
                event={e}
                groupName={groupNameById[e.groupId]}
                canDelete={canDeleteEvent(e)}
                onDelete={handleDelete}
                onDeleteSeries={canDeleteEvent(e) ? handleDeleteSeries : undefined}
                onEdit={canDeleteEvent(e) ? handleOpenEdit : undefined}
              />
            </Box>
          ))
        )
      ) : upcoming.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Aucun événement à venir.
        </Typography>
      ) : (
        upcoming.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            groupName={groupNameById[e.groupId]}
            canDelete={canDeleteEvent(e)}
            onDelete={handleDelete}
            onDeleteSeries={canDeleteEvent(e) ? handleDeleteSeries : undefined}
            onEdit={canDeleteEvent(e) ? handleOpenEdit : undefined}
          />
        ))
      )}

      {canCreate && (
        <Fab
          color="primary"
          sx={{ position: "fixed", bottom: 24, right: 24 }}
          onClick={handleOpenCreate}
        >
          <Add />
        </Fab>
      )}

      <CreateEventDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        clubId={userProfile.clubId}
        availableGroups={createGroups}
        inviteOptions={inviteOptions}
        venues={venues}
        seriesSlots={editingSeriesSlots}
        seriesEndDate={editingSeriesEndDate}
        onCreate={handleCreate}
        onCreateMany={handleCreateMany}
        editEvent={editingEvent}
        onUpdate={handleUpdate}
        onUpdateSeries={handleUpdateSeries}
      />

    </Box>
  );
}
