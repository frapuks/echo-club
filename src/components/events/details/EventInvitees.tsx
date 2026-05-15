import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Avatar from "@mui/material/Avatar";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlined";
import type { MemberWithId } from "../../../services/members.service";
import type { InviteeResponse } from "../../../types/event";

type Status = InviteeResponse | "none";

const SECTIONS: { status: Status; label: string; color: "success" | "error" | "text" }[] = [
  { status: "present", label: "Présents", color: "success" },
  { status: "absent", label: "Absents", color: "error" },
  { status: "none", label: "Sans réponse", color: "text" },
];

function StatusIcon({ status }: { status: Status }) {
  if (status === "present") return <CheckCircleIcon color="success" />;
  if (status === "absent") return <CancelIcon color="error" />;
  return <HelpOutlineIcon color="disabled" />;
}

function displayNameOf(m: MemberWithId): string {
  return (
    m.displayName?.trim() ||
    `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
    m.email
  );
}

interface Props {
  invitees: MemberWithId[];
  responses?: Record<string, InviteeResponse>;
  canEdit?: boolean;
  onChangeResponse?: (uid: string, status: Status) => void | Promise<void>;
}

export default function EventInvitees({
  invitees,
  responses,
  canEdit,
  onChangeResponse,
}: Props) {
  if (invitees.length === 0) return null;

  const byStatus: Record<Status, MemberWithId[]> = {
    present: [],
    absent: [],
    none: [],
  };
  for (const m of invitees) {
    const status = (responses?.[m.uid] ?? "none") as Status;
    byStatus[status].push(m);
  }
  for (const status of Object.keys(byStatus) as Status[]) {
    byStatus[status].sort((a, b) =>
      displayNameOf(a).localeCompare(displayNameOf(b)),
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      {SECTIONS.map(({ status, label, color }) => {
        const members = byStatus[status];
        if (members.length === 0) return null;
        return (
          <Box key={status} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{
                color: color === "text" ? "text.secondary" : `${color}.main`,
                mb: 1,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {label} ({members.length})
            </Typography>
            <List disablePadding>
              {members.map((member) => {
                const status_ = (responses?.[member.uid] ?? "none") as Status;
                return (
                  <ListItem
                    key={member.uid}
                    disableGutters
                    secondaryAction={
                      canEdit && onChangeResponse ? (
                        <ToggleButtonGroup
                          value={status_}
                          exclusive
                          size="small"
                          onChange={(_e, value: Status | null) => {
                            if (value !== null) onChangeResponse(member.uid, value);
                          }}
                        >
                          <ToggleButton value="present" aria-label="Présent">
                            <CheckCircleIcon fontSize="small" color="success" />
                          </ToggleButton>
                          <ToggleButton value="absent" aria-label="Absent">
                            <CancelIcon fontSize="small" color="error" />
                          </ToggleButton>
                          <ToggleButton value="none" aria-label="Sans réponse">
                            <HelpOutlineIcon fontSize="small" />
                          </ToggleButton>
                        </ToggleButtonGroup>
                      ) : undefined
                    }
                    sx={{
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      "&:last-child": { borderBottom: 0 },
                      pr: canEdit ? 0 : undefined,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: "transparent" }}>
                        <StatusIcon status={status_} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={displayNameOf(member)} />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        );
      })}
    </Box>
  );
}
