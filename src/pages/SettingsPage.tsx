import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import CategoryIcon from "@mui/icons-material/Category";
import SportsHandballIcon from "@mui/icons-material/SportsHandball";
import StadiumIcon from "@mui/icons-material/Stadium";
import { useAuth } from "../contexts/AuthContext";
import { getClub } from "../services/club.service";
import ProfileSettings from "../components/settings/ProfileSettings";
import ClubSettings from "../components/settings/ClubSettings";
import MembersSettings from "../components/settings/MembersSettings";
import CategoriesSettings from "../components/settings/CategoriesSettings";
import CategorySettings from "../components/settings/CategorySettings";
import VenuesSettings from "../components/settings/VenuesSettings";

const DRAWER_WIDTH = 240;

export default function SettingsPage() {
  const { userProfile } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [activeSection, setActiveSection] = useState("profile");
  const [clubCategories, setClubCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const isAdmin = userProfile?.admin === true;
  const coachCats = userProfile?.coachCategories ?? [];
  const playerCats = userProfile?.playerCategories ?? [];

  useEffect(() => {
    if (!userProfile?.clubId) {
      setLoading(false);
      return;
    }
    getClub(userProfile.clubId)
      .then((club) => setClubCategories(club?.categories ?? []))
      .finally(() => setLoading(false));
  }, [userProfile?.clubId]);

  const handleSelectSection = (section: string) => {
    setActiveSection(section);
    if (isMobile) setDrawerOpen(false);
  };

  // Categories visible in drawer
  const visibleCategories = isAdmin
    ? clubCategories
    : [...new Set([...coachCats, ...playerCats])].filter((c) => clubCategories.includes(c));

  const renderContent = () => {
    if (activeSection === "profile") return <ProfileSettings />;
    if (activeSection === "club") return <ClubSettings />;
    if (activeSection === "members") return <MembersSettings />;
    if (activeSection === "categories") return <CategoriesSettings />;
    if (activeSection === "venues") return <VenuesSettings />;
    if (activeSection.startsWith("cat:")) {
      const cat = activeSection.slice(4);
      return <CategorySettings key={cat} category={cat} />;
    }
    return null;
  };

  const getSectionLabel = () => {
    if (activeSection === "profile") return "Profil";
    if (activeSection === "club") return "Club";
    if (activeSection === "members") return "Membres";
    if (activeSection === "categories") return "Catégories";
    if (activeSection === "venues") return "Salles";
    if (activeSection.startsWith("cat:")) return activeSection.slice(4);
    return "";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const drawerContent = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Réglages
        </Typography>
      </Toolbar>
      <List>
        <ListItemButton selected={activeSection === "profile"} onClick={() => handleSelectSection("profile")}>
          <ListItemIcon><PersonIcon /></ListItemIcon>
          <ListItemText primary="Profil" />
        </ListItemButton>

        {isAdmin && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItemButton selected={activeSection === "club"} onClick={() => handleSelectSection("club")}>
              <ListItemIcon><BusinessIcon /></ListItemIcon>
              <ListItemText primary="Club" />
            </ListItemButton>
            <ListItemButton selected={activeSection === "members"} onClick={() => handleSelectSection("members")}>
              <ListItemIcon><PeopleIcon /></ListItemIcon>
              <ListItemText primary="Membres" />
            </ListItemButton>
            <ListItemButton selected={activeSection === "categories"} onClick={() => handleSelectSection("categories")}>
              <ListItemIcon><CategoryIcon /></ListItemIcon>
              <ListItemText primary="Catégories" />
            </ListItemButton>
            <ListItemButton selected={activeSection === "venues"} onClick={() => handleSelectSection("venues")}>
              <ListItemIcon><StadiumIcon /></ListItemIcon>
              <ListItemText primary="Salles" />
            </ListItemButton>
          </>
        )}

        {visibleCategories.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            {visibleCategories.map((cat) => (
              <ListItemButton
                key={cat}
                selected={activeSection === `cat:${cat}`}
                onClick={() => handleSelectSection(`cat:${cat}`)}
              >
                <ListItemIcon><SportsHandballIcon /></ListItemIcon>
                <ListItemText primary={cat} />
              </ListItemButton>
            ))}
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", mx: -3, mt: -3, minHeight: "calc(100vh - 64px)" }}>
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            position: isMobile ? "fixed" : "relative",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <IconButton
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label={drawerOpen ? "Masquer le menu" : "Afficher le menu"}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h4">{getSectionLabel()}</Typography>
        </Box>
        {renderContent()}
      </Box>
    </Box>
  );
}
