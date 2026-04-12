import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import {
  getClubMembers,
  setMemberCoachCategories,
  setMemberPlayerCategories,
  type MemberWithId,
} from "../../services/members.service";
import { getClub } from "../../services/club.service";

export default function MembersSettings() {
  const { userProfile } = useAuth();
  const [members, setMembers] = useState<MemberWithId[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userProfile?.clubId) return;
    const load = async () => {
      try {
        const [clubMembers, club] = await Promise.all([
          getClubMembers(userProfile.clubId!),
          getClub(userProfile.clubId!),
        ]);
        setMembers(clubMembers);
        setCategories(club?.categories ?? []);
      } catch {
        setError("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userProfile?.clubId]);

  const handleCoachChange = async (uid: string, cats: string[]) => {
    try {
      await setMemberCoachCategories(uid, cats);
      setMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, coachCategories: cats } : m)));
    } catch { setError("Erreur lors de la modification."); }
  };

  const handlePlayerChange = async (uid: string, cats: string[]) => {
    try {
      await setMemberPlayerCategories(uid, cats);
      setMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, playerCategories: cats } : m)));
    } catch { setError("Erreur lors de la modification."); }
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
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
            {members.map((member) => (
              <TableRow key={member.uid}>
                <TableCell>{member.lastName}</TableCell>
                <TableCell>{member.firstName}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell sx={{ minWidth: 200 }}>
                  <Autocomplete multiple size="small" options={categories} value={(member.coachCategories ?? []).filter((c) => categories.includes(c))} onChange={(_e, v) => handleCoachChange(member.uid, v)} renderInput={(params) => <TextField {...params} />} />
                </TableCell>
                <TableCell sx={{ minWidth: 200 }}>
                  <Autocomplete multiple size="small" options={categories} value={(member.playerCategories ?? []).filter((c) => categories.includes(c))} onChange={(_e, v) => handlePlayerChange(member.uid, v)} renderInput={(params) => <TextField {...params} />} />
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && <TableRow><TableCell colSpan={5} align="center">Aucun membre.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
