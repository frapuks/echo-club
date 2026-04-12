import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Delete from "@mui/icons-material/Delete";
import PersonAdd from "@mui/icons-material/PersonAdd";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useAuth } from "../contexts/AuthContext";
import { canManageCategory } from "../utils/permissions";
import {
  getGroup,
  getGroupMembers,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberPosition,
} from "../services/groups.service";
import { getCategoryPlayers, type MemberWithId } from "../services/members.service";
import type { GroupMemberWithProfile, GroupRole, GroupWithId, Position } from "../types/group";
import { POSITIONS } from "../types/group";

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupWithId | null>(null);
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [categoryMembers, setCategoryMembers] = useState<MemberWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<GroupRole[]>(["player"]);
  const [selectedPosition, setSelectedPosition] = useState<Position | "">("");
  const [adding, setAdding] = useState(false);

  const canManage = group ? canManageCategory(userProfile, group.category) : false;

  useEffect(() => {
    if (!groupId || !userProfile?.clubId) return;

    getGroup(groupId)
      .then(async (g) => {
        if (!g) return;
        setGroup(g);

        const [groupMembers, catMembers] = await Promise.all([
          getGroupMembers(groupId),
          getCategoryPlayers(userProfile.clubId!, g.category),
        ]);
        setMembers(groupMembers);
        setCategoryMembers(catMembers);
      })
      .catch(() => setError("Erreur lors du chargement."))
      .finally(() => setLoading(false));
  }, [groupId, userProfile?.clubId]);

  const availableMembers = categoryMembers.filter(
    (cm) => !members.some((m) => m.userId === cm.uid)
  );

  const handleAddMember = async () => {
    if (!groupId || !userProfile?.clubId || !selectedUserId) return;
    setAdding(true);
    setError("");
    try {
      await addGroupMember(groupId, userProfile.clubId, selectedUserId, selectedRoles);
      if (selectedPosition) {
        const updated = await getGroupMembers(groupId);
        const newMember = updated.find((m) => m.userId === selectedUserId);
        if (newMember) {
          await updateGroupMemberPosition(newMember.memberId, selectedPosition);
        }
        setMembers(updated.map((m) =>
          m.userId === selectedUserId ? { ...m, position: selectedPosition || undefined } : m
        ));
      } else {
        const updated = await getGroupMembers(groupId);
        setMembers(updated);
      }
      setDialogOpen(false);
      setSelectedUserId("");
      setSelectedRoles(["player"]);
      setSelectedPosition("");
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (e.message === "ALREADY_MEMBER") {
        setError("Ce membre fait déjà partie du groupe.");
      } else {
        setError("Erreur lors de l'ajout du membre.");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeGroupMember(memberId);
      setMembers((prev) => prev.filter((m) => m.memberId !== memberId));
    } catch {
      setError("Erreur lors de la suppression.");
    }
  };

  const handlePositionChange = async (memberId: string, position: Position | null) => {
    try {
      await updateGroupMemberPosition(memberId, position);
      setMembers((prev) =>
        prev.map((m) =>
          m.memberId === memberId ? { ...m, position: position ?? undefined } : m
        )
      );
    } catch {
      setError("Erreur lors de la modification du poste.");
    }
  };

  const coaches = members.filter((m) => m.roles.includes("coach"));
  const players = members.filter((m) => m.roles.includes("player"));

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate(group ? `/categories/${group.category}` : "/")}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {group?.name}
        </Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setDialogOpen(true)}
            disabled={availableMembers.length === 0}
          >
            Ajouter un membre
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Coachs */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Coachs
      </Typography>
      <MemberPositionTable
        members={coaches}
        canManage={canManage}
        showPosition={false}
        emptyMessage="Aucun coach dans ce groupe."
        onPositionChange={handlePositionChange}
        onRemove={handleRemove}
      />

      {/* Joueurs */}
      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        Joueurs
      </Typography>
      <MemberPositionTable
        members={players}
        canManage={canManage}
        showPosition={true}
        emptyMessage="Aucun joueur dans ce groupe."
        onPositionChange={handlePositionChange}
        onRemove={handleRemove}
      />

      {/* Dialog ajout */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Ajouter un membre</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Membre</InputLabel>
            <Select
              value={selectedUserId}
              label="Membre"
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {availableMembers.map((m) => (
                <MenuItem key={m.uid} value={m.uid}>
                  {m.firstName} {m.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Poste</InputLabel>
            <Select
              value={selectedPosition}
              label="Poste"
              onChange={(e) => setSelectedPosition(e.target.value as Position | "")}
            >
              <MenuItem value="">Aucun</MenuItem>
              {POSITIONS.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleAddMember}
            disabled={!selectedUserId || adding}
          >
            {adding ? "Ajout..." : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function MemberPositionTable({
  members,
  canManage,
  showPosition = true,
  emptyMessage,
  onPositionChange,
  onRemove,
}: {
  members: GroupMemberWithProfile[];
  canManage: boolean;
  showPosition?: boolean;
  emptyMessage: string;
  onPositionChange: (memberId: string, position: Position | null) => void;
  onRemove: (memberId: string) => void;
}) {
  const colCount = 2 + (showPosition ? 1 : 0) + (canManage ? 1 : 0);
  return (
    <TableContainer component={Paper}>
      <Table sx={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "25%" }} />
          <col style={{ width: "25%" }} />
          {showPosition && <col style={{ width: "30%" }} />}
          {canManage && <col style={{ width: showPosition ? "20%" : "50%" }} />}
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Prénom</TableCell>
            {showPosition && <TableCell>Poste</TableCell>}
            {canManage && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.memberId}>
              <TableCell>{member.lastName}</TableCell>
              <TableCell>{member.firstName}</TableCell>
              {showPosition && (
                <TableCell>
                  {canManage ? (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={member.position ?? ""}
                        displayEmpty
                        onChange={(e) =>
                          onPositionChange(
                            member.memberId,
                            e.target.value ? (e.target.value as Position) : null
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
              {canManage && (
                <TableCell align="right">
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => onRemove(member.memberId)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
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
