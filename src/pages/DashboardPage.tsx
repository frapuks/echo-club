import { Box, Typography } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import JoinClubPage from "./JoinClubPage";

export default function DashboardPage() {
  const { userProfile, clubName } = useAuth();

  if (!userProfile?.clubId) {
    return <JoinClubPage />;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Bienvenue, {userProfile.firstName} !
      </Typography>
      {clubName && (
        <Typography variant="h6" color="text.secondary">
          {clubName}
        </Typography>
      )}
    </Box>
  );
}
