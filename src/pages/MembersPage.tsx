import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import { useAuth } from "../contexts/AuthContext";
import { getClubMembers, type MemberWithId } from "../services/members.service";
import {
  getClubGroups,
  createGroup,
  getUserGroupIds,
  setUserGroups,
} from "../services/groups.service";
import type { GroupWithId } from "../types/group";

interface CreateGroupForm {
  name: string;
}

interface MemberRow extends MemberWithId {
  groupIds: string[];
}

export default function MembersPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<GroupWithId[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const form = useForm<CreateGroupForm>();

  useEffect(() => {
    if (!userProfile?.clubId) return;

    const load = async () => {
      try {
        const [clubMembers, clubGroups] = await Promise.all([
          getClubMembers(userProfile.clubId!),
          getClubGroups(userProfile.clubId!),
        ]);
        setGroups(clubGroups);

        const rows: MemberRow[] = await Promise.all(
          clubMembers.map(async (m) => ({
            ...m,
            groupIds: await getUserGroupIds(m.uid),
          })),
        );
        setMembers(rows);
      } catch {
        setError("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };

    load();
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

  const handleGroupsChange = async (
    uid: string,
    newGroupIds: string[],
    currentGroupIds: string[],
  ) => {
    if (!userProfile?.clubId) return;
    try {
      await setUserGroups(
        uid,
        userProfile.clubId,
        newGroupIds,
        currentGroupIds,
      );
      setMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, groupIds: newGroupIds } : m)),
      );
    } catch {
      setError("Erreur lors de la modification des groupes.");
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
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Groupes */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">Groupes</Typography>
        {userProfile?.admin && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            Créer un groupe
          </Button>
        )}
      </Box>

      {groups.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Aucun groupe pour le moment.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 2,
            mb: 4,
          }}
        >
          {groups.map((group) => (
            <Card key={group.id}>
              <CardActionArea onClick={() => navigate(`/groupes/${group.id}`)}>
                <CardContent
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 1.5,
                  }}
                >
                  <GroupIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1">{group.name}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      {/* Membres */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Membres
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Prénom</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Groupes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => {
              const memberGroups = groups.filter((g) =>
                member.groupIds.includes(g.id),
              );
              return (
                <TableRow key={member.uid}>
                  <TableCell>{member.lastName}</TableCell>
                  <TableCell>{member.firstName}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell sx={{ minWidth: 250 }}>
                    {userProfile?.admin ? (
                      <Autocomplete
                        multiple
                        size="small"
                        options={groups}
                        getOptionLabel={(g) => g.name}
                        value={memberGroups}
                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        onChange={(_e, newValue) =>
                          handleGroupsChange(
                            member.uid,
                            newValue.map((g) => g.id),
                            member.groupIds,
                          )
                        }
                        renderInput={(params) => <TextField {...params} />}
                      />
                    ) : (
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {memberGroups.length > 0 ? (
                          memberGroups.map((g) => (
                            <Chip key={g.id} label={g.name} size="small" />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Aucun groupe
                          </Typography>
                        )}
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Aucun membre pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog création groupe */}
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
