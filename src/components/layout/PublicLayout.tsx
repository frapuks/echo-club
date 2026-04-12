import { Outlet } from "react-router";
import { Box, Container } from "@mui/material";
import AppLogo from "../AppLogo";

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
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <AppLogo size="large" />
        </Box>
        <Outlet />
      </Container>
    </Box>
  );
}
