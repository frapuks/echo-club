import { Box, Typography } from "@mui/material";
import SportsHandball from "@mui/icons-material/SportsHandball";

interface AppLogoProps {
  size?: "small" | "medium" | "large";
  onClick?: () => void;
}

const sizeMap = {
  small: { icon: 28, text: "h6" },
  medium: { icon: 36, text: "h5" },
  large: { icon: 48, text: "h4" },
} as const;

export default function AppLogo({ size = "medium", onClick }: AppLogoProps) {
  const { icon, text } = sizeMap[size];

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <SportsHandball sx={{ fontSize: icon }} />
      <Typography variant={text} component="span" sx={{ fontWeight: 700 }}>
        ECHO CLUB
      </Typography>
    </Box>
  );
}
