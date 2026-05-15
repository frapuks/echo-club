import { Box, Typography } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import EventDetailHeader from "./EventDetailHeader";
import EventInvitees from "./EventInvitees";
import type { EventWithId, OtherEvent } from "../../../types/event";
import type { GroupWithId } from "../../../types/group";
import type { MemberWithId } from "../../../services/members.service";

interface Props {
  event: EventWithId;
  group: GroupWithId | null;
  invitees: MemberWithId[];
}

export default function OtherEventDetail({ event, group, invitees }: Props) {
  const other = event as OtherEvent & { id: string };
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <EventIcon color="action" />
        <Typography variant="h4">{other.name}</Typography>
      </Box>
      <EventDetailHeader event={event} group={group} />
      {other.description && (
        <Typography sx={{ mt: 2, whiteSpace: "pre-line" }}>
          {other.description}
        </Typography>
      )}
      <EventInvitees invitees={invitees} />
    </Box>
  );
}
