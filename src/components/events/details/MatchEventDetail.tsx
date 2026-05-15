import { Box, Chip, Typography } from "@mui/material";
import SportsHandball from "@mui/icons-material/SportsHandball";
import EventDetailHeader from "./EventDetailHeader";
import EventInvitees from "./EventInvitees";
import type { EventWithId, MatchEvent } from "../../../types/event";
import type { GroupWithId } from "../../../types/group";
import type { MemberWithId } from "../../../services/members.service";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

interface Props {
  event: EventWithId;
  group: GroupWithId | null;
  invitees: MemberWithId[];
}

export default function MatchEventDetail({ event, group, invitees }: Props) {
  const match = event as MatchEvent & { id: string };
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <SportsHandball color="error" />
        <Typography variant="h4">vs {match.opponent}</Typography>
        <Chip
          size="small"
          label={match.home ? "Domicile" : "Extérieur"}
          color={match.home ? "primary" : "default"}
        />
      </Box>
      <EventDetailHeader event={event} group={group} />
      <Typography variant="body1" sx={{ mt: 1 }}>
        Rendez-vous à <strong>{timeFormatter.format(match.meetingTime.toDate())}</strong>
      </Typography>
      <EventInvitees invitees={invitees} />
    </Box>
  );
}
