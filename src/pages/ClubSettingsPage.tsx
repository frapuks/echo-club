import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Refresh from "@mui/icons-material/Refresh";
import Delete from "@mui/icons-material/Delete";
import Add from "@mui/icons-material/Add";
import { useAuth } from "../contexts/AuthContext";
import {
  getClub,
  updateClub,
  regenerateInviteCode,
  updateClubCategories,
} from "../services/club.service";
import {
  getClubMembers,
  setMemberAdmin,
  setMemberCoachCategories,
  setMemberPlayerCategories,
  type MemberWithId,
} from "../services/members.service";

interface ClubForm {
  name: string;
}

export default function ClubSettingsPage() {
  const { user, userProfile, refreshProfile } = useAuth();

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [clubSubmitting, setClubSubmitting] = useState(false);

  const [allMembers, setAllMembers] = useState<MemberWithId[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const clubForm = useForm<ClubForm>();

  useEffect(() => {
    if (!userProfile?.clubId) return;

    const load = async () => {
      try {
        const [club, clubMembers] = await Promise.all([
          getClub(userProfile.clubId!),
          getClubMembers(userProfile.clubId!),
        ]);

        if (club) {
          clubForm.reset({ name: club.name });
          setCategories(club.categories ?? []);
          if (club.inviteCode) {
            setInviteCode(club.inviteCode);
          } else {
            const code = await regenerateInviteCode(userProfile.clubId!);
            setInviteCode(code);
          }
        }

        setAllMembers(clubMembers);
      } catch {
        setError("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userProfile?.clubId]);

  // --- General tab handlers ---
  const onClubSubmit = async (data: ClubForm) => {
    if (!userProfile?.clubId) return;
    setError("");
    setSuccess("");
    setClubSubmitting(true);
    try {
      await updateClub(userProfile.clubId, { name: data.name });
      await refreshProfile();
      setSuccess("Club mis à jour.");
    } catch {
      setError("Erreur lors de la mise à jour.");
    } finally {
      setClubSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!userProfile?.clubId) return;
    try {
      const newCode = await regenerateInviteCode(userProfile.clubId);
      setInviteCode(newCode);
    } catch {
      setError("Erreur lors de la régénération du code.");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const admins = allMembers.filter((m) => m.admin === true);
  const nonAdmins = allMembers.filter((m) => !m.admin);

  const handleAddAdmin = async (uid: string) => {
    try {
      await setMemberAdmin(uid, true);
      setAllMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, admin: true } : m)),
      );
    } catch {
      setError("Erreur lors de la modification.");
    }
  };

  const handleRemoveAdmin = async (uid: string) => {
    try {
      await setMemberAdmin(uid, false);
      setAllMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, admin: false } : m)),
      );
    } catch {
      setError("Erreur lors de la modification.");
    }
  };

  // --- Members tab handlers ---
  const handleCoachCategoriesChange = async (uid: string, cats: string[]) => {
    try {
      await setMemberCoachCategories(uid, cats);
      setAllMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, coachCategories: cats } : m)),
      );
    } catch {
      setError("Erreur lors de la modification.");
    }
  };

  const handlePlayerCategoriesChange = async (uid: string, cats: string[]) => {
    try {
      await setMemberPlayerCategories(uid, cats);
      setAllMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, playerCategories: cats } : m)),
      );
    } catch {
      setError("Erreur lors de la modification.");
    }
  };

  // --- Categories tab handlers ---
  const handleAddCategory = async () => {
    if (!userProfile?.clubId || !newCategory.trim()) return;
    const updated = [...categories, newCategory.trim()];
    try {
      await updateClubCategories(userProfile.clubId, updated);
      setCategories(updated);
      setNewCategory("");
    } catch {
      setError("Erreur lors de l'ajout.");
    }
  };

  const handleRemoveCategory = async (cat: string) => {
    if (!userProfile?.clubId) return;
    const updated = categories.filter((c) => c !== cat);
    try {
      await updateClubCategories(userProfile.clubId, updated);
      setCategories(updated);
    } catch {
      setError("Erreur lors de la suppression.");
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
      <Typography variant="h4" sx={{ mb: 2 }}>
        Paramètres du club
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Général" />
        <Tab label="Membres" />
        <Tab label="Catégories" />
      </Tabs>

      {/* === Tab Général === */}
      {tab === 0 && (
        <Box sx={{ maxWidth: 600 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Informations du club
              </Typography>
              <Box
                component="form"
                onSubmit={clubForm.handleSubmit(onClubSubmit)}
                noValidate
              >
                <TextField
                  label="Nom du club"
                  fullWidth
                  margin="normal"
                  error={!!clubForm.formState.errors.name}
                  helperText={clubForm.formState.errors.name?.message}
                  {...clubForm.register("name", {
                    required: "Le nom du club est requis.",
                  })}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={clubSubmitting}
                  sx={{ mt: 2 }}
                >
                  {clubSubmitting ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Code d'invitation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Partagez ce code pour permettre à d'autres personnes de
                rejoindre le club.
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  p: 2,
                  bgcolor: "grey.100",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                  }}
                >
                  {inviteCode}
                </Typography>
                <Tooltip title={copied ? "Copié !" : "Copier"}>
                  <IconButton onClick={handleCopy} size="small">
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<Refresh />}
                  onClick={handleRegenerate}
                >
                  Générer un nouveau code
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Administrateurs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Les administrateurs peuvent gérer les membres, les groupes et
                les paramètres du club.
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                {admins.map((admin) => {
                  const isSelf = admin.uid === user?.uid;
                  return (
                    <Chip
                      key={admin.uid}
                      label={`${admin.firstName} ${admin.lastName}`}
                      onDelete={
                        isSelf
                          ? undefined
                          : () => handleRemoveAdmin(admin.uid)
                      }
                    />
                  );
                })}
                {admins.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Aucun administrateur.
                  </Typography>
                )}
              </Box>
              <Autocomplete
                size="small"
                options={nonAdmins}
                getOptionLabel={(m) => `${m.firstName} ${m.lastName}`}
                onChange={(_e, value) => {
                  if (value) handleAddAdmin(value.uid);
                }}
                value={null}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Ajouter un administrateur"
                  />
                )}
              />
            </CardContent>
          </Card>
        </Box>
      )}

      {/* === Tab Membres === */}
      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Prénom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Catégories coach</TableCell>
                <TableCell>Catégories joueur</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allMembers.map((member) => (
                <TableRow key={member.uid}>
                  <TableCell>{member.lastName}</TableCell>
                  <TableCell>{member.firstName}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <Autocomplete
                      multiple
                      size="small"
                      options={categories}
                      value={(member.coachCategories ?? []).filter((c) =>
                        categories.includes(c),
                      )}
                      onChange={(_e, newValue) =>
                        handleCoachCategoriesChange(member.uid, newValue)
                      }
                      renderInput={(params) => <TextField {...params} />}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <Autocomplete
                      multiple
                      size="small"
                      options={categories}
                      value={(member.playerCategories ?? []).filter((c) =>
                        categories.includes(c),
                      )}
                      onChange={(_e, newValue) =>
                        handlePlayerCategoriesChange(member.uid, newValue)
                      }
                      renderInput={(params) => <TextField {...params} />}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {allMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Aucun membre pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* === Tab Catégories === */}
      {tab === 2 && (
        <Box sx={{ maxWidth: 500 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Catégories d'âge
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Gérez les catégories d'âge de votre club.
              </Typography>

              {categories.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Aucune catégorie.
                </Typography>
              ) : (
                <Box sx={{ mb: 2 }}>
                  {categories.map((cat) => (
                    <Box
                      key={cat}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 1,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography>{cat}</Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveCategory(cat)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Nouvelle catégorie"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  fullWidth
                />
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                >
                  Ajouter
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
