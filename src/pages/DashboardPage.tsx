import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import SportsHandball from "@mui/icons-material/SportsHandball";
import GroupIcon from "@mui/icons-material/Group";
import { useAuth } from "../contexts/AuthContext";
import { getClub } from "../services/club.service";
import { getUserGroupMemberships, getGroup } from "../services/groups.service";
import type { GroupWithId } from "../types/group";
import JoinClubPage from "./JoinClubPage";

interface PlayerGroup {
  group: GroupWithId;
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [playerGroups, setPlayerGroups] = useState<PlayerGroup[]>([]);
  const [clubCategories, setClubCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = userProfile?.admin === true;
  const coachCategories = userProfile?.coachCategories ?? [];
  const playerCategories = userProfile?.playerCategories ?? [];

  useEffect(() => {
    if (!user || !userProfile?.clubId) return;

    const load = async () => {
      // Load club categories for admin
      if (isAdmin) {
        const club = await getClub(userProfile.clubId!);
        setClubCategories(club?.categories ?? []);
      }

      // Load player groups if not admin/coach
      if (!isAdmin && coachCategories.length === 0 && playerCategories.length > 0) {
        const memberships = await getUserGroupMemberships(user.uid);
        const groupIds = memberships.map((m) => m.groupId);
        const groups: PlayerGroup[] = [];
        for (const gid of groupIds) {
          const g = await getGroup(gid);
          if (g) groups.push({ group: g });
        }
        setPlayerGroups(groups);
      }

      setLoading(false);
    };

    load();
  }, [user, userProfile]);

  if (!userProfile?.clubId) {
    return <JoinClubPage />;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Admin: show all club categories
  if (isAdmin) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Catégories
        </Typography>
        {clubCategories.length === 0 ? (
          <Typography color="text.secondary">
            Aucune catégorie. Configurez-les dans les paramètres du club.
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
            {clubCategories.map((cat) => (
              <CategoryCard key={cat} category={cat} onClick={() => navigate(`/categories/${cat}`)} />
            ))}
          </Box>
        )}
      </Box>
    );
  }

  // Coach: show coached categories
  if (coachCategories.length > 0) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Mes catégories
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
          {coachCategories.map((cat) => (
            <CategoryCard key={cat} category={cat} onClick={() => navigate(`/categories/${cat}`)} />
          ))}
        </Box>
      </Box>
    );
  }

  // Player: show their groups organized by category
  const groupsByCategory = playerCategories.reduce(
    (acc, cat) => {
      acc[cat] = playerGroups.filter((pg) => pg.group.category === cat);
      return acc;
    },
    {} as Record<string, PlayerGroup[]>,
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Bienvenue, {userProfile.firstName} !
      </Typography>

      {playerCategories.map((cat) => (
        <Box key={cat} sx={{ mb: 3 }}>
          <Typography
            variant="h5"
            sx={{ mb: 1, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
            onClick={() => navigate(`/categories/${cat}`)}
          >
            {cat}
          </Typography>
          {(groupsByCategory[cat]?.length ?? 0) === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucun groupe dans cette catégorie.
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
              {groupsByCategory[cat].map((pg) => (
                <Card key={pg.group.id}>
                  <CardActionArea onClick={() => navigate(`/groupes/${pg.group.id}`)}>
                    <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5 }}>
                      <GroupIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle1">{pg.group.name}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      ))}

      {playerCategories.length === 0 && (
        <Typography color="text.secondary">
          Vous n'êtes affecté à aucune catégorie pour le moment.
        </Typography>
      )}
    </Box>
  );
}

function CategoryCard({ category, onClick }: { category: string; onClick: () => void }) {
  return (
    <Card>
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
          <SportsHandball color="primary" />
          <Typography variant="h6">{category}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
