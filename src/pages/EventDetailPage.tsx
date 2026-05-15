import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useAuth } from "../contexts/AuthContext";
import { getEvent, setEventResponses } from "../services/events.service";
import { getGroup } from "../services/groups.service";
import { getClubMembers } from "../services/members.service";
import type { EventWithId, InviteeResponse } from "../types/event";
import type { GroupWithId } from "../types/group";
import type { MemberWithId } from "../services/members.service";
import TrainingEventDetail from "../components/events/details/TrainingEventDetail";
import MatchEventDetail from "../components/events/details/MatchEventDetail";
import OtherEventDetail from "../components/events/details/OtherEventDetail";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [event, setEvent] = useState<EventWithId | null>(null);
  const [group, setGroup] = useState<GroupWithId | null>(null);
  const [invitees, setInvitees] = useState<MemberWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canEditResponses = useMemo(() => {
    if (!event || !userProfile) return false;
    if (userProfile.admin) return true;
    if (!group) return false;
    return (userProfile.coachCategories ?? []).includes(group.category);
  }, [event, group, userProfile]);

  const handleChangeResponse = async (
    uid: string,
    status: InviteeResponse | "none",
  ) => {
    if (!event) return;
    const current = { ...(event.responses ?? {}) };
    if (status === "none") delete current[uid];
    else current[uid] = status;
    try {
      await setEventResponses(event.id, current);
      setEvent({ ...event, responses: current });
    } catch (e) {
      console.error("Failed to update response", e);
      setError(
        e instanceof Error ? e.message : "Erreur lors de la mise à jour.",
      );
    }
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const e = await getEvent(id);
        if (!e) {
          setError("Événement introuvable.");
          setLoading(false);
          return;
        }
        setEvent(e);

        const [g, members] = await Promise.all([
          getGroup(e.groupId),
          e.invitedUserIds && e.invitedUserIds.length > 0
            ? getClubMembers(e.clubId)
            : Promise.resolve([] as MemberWithId[]),
        ]);
        setGroup(g);
        if (e.invitedUserIds && e.invitedUserIds.length > 0) {
          const invitedSet = new Set(e.invitedUserIds);
          setInvitees(members.filter((m) => invitedSet.has(m.uid)));
        }
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/")}>
          Retour
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || "Événement introuvable."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate("/")}
        sx={{ mb: 2 }}
      >
        Retour
      </Button>

      {event.type === "training" && (
        <TrainingEventDetail
          event={event}
          group={group}
          invitees={invitees}
          canEditResponses={canEditResponses}
          onChangeResponse={handleChangeResponse}
        />
      )}
      {event.type === "match" && (
        <MatchEventDetail
          event={event}
          group={group}
          invitees={invitees}
          canEditResponses={canEditResponses}
          onChangeResponse={handleChangeResponse}
        />
      )}
      {event.type === "other" && (
        <OtherEventDetail
          event={event}
          group={group}
          invitees={invitees}
          canEditResponses={canEditResponses}
          onChangeResponse={handleChangeResponse}
        />
      )}
    </Box>
  );
}
