import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
  deleteEvent,
} from "../services/events.service";
import { getCategoryGroups } from "../services/groups.service";
import type { EventWithId, CreateEventData, EventType } from "../types/event";
import type { GroupWithId } from "../types/group";

export default function DashboardPage() {
  const { user, userProfile } = useAuth();

  const [events, setEvents] = useState<EventWithId[]>([]);
  const [groups, setGroups] = useState<GroupWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState<"all" | EventType>("all");
  const [showPast, setShowPast] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

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

      try {
        const club = await getClub(userProfile.clubId!);
        const catsToLoad = isAdmin ? (club?.categories ?? []) : coachCats;
        const allGroups: GroupWithId[] = [];
        for (const cat of catsToLoad) {
          const catGroups = await getCategoryGroups(userProfile.clubId!, cat);
          allGroups.push(...catGroups);
        }
        setGroups(allGroups);
      } catch (e) {
        console.error("Failed to load groups", e);
        setGroups([]);
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

  const handleCreate = async (data: CreateEventData) => {
    if (!user) return;
    const id = await createEvent(data, user.uid);
    // Add optimistically — date comes from form, no serverTimestamp needed for it
    setEvents((prev) => [
      ...prev,
      { ...data, id, createdBy: user.uid } as unknown as EventWithId,
    ]);
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
  const filteredByType = events.filter(
    (e) => typeFilter === "all" || e.type === typeFilter,
  );

  const upcoming = filteredByType
    .filter((e) => e.date.toDate() >= now)
    .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

  const past = filteredByType
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
      </Tabs>

      {upcoming.length === 0 ? (
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
          />
        ))
      )}

      {past.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => setShowPast(!showPast)}
            fullWidth
          >
            {showPast
              ? "Masquer les événements passés"
              : `Afficher les événements passés (${past.length})`}
          </Button>
          {showPast && (
            <Box sx={{ mt: 2 }}>
              {past.map((e) => (
                <Box key={e.id} sx={{ opacity: 0.6 }}>
                  <EventCard
                    event={e}
                    groupName={groupNameById[e.groupId]}
                    canDelete={canDeleteEvent(e)}
                    onDelete={handleDelete}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {canCreate && (
        <Fab
          color="primary"
          sx={{ position: "fixed", bottom: 24, right: 24 }}
          onClick={() => setDialogOpen(true)}
        >
          <Add />
        </Fab>
      )}

      {canCreate && (
        <CreateEventDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          clubId={userProfile.clubId}
          availableGroups={groups}
          onCreate={handleCreate}
        />
      )}
    </Box>
  );
}
