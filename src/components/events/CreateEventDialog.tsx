import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import type { EventType, CreateEventData } from "../../types/event";
import type { GroupWithId } from "../../types/group";

interface Props {
  open: boolean;
  onClose: () => void;
  clubId: string;
  availableGroups: GroupWithId[];
  onCreate: (data: CreateEventData) => Promise<void>;
}

export default function CreateEventDialog({ open, onClose, clubId, availableGroups, onCreate }: Props) {
  const [type, setType] = useState<EventType>("training");
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [opponent, setOpponent] = useState("");
  const [home, setHome] = useState(true);
  const [meetingTime, setMeetingTime] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setType("training");
    setGroupId("");
    setName("");
    setDate("");
    setTime("");
    setLocation("");
    setOpponent("");
    setHome(true);
    setMeetingTime("");
    setDescription("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const buildDate = (d: string, t: string): Timestamp => {
    return Timestamp.fromDate(new Date(`${d}T${t}`));
  };

  const canSubmit = () => {
    if (!groupId || !date || !time) return false;
    if (type === "match") return !!opponent && !!meetingTime;
    if (type === "training" || type === "other") return !!name;
    return false;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    setError("");
    try {
      const baseData = {
        clubId,
        groupId,
        date: buildDate(date, time),
        location,
      };

      if (type === "training") {
        await onCreate({ ...baseData, type: "training", name });
      } else if (type === "match") {
        await onCreate({
          ...baseData,
          type: "match",
          opponent,
          home,
          meetingTime: buildDate(date, meetingTime),
        });
      } else {
        await onCreate({ ...baseData, type: "other", name, description });
      }

      handleClose();
    } catch {
      setError("Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Créer un événement</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_e, v) => v && setType(v)}
            size="small"
          >
            <ToggleButton value="training">Entraînement</ToggleButton>
            <ToggleButton value="match">Match</ToggleButton>
            <ToggleButton value="other">Autre</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <FormControl fullWidth margin="normal">
          <InputLabel>Groupe</InputLabel>
          <Select value={groupId} label="Groupe" onChange={(e) => setGroupId(e.target.value)}>
            {availableGroups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.category} — {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {type === "match" ? (
          <>
            <TextField
              label="Adversaire"
              fullWidth
              margin="normal"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            />
            <FormControlLabel
              control={<Switch checked={home} onChange={(e) => setHome(e.target.checked)} />}
              label={home ? "Match à domicile" : "Match à l'extérieur"}
            />
          </>
        ) : (
          <TextField
            label="Nom"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Date"
            type="date"
            fullWidth
            margin="normal"
            slotProps={{ inputLabel: { shrink: true } }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextField
            label={type === "match" ? "Heure du match" : "Heure"}
            type="time"
            fullWidth
            margin="normal"
            slotProps={{ inputLabel: { shrink: true } }}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </Box>

        {type === "match" && (
          <TextField
            label="Heure de RDV"
            type="time"
            fullWidth
            margin="normal"
            slotProps={{ inputLabel: { shrink: true } }}
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
          />
        )}

        <TextField
          label="Lieu"
          fullWidth
          margin="normal"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        {type === "other" && (
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={2}
            margin="normal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit() || submitting}>
          {submitting ? "Création..." : "Créer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
