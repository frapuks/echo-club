import { Box, Chip, Typography } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import type { MemberWithId } from "../../../services/members.service";

interface Props {
  invitees: MemberWithId[];
}

export default function EventInvitees({ invitees }: Props) {
  if (invitees.length === 0) return null;
  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, color: "text.secondary" }}>
        <PeopleIcon fontSize="small" />
        <Typography variant="subtitle2">
          {invitees.length} invité{invitees.length > 1 ? "s" : ""}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {invitees.map((u) => (
          <Chip
            key={u.uid}
            size="small"
            label={
              u.displayName?.trim() ||
              `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
              u.email
            }
          />
        ))}
      </Box>
    </Box>
  );
}
