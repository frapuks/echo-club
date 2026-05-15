import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Delete from "@mui/icons-material/Delete";
import Edit from "@mui/icons-material/Edit";
import SportsHandball from "@mui/icons-material/SportsHandball";
import FitnessCenter from "@mui/icons-material/FitnessCenter";
import EventIcon from "@mui/icons-material/Event";
import LocationOn from "@mui/icons-material/LocationOn";
import AccessTime from "@mui/icons-material/AccessTime";
import type { EventWithId } from "../../types/event";

interface Props {
  event: EventWithId;
  groupName?: string;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onDeleteSeries?: (event: EventWithId) => void;
  onEdit?: (event: EventWithId) => void;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

export default function EventCard({ event, groupName, canDelete, onDelete, onDeleteSeries, onEdit }: Props) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<"event" | "series">("event");
  const hasSeriesOption = !!event.seriesId && !!onDeleteSeries;

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const openConfirm = () => {
    setDeleteScope("event");
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deleteScope === "series" && event.seriesId && onDeleteSeries) {
      onDeleteSeries(event);
    } else {
      onDelete(event.id);
    }
    setConfirmOpen(false);
  };

  const date = event.date.toDate();
  const icon =
    event.type === "match" ? (
      <SportsHandball color="error" />
    ) : event.type === "training" ? (
      <FitnessCenter color="primary" />
    ) : (
      <EventIcon color="action" />
    );

  const title =
    event.type === "match"
      ? `vs ${event.opponent}`
      : event.name;

  return (
    <>
      <Card sx={{ mb: 2, position: "relative" }}>
        <CardActionArea onClick={() => navigate(`/evenements/${event.id}`)}>
          <CardContent sx={{ display: "flex", gap: 2, alignItems: "flex-start", pr: 10 }}>
            <Box sx={{ mt: 0.5 }}>{icon}</Box>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{title}</Typography>
                {event.type === "match" && (
                  <Chip
                    size="small"
                    label={event.home ? "Domicile" : "Extérieur"}
                    color={event.home ? "primary" : "default"}
                  />
                )}
                {groupName && <Chip size="small" variant="outlined" label={groupName} />}
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1, color: "text.secondary" }}>
                <AccessTime fontSize="small" />
                <Typography variant="body2">{dateFormatter.format(date)}</Typography>
              </Box>

              {event.location && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, color: "text.secondary" }}>
                  <LocationOn fontSize="small" />
                  <Typography variant="body2">{event.location}</Typography>
                </Box>
              )}

              {event.type === "match" && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  RDV à {timeFormatter.format(event.meetingTime.toDate())}
                </Typography>
              )}

              {event.type === "other" && event.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {event.description}
                </Typography>
              )}
            </Box>
          </CardContent>
        </CardActionArea>

        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 0.5,
          }}
        >
          {onEdit && (
            <IconButton
              size="small"
              onClick={(e) => {
                stop(e);
                onEdit(event);
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          )}
          {canDelete && (
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                stop(e);
                openConfirm();
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer l'événement</DialogTitle>
        <DialogContent>
          {hasSeriesOption && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <ToggleButtonGroup
                value={deleteScope}
                exclusive
                onChange={(_e, v) => v && setDeleteScope(v)}
                size="small"
              >
                <ToggleButton value="event">Cet événement</ToggleButton>
                <ToggleButton value="series">Tous les événements à venir</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
          <DialogContentText>
            {deleteScope === "series"
              ? "Tous les événements à venir de cette série seront supprimés. Les événements passés seront conservés."
              : "Voulez-vous vraiment supprimer cet événement ?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
