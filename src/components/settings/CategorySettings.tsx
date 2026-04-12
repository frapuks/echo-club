import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import DragIndicator from "@mui/icons-material/DragIndicator";
import GroupIcon from "@mui/icons-material/Group";
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
import { canManageCategory } from "../../utils/permissions";
import {
  getCategoryGroups,
  createGroup,
  deleteGroup,
  reorderGroups,
  getUserGroupMemberships,
  setUserGroupsForRole,
} from "../../services/groups.service";
import {
  getCategoryPlayers,
  getCategoryCoaches,
  setMemberPosition,
  type MemberWithId,
} from "../../services/members.service";
import type { GroupWithId } from "../../types/group";
import { POSITIONS, type Position } from "../../types/group";

interface MemberRow extends MemberWithId {
  groupIds: string[];
}

interface CreateGroupForm {
  name: string;
}

export default function CategorySettings({ category }: { category: string }) {
  const { userProfile } = useAuth();

  const [groups, setGroups] = useState<GroupWithId[]>([]);
  const [coaches, setCoaches] = useState<MemberRow[]>([]);
  const [players, setPlayers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GroupWithId | null>(null);
  const [deleting, setDeleting] = useState(false);
  const form = useForm<CreateGroupForm>();

  const canManage = canManageCategory(userProfile, category);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!userProfile?.clubId || !category) return;
    setLoading(true);
    setSelectedGroupId(null);
    setPositionFilter(0);

    const load = async () => {
      try {
        const [catGroups, catPlayers, catCoaches] = await Promise.all([
          getCategoryGroups(userProfile.clubId!, category),
          getCategoryPlayers(userProfile.clubId!, category),
          getCategoryCoaches(userProfile.clubId!, category),
        ]);
        setGroups(catGroups);
        const catGroupIds = new Set(catGroups.map((g) => g.id));

        const pw = await Promise.all(
          catPlayers.map(async (m) => {
            const ms = await getUserGroupMemberships(m.uid);
            return {
              ...m,
              groupIds: ms
                .filter((x) => x.roles.includes("player") && catGroupIds.has(x.groupId))
                .map((x) => x.groupId),
            };
          }),
        );
        setPlayers(pw);

        const cw = await Promise.all(
          catCoaches.map(async (m) => {
            const ms = await getUserGroupMemberships(m.uid);
            return {
              ...m,
              groupIds: ms
                .filter((x) => x.roles.includes("coach") && catGroupIds.has(x.groupId))
                .map((x) => x.groupId),
            };
          }),
        );
        setCoaches(cw);
      } catch {
        setError("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userProfile?.clubId, category]);

  const onCreateGroup = async (data: CreateGroupForm) => {
    if (!userProfile?.clubId) return;
    setCreating(true);
    try {
      const id = await createGroup(userProfile.clubId, data.name, category);
      setGroups((prev) => [
        ...prev,
        { id, name: data.name, clubId: userProfile.clubId!, category } as GroupWithId,
      ]);
      setDialogOpen(false);
      form.reset();
    } catch {
      setError("Erreur lors de la création.");
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
      const role = list === "coaches" ? ("coach" as const) : ("player" as const);
      await setUserGroupsForRole(uid, userProfile.clubId, newGroupIds, currentGroupIds, role);
      const setter = list === "coaches" ? setCoaches : setPlayers;
      setter((prev) => prev.map((m) => (m.uid === uid ? { ...m, groupIds: newGroupIds } : m)));
    } catch {
      setError("Erreur lors de la modification.");
    }
  };

  const handlePositionChange = async (uid: string, position: Position | null) => {
    try {
      await setMemberPosition(uid, position);
      setPlayers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, position: position ?? undefined } : m)),
      );
    } catch {
      setError("Erreur lors de la modification.");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const selectedGroup = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) ?? null : null;
  const filteredCoaches = selectedGroup
    ? coaches.filter((c) => c.groupIds.includes(selectedGroup.id))
    : coaches;
  let filteredPlayers = selectedGroup
    ? players.filter((p) => p.groupIds.includes(selectedGroup.id))
    : players;

  if (positionFilter > 0 && positionFilter <= POSITIONS.length) {
    filteredPlayers = filteredPlayers.filter((p) => p.position === POSITIONS[positionFilter - 1]);
  } else if (positionFilter > POSITIONS.length) {
    filteredPlayers = filteredPlayers.filter((p) => !p.position);
  }

  const handleDeleteGroup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGroup(deleteTarget.id);
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      if (selectedGroupId === deleteTarget.id) setSelectedGroupId(null);
      // Update members' groupIds
      setCoaches((prev) => prev.map((m) => ({ ...m, groupIds: m.groupIds.filter((id) => id !== deleteTarget.id) })));
      setPlayers((prev) => prev.map((m) => ({ ...m, groupIds: m.groupIds.filter((id) => id !== deleteTarget.id) })));
    } catch {
      setError("Erreur lors de la suppression du groupe.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    const reordered = arrayMove(groups, oldIndex, newIndex);
    setGroups(reordered);
    await reorderGroups(reordered.map((g) => g.id));
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Tabs
          value={selectedGroupId === null ? 0 : groups.findIndex((g) => g.id === selectedGroupId) + 1}
          onChange={(_e, v) => setSelectedGroupId(v === 0 ? null : groups[v - 1]?.id ?? null)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flexGrow: 1 }}
        >
          <Tab label="Tous" />
          {groups.map((g) => (
            <Tab key={g.id} label={g.name} />
          ))}
        </Tabs>
        {canManage && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ ml: 2, whiteSpace: "nowrap" }}
          >
            Créer un groupe
          </Button>
        )}
      </Box>

      {/* Groupes draggable (tab Tous uniquement) */}
      {!selectedGroup && groups.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Groupes</Typography>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              <Paper variant="outlined">
                {groups.map((g) => (
                  <SortableGroupItem
                    key={g.id}
                    group={g}
                    canDrag={canManage}
                    canDelete={canManage}
                    onDelete={() => setDeleteTarget(g)}
                  />
                ))}
              </Paper>
            </SortableContext>
          </DndContext>
        </Box>
      )}

      {/* Coachs */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        Coachs
      </Typography>
      <MemberTable
        members={filteredCoaches}
        groups={groups}
        canManage={canManage}
        showPosition={false}
        showGroups={!selectedGroup}
        emptyMessage="Aucun coach."
        onGroupsChange={(uid, newIds, curIds) => handleGroupsChange(uid, newIds, curIds, "coaches")}
      />

      {/* Joueurs */}
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Joueurs
      </Typography>
      <Tabs
        value={positionFilter}
        onChange={(_e, v) => setPositionFilter(v)}
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Tous" />
        {POSITIONS.map((p) => (
          <Tab key={p} label={p} />
        ))}
        <Tab label="Non défini" />
      </Tabs>
      <MemberTable
        members={filteredPlayers}
        groups={groups}
        canManage={canManage}
        showPosition={true}
        showGroups={!selectedGroup}
        emptyMessage="Aucun joueur."
        onGroupsChange={(uid, newIds, curIds) => handleGroupsChange(uid, newIds, curIds, "players")}
        onPositionChange={handlePositionChange}
      />

      {/* Dialog création groupe */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={form.handleSubmit(onCreateGroup)}>
          <DialogTitle>Créer un groupe — {category}</DialogTitle>
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

      {/* Dialog suppression groupe */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer le groupe</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Voulez-vous vraiment supprimer le groupe « {deleteTarget?.name} » ? Tous les liens entre les membres et ce groupe seront supprimés.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDeleteGroup} disabled={deleting}>
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function MemberTable({
  members,
  groups,
  canManage,
  showPosition = false,
  showGroups = true,
  emptyMessage,
  onGroupsChange,
  onPositionChange,
}: {
  members: MemberRow[];
  groups: GroupWithId[];
  canManage: boolean;
  showPosition?: boolean;
  showGroups?: boolean;
  emptyMessage: string;
  onGroupsChange: (uid: string, newGroupIds: string[], currentGroupIds: string[]) => void;
  onPositionChange?: (uid: string, position: Position | null) => void;
}) {
  const colCount = 2 + (showPosition ? 1 : 0) + (showGroups ? 1 : 0);
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Prénom</TableCell>
            {showPosition && <TableCell>Poste</TableCell>}
            {showGroups && <TableCell>Groupes</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => {
            const memberGroups = groups.filter((g) => member.groupIds.includes(g.id));
            return (
              <TableRow key={member.uid}>
                <TableCell>{member.lastName}</TableCell>
                <TableCell>{member.firstName}</TableCell>
                {showPosition && (
                  <TableCell>
                    {canManage && onPositionChange ? (
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value={member.position ?? ""}
                          displayEmpty
                          onChange={(e) =>
                            onPositionChange(member.uid, e.target.value ? (e.target.value as Position) : null)
                          }
                        >
                          <MenuItem value="">—</MenuItem>
                          {POSITIONS.map((p) => (
                            <MenuItem key={p} value={p}>
                              {p}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Typography variant="body2">{member.position ?? "—"}</Typography>
                    )}
                  </TableCell>
                )}
                {showGroups && (
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
                          onGroupsChange(member.uid, newValue.map((g) => g.id), member.groupIds)
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
                )}
              </TableRow>
            );
          })}
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} align="center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SortableGroupItem({ group, canDrag, canDelete, onDelete }: { group: GroupWithId; canDrag: boolean; canDelete?: boolean; onDelete?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

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
        alignItems: "center",
        px: 2,
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      {canDrag && (
        <DragIndicator
          fontSize="small"
          sx={{ cursor: "grab", color: "action.active", mr: 1.5 }}
          {...attributes}
          {...listeners}
        />
      )}
      <GroupIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
      <Typography sx={{ flexGrow: 1 }}>{group.name}</Typography>
      {canDelete && onDelete && (
        <IconButton size="small" color="error" onClick={onDelete}>
          <Delete fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}
