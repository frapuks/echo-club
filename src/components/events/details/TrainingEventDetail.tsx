import { Box, Typography } from "@mui/material";
import FitnessCenter from "@mui/icons-material/FitnessCenter";
import type {
  EventWithId,
  InviteeResponse,
  TrainingEvent,
} from "../../../types/event";
import type { GroupWithId } from "../../../types/group";
import type { MemberWithId } from "../../../services/members.service";
import EventDetailHeader from "./EventDetailHeader";
import EventInvitees from "./EventInvitees";

interface Props {
  event: EventWithId;
  group: GroupWithId | null;
  invitees: MemberWithId[];
  canEditResponses?: boolean;
  onChangeResponse?: (
    uid: string,
    status: InviteeResponse | "none",
  ) => void | Promise<void>;
}

export default function TrainingEventDetail({
  event,
  group,
  invitees,
  canEditResponses,
  onChangeResponse,
}: Props) {
  const training = event as TrainingEvent & { id: string };
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <FitnessCenter color="primary" />
        <Typography variant="h4">{training.name}</Typography>
      </Box>
      <EventDetailHeader event={event} group={group} />
      <EventInvitees
        invitees={invitees}
        responses={event.responses}
        canEdit={canEditResponses}
        onChangeResponse={onChangeResponse}
      />
    </Box>
  );
}
