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
import {
  getGroup,
  getGroupMembers,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
} from "../services/groups.service";
import { getClubMembers } from "../services/members.service";
import type { GroupMemberWithProfile, GroupRole } from "../types/group";
import type { MemberWithId } from "../services/members.service";

const groupRoleOptions: { value: GroupRole; label: string }[] = [
  { value: "coach", label: "Coach" },
  { value: "player", label: "Joueur" },
];

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userProfile?.admin === true;

  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [clubMembers, setClubMembers] = useState<MemberWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<GroupRole>("player");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!groupId || !userProfile?.clubId) return;

    Promise.all([
      getGroup(groupId),
      getGroupMembers(groupId),
      getClubMembers(userProfile.clubId),
    ])
      .then(([group, groupMembers, allMembers]) => {
        setGroupName(group?.name ?? "");
        setMembers(groupMembers);
        setClubMembers(allMembers);
      })
      .catch(() => setError("Erreur lors du chargement."))
      .finally(() => setLoading(false));
  }, [groupId, userProfile?.clubId]);

  const availableMembers = clubMembers.filter(
    (cm) => !members.some((m) => m.userId === cm.uid)
  );

  const handleAddMember = async () => {
    if (!groupId || !userProfile?.clubId || !selectedUserId) return;
    setAdding(true);
    setError("");
    try {
      await addGroupMember(groupId, userProfile.clubId, selectedUserId, selectedRole);
      // Refresh members
      const updated = await getGroupMembers(groupId);
      setMembers(updated);
      setDialogOpen(false);
      setSelectedUserId("");
      setSelectedRole("player");
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

  const handleRoleChange = async (memberId: string, role: GroupRole) => {
    try {
      await updateGroupMemberRole(memberId, role);
      setMembers((prev) =>
        prev.map((m) => (m.memberId === memberId ? { ...m, role } : m))
      );
    } catch {
      setError("Erreur lors de la modification du rôle.");
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate("/membres")}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {groupName}
        </Typography>
        {isAdmin && (
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Prénom</TableCell>
              <TableCell>Rôle dans le groupe</TableCell>
              {isAdmin && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.memberId}>
                <TableCell>{member.lastName}</TableCell>
                <TableCell>{member.firstName}</TableCell>
                <TableCell>
                  {isAdmin ? (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.memberId, e.target.value as GroupRole)
                        }
                      >
                        {groupRoleOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    groupRoleOptions.find((o) => o.value === member.role)?.label ?? "Joueur"
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleRemove(member.memberId)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} align="center">
                  Aucun membre dans ce groupe.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
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
            <InputLabel>Rôle</InputLabel>
            <Select
              value={selectedRole}
              label="Rôle"
              onChange={(e) => setSelectedRole(e.target.value as GroupRole)}
            >
              {groupRoleOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
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
