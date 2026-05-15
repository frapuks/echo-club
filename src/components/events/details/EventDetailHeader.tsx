import { Box, Chip, Typography } from "@mui/material";
import AccessTime from "@mui/icons-material/AccessTime";
import LocationOn from "@mui/icons-material/LocationOn";
import type { EventWithId } from "../../../types/event";
import type { GroupWithId } from "../../../types/group";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface Props {
  event: EventWithId;
  group: GroupWithId | null;
}

export default function EventDetailHeader({ event, group }: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
        {group && (
          <Chip
            size="small"
            label={`${group.category} — ${group.name}`}
            variant="outlined"
          />
        )}
        {event.seriesId && (
          <Chip size="small" label="Série" color="primary" variant="outlined" />
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, color: "text.secondary" }}>
        <AccessTime fontSize="small" />
        <Typography>{dateFormatter.format(event.date.toDate())}</Typography>
      </Box>

      {event.location && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1, color: "text.secondary" }}>
          <LocationOn fontSize="small" sx={{ mt: 0.5 }} />
          <Typography sx={{ whiteSpace: "pre-line" }}>{event.location}</Typography>
        </Box>
      )}
    </Box>
  );
}
