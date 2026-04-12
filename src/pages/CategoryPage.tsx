import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router";
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
  FormControl,
  MenuItem,
  Paper,
  Select,
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
import { canManageCategory } from "../utils/permissions";
import {
  getCategoryGroups,
  createGroup,
  getUserGroupMemberships,
  setUserGroupsForRole,
} from "../services/groups.service";
import {
  getCategoryPlayers,
  getCategoryCoaches,
  setMemberPosition,
  type MemberWithId,
} from "../services/members.service";
import type { GroupWithId } from "../types/group";
import { POSITIONS, type Position } from "../types/group";

interface CreateGroupForm {
  name: string;
}

interface MemberRow extends MemberWithId {
  groupIds: string[];
}

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const cat = category ?? "";
  const canManage = canManageCategory(userProfile, cat);

  // Allow access if admin, coach of this category, or player of this category
  const hasAccess =
    userProfile?.admin ||
    (userProfile?.coachCategories ?? []).includes(cat) ||
    (userProfile?.playerCategories ?? []).includes(cat);

  const [groups, setGroups] = useState<GroupWithId[]>([]);
  const [coaches, setCoaches] = useState<MemberRow[]>([]);
  const [players, setPlayers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const form = useForm<CreateGroupForm>();

  if (userProfile && !hasAccess) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (!userProfile?.clubId || !cat) return;

    const load = async () => {
      try {
        const [catGroups, catPlayers, catCoaches] = await Promise.all([
          getCategoryGroups(userProfile.clubId!, cat),
          getCategoryPlayers(userProfile.clubId!, cat),
          getCategoryCoaches(userProfile.clubId!, cat),
        ]);
        setGroups(catGroups);

        const catGroupIds = new Set(catGroups.map((g) => g.id));

        const playersWithGroups = await Promise.all(
          catPlayers.map(async (m) => {
            const memberships = await getUserGroupMemberships(m.uid);
            const groupIds = memberships
              .filter((ms) => ms.roles.includes("player") && catGroupIds.has(ms.groupId))
              .map((ms) => ms.groupId);
            return { ...m, groupIds };
          }),
        );
        setPlayers(playersWithGroups);

        const coachesWithGroups = await Promise.all(
          catCoaches.map(async (m) => {
            const memberships = await getUserGroupMemberships(m.uid);
            const groupIds = memberships
              .filter((ms) => ms.roles.includes("coach") && catGroupIds.has(ms.groupId))
              .map((ms) => ms.groupId);
            return { ...m, groupIds };
          }),
        );
        setCoaches(coachesWithGroups);
      } catch {
        setError("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userProfile?.clubId, cat]);

  const onCreateGroup = async (data: CreateGroupForm) => {
    if (!userProfile?.clubId) return;
    setCreating(true);
    try {
      const id = await createGroup(userProfile.clubId, data.name, cat);
      setGroups((prev) => [
        ...prev,
        { id, name: data.name, clubId: userProfile.clubId!, category: cat } as GroupWithId,
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
    list: "coaches" | "players",
  ) => {
    if (!userProfile?.clubId) return;
    try {
      const role = list === "coaches" ? "coach" as const : "player" as const;
      await setUserGroupsForRole(uid, userProfile.clubId, newGroupIds, currentGroupIds, role);
      const setter = list === "coaches" ? setCoaches : setPlayers;
      setter((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, groupIds: newGroupIds } : m)),
      );
    } catch {
      setError("Erreur lors de la modification des groupes.");
    }
  };

  const handlePositionChange = async (uid: string, position: Position | null) => {
    try {
      await setMemberPosition(uid, position);
      setPlayers((prev) =>
        prev.map((m) =>
          m.uid === uid ? { ...m, position: position ?? undefined } : m,
        ),
      );
    } catch {
      setError("Erreur lors de la modification du poste.");
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
      <Typography variant="h4" sx={{ mb: 3 }}>
        {cat}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Groupes */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Groupes</Typography>
        {canManage && (
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            Créer un groupe
          </Button>
        )}
      </Box>

      {groups.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Aucun groupe dans cette catégorie.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2, mb: 4 }}>
          {groups.map((group) => (
            <Card key={group.id}>
              <CardActionArea onClick={() => navigate(`/groupes/${group.id}`)}>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5 }}>
                  <GroupIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1">{group.name}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      {/* Coachs */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Coachs
      </Typography>
      <MemberTable
        members={coaches}
        groups={groups}
        canManage={canManage}
        showPosition={false}
        emptyMessage="Aucun coach dans cette catégorie."
        onGroupsChange={(uid, newIds, currentIds) => handleGroupsChange(uid, newIds, currentIds, "coaches")}
      />

      {/* Joueurs */}
      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        Joueurs
      </Typography>
      <MemberTable
        members={players}
        groups={groups}
        canManage={canManage}
        showPosition={true}
        emptyMessage="Aucun joueur dans cette catégorie."
        onGroupsChange={(uid, newIds, currentIds) => handleGroupsChange(uid, newIds, currentIds, "players")}
        onPositionChange={handlePositionChange}
      />

      {/* Dialog création groupe */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={form.handleSubmit(onCreateGroup)}>
          <DialogTitle>Créer un groupe — {cat}</DialogTitle>
          <DialogContent>
            <TextField
              label="Nom du groupe"
              fullWidth
              margin="normal"
              autoFocus
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
              {...form.register("name", { required: "Le nom du groupe est requis." })}
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

function MemberTable({
  members,
  groups,
  canManage,
  showPosition = false,
  emptyMessage,
  onGroupsChange,
  onPositionChange,
}: {
  members: MemberRow[];
  groups: GroupWithId[];
  canManage: boolean;
  showPosition?: boolean;
  emptyMessage: string;
  onGroupsChange: (uid: string, newGroupIds: string[], currentGroupIds: string[]) => void;
  onPositionChange?: (uid: string, position: Position | null) => void;
}) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Prénom</TableCell>
            <TableCell>Email</TableCell>
            {showPosition && <TableCell>Poste</TableCell>}
            <TableCell>Groupes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => {
            const memberGroups = groups.filter((g) => member.groupIds.includes(g.id));
            return (
              <TableRow key={member.uid}>
                <TableCell>{member.lastName}</TableCell>
                <TableCell>{member.firstName}</TableCell>
                <TableCell>{member.email}</TableCell>
                {showPosition && (
                  <TableCell>
                    {canManage && onPositionChange ? (
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value={member.position ?? ""}
                          displayEmpty
                          onChange={(e) =>
                            onPositionChange(
                              member.uid,
                              e.target.value ? (e.target.value as Position) : null,
                            )
                          }
                        >
                          <MenuItem value="">—</MenuItem>
                          {POSITIONS.map((p) => (
                            <MenuItem key={p} value={p}>{p}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Typography variant="body2">
                        {member.position ?? "—"}
                      </Typography>
                    )}
                  </TableCell>
                )}
                <TableCell sx={{ minWidth: 250 }}>
                  {canManage ? (
                    <Autocomplete
                      multiple
                      size="small"
                      options={groups}
                      getOptionLabel={(g) => g.name}
                      value={memberGroups}
                      isOptionEqualToValue={(opt, val) => opt.id === val.id}
                      onChange={(_e, newValue) =>
                        onGroupsChange(
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
                        memberGroups.map((g) => <Chip key={g.id} label={g.name} size="small" />)
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
              <TableCell colSpan={showPosition ? 5 : 4} align="center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
