import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import Edit from "@mui/icons-material/Edit";
import DragIndicator from "@mui/icons-material/DragIndicator";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "../../contexts/AuthContext";
import {
  getClubVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  reorderVenues,
} from "../../services/venues.service";
import type { VenueWithId } from "../../types/venue";

export default function VenuesSettings() {
  const { userProfile } = useAuth();
  const [venues, setVenues] = useState<VenueWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!userProfile?.clubId) return;
    getClubVenues(userProfile.clubId)
      .then(setVenues)
      .catch(() => setError("Erreur lors du chargement."))
      .finally(() => setLoading(false));
  }, [userProfile?.clubId]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setAddress("");
    setDialogOpen(true);
  };

  const openEdit = (venue: VenueWithId) => {
    setEditingId(venue.id);
    setName(venue.name);
    setAddress(venue.address);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setName("");
    setAddress("");
  };

  const canSubmit = name.trim().length > 0 && address.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !userProfile?.clubId) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await updateVenue(editingId, { name: name.trim(), address: address.trim() });
        setVenues((prev) =>
          prev.map((v) =>
            v.id === editingId ? { ...v, name: name.trim(), address: address.trim() } : v,
          ),
        );
      } else {
        const order = venues.length;
        const id = await createVenue(userProfile.clubId, name.trim(), address.trim(), order);
        setVenues((prev) => [
          ...prev,
          {
            id,
            clubId: userProfile.clubId!,
            name: name.trim(),
            address: address.trim(),
            order,
          } as VenueWithId,
        ]);
      }
      closeDialog();
    } catch {
      setError("Erreur lors de la sauvegarde.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = venues.findIndex((v) => v.id === active.id);
    const newIndex = venues.findIndex((v) => v.id === over.id);
    const reordered = arrayMove(venues, oldIndex, newIndex);
    setVenues(reordered);
    try {
      await reorderVenues(reordered.map((v) => v.id));
    } catch {
      setError("Erreur lors de la réorganisation.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteVenue(confirmDeleteId);
      setVenues((prev) => prev.filter((v) => v.id !== confirmDeleteId));
    } catch {
      setError("Erreur lors de la suppression.");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Salles
            </Typography>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={openCreate}>
              Ajouter
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Gérez les salles de sport utilisées par votre club.
          </Typography>

          {venues.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucune salle.
            </Typography>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={venues.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                <Box>
                  {venues.map((v) => (
                    <SortableVenue
                      key={v.id}
                      venue={v}
                      onEdit={() => openEdit(v)}
                      onDelete={() => setConfirmDeleteId(v.id)}
                    />
                  ))}
                </Box>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Modifier la salle" : "Ajouter une salle"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Nom"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <TextField
            label="Adresse"
            fullWidth
            margin="normal"
            multiline
            minRows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Sauvegarde..." : editingId ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Supprimer la salle</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Voulez-vous vraiment supprimer cette salle ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SortableVenue({
  venue,
  onEdit,
  onDelete,
}: {
  venue: VenueWithId;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: venue.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <IconButton size="small" sx={{ cursor: "grab", mt: 0.25 }} {...attributes} {...listeners}>
        <DragIndicator fontSize="small" />
      </IconButton>
      <Box sx={{ flexGrow: 1 }}>
        <Typography>{venue.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {venue.address}
        </Typography>
      </Box>
      <IconButton size="small" onClick={onEdit}>
        <Edit fontSize="small" />
      </IconButton>
      <IconButton size="small" color="error" onClick={onDelete}>
        <Delete fontSize="small" />
      </IconButton>
    </Box>
  );
}
