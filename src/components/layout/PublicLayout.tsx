import { Outlet } from "react-router";
import { Box, Container, Typography } from "@mui/material";

export default function PublicLayout() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="sm">
        <Typography
          variant="h4"
          component="h1"
          align="center"
          sx={{ mb: 4, fontWeight: 700 }}
        >
          ECHO CLUB
        </Typography>
        <Outlet />
      </Container>
    </Box>
  );
}
