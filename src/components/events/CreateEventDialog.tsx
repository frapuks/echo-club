import { useEffect, useState } from "react";
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
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import type { EventType, CreateEventData, EventWithId } from "../../types/event";
import type { GroupWithId } from "../../types/group";
import type { VenueWithId } from "../../types/venue";

const CUSTOM_VENUE = "__custom__";

const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

interface PeriodicSlot {
  day: number;
  time: string;
}

interface SeriesEditSlot {
  originalDay: number;
  originalTime: string;
  day: number;
  time: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  clubId: string;
  availableGroups: GroupWithId[];
  venues: VenueWithId[];
  seriesSlots: { day: number; time: string }[];
  seriesEndDate: Date | null;
  onCreate: (data: CreateEventData) => Promise<void>;
  onCreateMany: (data: CreateEventData[]) => Promise<void>;
  editEvent?: EventWithId | null;
  onUpdate?: (id: string, data: CreateEventData) => Promise<void>;
  onUpdateSeries?: (
    seriesId: string,
    sharedData: { groupId: string; location: string; name: string },
    slotMappings: SeriesEditSlot[],
    deletedSlots: { day: number; time: string }[],
    newEndDate: Date | null,
  ) => Promise<void>;
}

const pad = (n: number) => n.toString().padStart(2, "0");
const formatDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function CreateEventDialog({
  open,
  onClose,
  clubId,
  availableGroups,
  venues,
  seriesSlots,
  seriesEndDate,
  onCreate,
  onCreateMany,
  editEvent,
  onUpdate,
  onUpdateSeries,
}: Props) {
  const isEditing = !!editEvent;
  const isPartOfSeries = isEditing && !!editEvent.seriesId;
  const [type, setType] = useState<EventType>("training");
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venueChoice, setVenueChoice] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [opponent, setOpponent] = useState("");
  const [home, setHome] = useState(true);
  const [meetingTime, setMeetingTime] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [periodic, setPeriodic] = useState(false);
  const [slots, setSlots] = useState<PeriodicSlot[]>([{ day: 2, time: "" }]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editScope, setEditScope] = useState<"event" | "series">("event");
  const [editSeriesSlots, setEditSeriesSlots] = useState<SeriesEditSlot[]>([]);
  const [editSeriesEnd, setEditSeriesEnd] = useState("");

  const reset = () => {
    setType("training");
    setGroupId("");
    setName("");
    setDate("");
    setTime("");
    setVenueChoice("");
    setCustomLocation("");
    setOpponent("");
    setHome(true);
    setMeetingTime("");
    setDescription("");
    setError("");
    setPeriodic(false);
    setSlots([{ day: 2, time: "" }]);
    setStartDate("");
    setEndDate("");
  };

  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      const d = editEvent.date.toDate();
      setType(editEvent.type);
      setGroupId(editEvent.groupId);
      setDate(formatDateInput(d));
      setTime(formatTimeInput(d));
      setPeriodic(false);
      setEditScope("event");
      setEditSeriesSlots(
        seriesSlots.map((s) => ({
          originalDay: s.day,
          originalTime: s.time,
          day: s.day,
          time: s.time,
        })),
      );
      setEditSeriesEnd(seriesEndDate ? formatDateInput(seriesEndDate) : "");

      const matchedVenue = venues.find(
        (v) => `${v.name} — ${v.address}` === editEvent.location,
      );
      if (matchedVenue) {
        setVenueChoice(matchedVenue.id);
        setCustomLocation("");
      } else {
        setVenueChoice(venues.length > 0 ? CUSTOM_VENUE : "");
        setCustomLocation(editEvent.location);
      }

      if (editEvent.type === "training") {
        setName(editEvent.name);
      } else if (editEvent.type === "match") {
        setOpponent(editEvent.opponent);
        setHome(editEvent.home);
        setMeetingTime(formatTimeInput(editEvent.meetingTime.toDate()));
      } else {
        setName(editEvent.name);
        setDescription(editEvent.description ?? "");
      }
    } else {
      reset();
      setEditSeriesSlots([]);
      setEditSeriesEnd("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editEvent, open]);

  const resolvedLocation = (): string => {
    if (venueChoice === CUSTOM_VENUE || venues.length === 0) return customLocation.trim();
    const v = venues.find((x) => x.id === venueChoice);
    return v ? `${v.name} — ${v.address}` : "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const buildDate = (d: string, t: string): Timestamp => {
    return Timestamp.fromDate(new Date(`${d}T${t}`));
  };

  const isPeriodic = !isEditing && type === "training" && periodic;
  const isSeriesEdit = isEditing && isPartOfSeries && editScope === "series";

  const updateEditSlot = (idx: number, patch: Partial<SeriesEditSlot>) =>
    setEditSeriesSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  const removeEditSlot = (idx: number) =>
    setEditSeriesSlots((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit = () => {
    if (!groupId) return false;
    if (isSeriesEdit) {
      if (!name) return false;
      return editSeriesSlots.every((s) => !!s.time);
    }
    if (type === "match") return !!date && !!time && !!opponent && !!meetingTime;
    if (type === "other") return !!date && !!time && !!name;
    if (type === "training") {
      if (!name) return false;
      if (isPeriodic) {
        if (!startDate || !endDate) return false;
        if (new Date(endDate) < new Date(startDate)) return false;
        if (slots.length === 0) return false;
        return slots.every((s) => !!s.time);
      }
      return !!date && !!time;
    }
    return false;
  };

  const generatePeriodicEvents = (location: string): CreateEventData[] => {
    const events: CreateEventData[] = [];
    const seriesId = crypto.randomUUID();
    const start = new Date(`${startDate}T00:00`);
    const end = new Date(`${endDate}T23:59`);
    for (const slot of slots) {
      const cursor = new Date(start);
      while (cursor.getDay() !== slot.day) cursor.setDate(cursor.getDate() + 1);
      while (cursor <= end) {
        const [h, m] = slot.time.split(":").map(Number);
        const occ = new Date(cursor);
        occ.setHours(h, m, 0, 0);
        events.push({
          type: "training",
          clubId,
          groupId,
          date: Timestamp.fromDate(occ),
          location,
          name,
          seriesId,
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    }
    return events.sort((a, b) => a.date.toMillis() - b.date.toMillis());
  };

  const addSlot = () => setSlots((prev) => [...prev, { day: 2, time: "" }]);
  const removeSlot = (idx: number) =>
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, patch: Partial<PeriodicSlot>) =>
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    setError("");
    try {
      const location = resolvedLocation();

      if (isSeriesEdit && editEvent?.seriesId && onUpdateSeries) {
        const remainingKeys = new Set(
          editSeriesSlots.map((s) => `${s.originalDay}_${s.originalTime}`),
        );
        const deletedSlots = seriesSlots.filter(
          (s) => !remainingKeys.has(`${s.day}_${s.time}`),
        );
        const newEnd = editSeriesEnd ? new Date(`${editSeriesEnd}T23:59:59`) : null;
        await onUpdateSeries(
          editEvent.seriesId,
          { groupId, location, name },
          editSeriesSlots,
          deletedSlots,
          newEnd,
        );
      } else if (isPeriodic) {
        const events = generatePeriodicEvents(location);
        if (events.length === 0) {
          setError("Aucune date générée — vérifie les jours et la période.");
          setSubmitting(false);
          return;
        }
        await onCreateMany(events);
      } else {
        const baseData = {
          clubId,
          groupId,
          date: buildDate(date, time),
          location,
        };

        let data: CreateEventData;
        if (type === "training") {
          data = { ...baseData, type: "training", name };
        } else if (type === "match") {
          data = {
            ...baseData,
            type: "match",
            opponent,
            home,
            meetingTime: buildDate(date, meetingTime),
          };
        } else {
          data = { ...baseData, type: "other", name, description };
        }

        if (isEditing && editEvent && onUpdate) {
          await onUpdate(editEvent.id, data);
        } else {
          await onCreate(data);
        }
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
      <DialogTitle>{isEditing ? "Modifier l'événement" : "Créer un événement"}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {isPartOfSeries && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <ToggleButtonGroup
              value={editScope}
              exclusive
              onChange={(_e, v) => v && setEditScope(v)}
              size="small"
            >
              <ToggleButton value="event">Cet événement</ToggleButton>
              <ToggleButton value="series">Toute la série</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {!isEditing && (
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
        )}

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

        {!isEditing && type === "training" && (
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Switch checked={periodic} onChange={(e) => setPeriodic(e.target.checked)} />}
            label="Entraînement périodique (saison)"
          />
        )}

        {isSeriesEdit ? (
          <>
            <TextField
              label="Date de fin"
              type="date"
              fullWidth
              margin="normal"
              slotProps={{ inputLabel: { shrink: true } }}
              value={editSeriesEnd}
              onChange={(e) => setEditSeriesEnd(e.target.value)}
              helperText="Étend ou raccourcit la série. Seuls les événements à venir sont impactés."
            />
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Créneaux à venir
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Modifie le jour ou l'heure, ou supprime un créneau. Seuls les événements à venir sont impactés.
            </Typography>
            {editSeriesSlots.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucun créneau à venir dans cette série.
              </Typography>
            ) : (
              editSeriesSlots.map((slot, idx) => (
                <Box key={`${slot.originalDay}_${slot.originalTime}`} sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                  <FormControl size="small" sx={{ flexGrow: 1 }}>
                    <InputLabel>Jour</InputLabel>
                    <Select
                      value={slot.day}
                      label="Jour"
                      onChange={(e) => updateEditSlot(idx, { day: Number(e.target.value) })}
                    >
                      {WEEKDAYS.map((d) => (
                        <MenuItem key={d.value} value={d.value}>
                          {d.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Heure"
                    type="time"
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={slot.time}
                    onChange={(e) => updateEditSlot(idx, { time: e.target.value })}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeEditSlot(idx)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </>
        ) : isPeriodic ? (
          <>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Début"
                type="date"
                fullWidth
                margin="normal"
                slotProps={{ inputLabel: { shrink: true } }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <TextField
                label="Fin"
                type="date"
                fullWidth
                margin="normal"
                slotProps={{ inputLabel: { shrink: true } }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Box>

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Créneaux hebdomadaires
            </Typography>
            {slots.map((slot, idx) => (
              <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                <FormControl size="small" sx={{ flexGrow: 1 }}>
                  <InputLabel>Jour</InputLabel>
                  <Select
                    value={slot.day}
                    label="Jour"
                    onChange={(e) => updateSlot(idx, { day: Number(e.target.value) })}
                  >
                    {WEEKDAYS.map((d) => (
                      <MenuItem key={d.value} value={d.value}>
                        {d.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Heure"
                  type="time"
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={slot.time}
                  onChange={(e) => updateSlot(idx, { time: e.target.value })}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeSlot(idx)}
                  disabled={slots.length === 1}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addSlot} sx={{ mt: 0.5 }}>
              Ajouter un créneau
            </Button>
          </>
        ) : (
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
        )}

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

        {venues.length > 0 && (
          <FormControl fullWidth margin="normal">
            <InputLabel>Lieu</InputLabel>
            <Select
              value={venueChoice}
              label="Lieu"
              onChange={(e) => setVenueChoice(e.target.value)}
            >
              {venues.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
              <MenuItem value={CUSTOM_VENUE}>Autre adresse…</MenuItem>
            </Select>
          </FormControl>
        )}

        {(venueChoice === CUSTOM_VENUE || venues.length === 0) && (
          <TextField
            label={venues.length === 0 ? "Lieu" : "Adresse"}
            fullWidth
            margin="normal"
            value={customLocation}
            onChange={(e) => setCustomLocation(e.target.value)}
          />
        )}

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
          {submitting
            ? isEditing
              ? "Sauvegarde..."
              : "Création..."
            : isSeriesEdit
              ? "Enregistrer la série"
              : isEditing
                ? "Enregistrer"
                : isPeriodic
                  ? "Créer la série"
                  : "Créer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
