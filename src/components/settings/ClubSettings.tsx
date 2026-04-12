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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Refresh from "@mui/icons-material/Refresh";
import { useAuth } from "../../contexts/AuthContext";
import {
  getClub,
  updateClub,
  regenerateInviteCode,
} from "../../services/club.service";
import {
  getClubMembers,
  setMemberAdmin,
  type MemberWithId,
} from "../../services/members.service";

interface ClubForm {
  name: string;
}

export default function ClubSettings() {
  const { user, userProfile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [clubSubmitting, setClubSubmitting] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [allMembers, setAllMembers] = useState<MemberWithId[]>([]);

  const clubForm = useForm<ClubForm>();

  useEffect(() => {
    if (!userProfile?.clubId) return;
    const load = async () => {
      try {
        const [club, members] = await Promise.all([
          getClub(userProfile.clubId!),
          getClubMembers(userProfile.clubId!),
        ]);
        if (club) {
          clubForm.reset({ name: club.name });
          if (club.inviteCode) {
            setInviteCode(club.inviteCode);
          } else {
            const code = await regenerateInviteCode(userProfile.clubId!);
            setInviteCode(code);
          }
        }
        setAllMembers(members);
      } catch {
        setError("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userProfile?.clubId]);

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
      setInviteCode(await regenerateInviteCode(userProfile.clubId));
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
      setAllMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, admin: true } : m)));
    } catch { setError("Erreur lors de la modification."); }
  };

  const handleRemoveAdmin = async (uid: string) => {
    try {
      await setMemberAdmin(uid, false);
      setAllMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, admin: false } : m)));
    } catch { setError("Erreur lors de la modification."); }
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 600 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Informations du club</Typography>
          <Box component="form" onSubmit={clubForm.handleSubmit(onClubSubmit)} noValidate>
            <TextField label="Nom du club" fullWidth margin="normal" error={!!clubForm.formState.errors.name} helperText={clubForm.formState.errors.name?.message} {...clubForm.register("name", { required: "Le nom du club est requis." })} />
            <Button type="submit" variant="contained" disabled={clubSubmitting} sx={{ mt: 2 }}>
              {clubSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Code d'invitation</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Partagez ce code pour permettre à d'autres personnes de rejoindre le club.</Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
            <Typography variant="h4" sx={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em" }}>{inviteCode}</Typography>
            <Tooltip title={copied ? "Copié !" : "Copier"}>
              <IconButton onClick={handleCopy} size="small"><ContentCopy fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Button variant="text" size="small" startIcon={<Refresh />} onClick={handleRegenerate}>Générer un nouveau code</Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Administrateurs</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Les administrateurs peuvent gérer les membres, les groupes et les paramètres du club.</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            {admins.map((admin) => (
              <Chip key={admin.uid} label={`${admin.firstName} ${admin.lastName}`} onDelete={admin.uid === user?.uid ? undefined : () => handleRemoveAdmin(admin.uid)} />
            ))}
            {admins.length === 0 && <Typography variant="body2" color="text.secondary">Aucun administrateur.</Typography>}
          </Box>
          <Autocomplete size="small" options={nonAdmins} getOptionLabel={(m) => `${m.firstName} ${m.lastName}`} onChange={(_e, value) => { if (value) handleAddAdmin(value.uid); }} value={null} renderInput={(params) => <TextField {...params} placeholder="Ajouter un administrateur" />} />
        </CardContent>
      </Card>
    </Box>
  );
}
