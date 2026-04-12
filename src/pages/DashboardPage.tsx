import { Box, Paper, Typography } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import JoinClubPage from "./JoinClubPage";

export default function DashboardPage() {
  const { userProfile } = useAuth();

  if (!userProfile?.clubId) {
    return <JoinClubPage />;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Bienvenue, {userProfile.firstName} !
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Le tableau de bord sera disponible prochainement.
        </Typography>
      </Paper>
    </Box>
  );
}
