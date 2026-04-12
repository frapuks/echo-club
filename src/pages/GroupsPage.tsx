import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import Group from "@mui/icons-material/Group";
import { useAuth } from "../contexts/AuthContext";
import { getClubGroups, createGroup } from "../services/groups.service";
import type { GroupWithId } from "../types/group";

interface CreateGroupForm {
  name: string;
}

export default function GroupsPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const form = useForm<CreateGroupForm>();

  useEffect(() => {
    if (!userProfile?.clubId) return;

    getClubGroups(userProfile.clubId)
      .then(setGroups)
      .catch(() => setError("Erreur lors du chargement des groupes."))
      .finally(() => setLoading(false));
  }, [userProfile?.clubId]);

  const onCreateGroup = async (data: CreateGroupForm) => {
    if (!userProfile?.clubId) return;
    setCreating(true);
    try {
      const id = await createGroup(userProfile.clubId, data.name);
      setGroups((prev) => [
        ...prev,
        { id, name: data.name, clubId: userProfile.clubId! } as GroupWithId,
      ]);
      setDialogOpen(false);
      form.reset();
    } catch {
      setError("Erreur lors de la création du groupe.");
    } finally {
      setCreating(false);
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
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Groupes</Typography>
        {userProfile?.admin && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            Créer un groupe
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {groups.length === 0 ? (
        <Typography color="text.secondary">Aucun groupe pour le moment.</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 2 }}>
          {groups.map((group) => (
            <Card key={group.id}>
              <CardActionArea onClick={() => navigate(`/groupes/${group.id}`)}>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Group color="primary" />
                  <Typography variant="h6">{group.name}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box component="form" onSubmit={form.handleSubmit(onCreateGroup)}>
          <DialogTitle>Créer un groupe</DialogTitle>
          <DialogContent>
            <TextField
              label="Nom du groupe"
              fullWidth
              margin="normal"
              autoFocus
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
              {...form.register("name", {
                required: "Le nom du groupe est requis.",
              })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={creating}>
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
