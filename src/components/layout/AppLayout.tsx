import { useState } from "react";
import { Outlet, useNavigate } from "react-router";
import {
  AppBar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import People from "@mui/icons-material/People";
import Settings from "@mui/icons-material/Settings";
import { useAuth } from "../../contexts/AuthContext";
import AppLogo from "../AppLogo";

export default function AppLayout() {
  const { userProfile, clubName, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate("/connexion");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 2 }}>
            <AppLogo size="small" onClick={() => navigate("/")} />
            {clubName && (
              <Typography variant="body1" sx={{ opacity: 0.85 }}>
                {clubName}
              </Typography>
            )}
          </Box>

          {userProfile && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {userProfile.admin && (
                <>
                  <IconButton color="inherit" onClick={() => navigate("/membres")}>
                    <People />
                  </IconButton>
                  <IconButton color="inherit" onClick={() => navigate("/club")}>
                    <Settings />
                  </IconButton>
                </>
              )}
              <Typography variant="body2">
                {userProfile.firstName}
              </Typography>
              <IconButton color="inherit" onClick={handleMenu}>
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem onClick={() => { handleClose(); navigate("/profil"); }}>
                  Mon profil
                </MenuItem>
                <MenuItem onClick={handleLogout}>Se déconnecter</MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
