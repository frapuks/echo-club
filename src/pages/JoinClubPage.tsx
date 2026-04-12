import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import GroupAdd from "@mui/icons-material/GroupAdd";
import Add from "@mui/icons-material/Add";
import { useAuth } from "../contexts/AuthContext";

interface JoinClubForm {
  code: string;
}

interface CreateClubForm {
  name: string;
}

export default function JoinClubPage() {
  const { userProfile, joinClub, createClub } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const joinForm = useForm<JoinClubForm>();
  const createForm = useForm<CreateClubForm>();

  if (userProfile?.clubId) {
    return <Navigate to="/" replace />;
  }

  const onJoin = async (data: JoinClubForm) => {
    setError("");
    setSubmitting(true);
    try {
      await joinClub(data.code);
    } catch (err: unknown) {
      console.error("Join club error:", err);
      const firebaseError = err as { message?: string };
      if (firebaseError.message === "INVALID_INVITATION_CODE") {
        setError("Code invalide ou déjà utilisé.");
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onCreate = async (data: CreateClubForm) => {
    setError("");
    setSubmitting(true);
    try {
      await createClub(data.name);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Card sx={{ maxWidth: 450, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ textAlign: "center", mb: 2 }}>
            <GroupAdd sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
            <Typography variant="h5">Rejoindre un club</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Entrez le code fourni par votre club.
            </Typography>
          </Box>

          <Box component="form" onSubmit={joinForm.handleSubmit(onJoin)} noValidate>
            <TextField
              label="Code du club"
              fullWidth
              margin="normal"
              autoFocus
              error={!!joinForm.formState.errors.code}
              helperText={joinForm.formState.errors.code?.message}
              slotProps={{
                htmlInput: {
                  style: {
                    textTransform: "uppercase",
                    textAlign: "center",
                    fontSize: "1.2rem",
                    letterSpacing: "0.15em",
                  },
                },
              }}
              {...joinForm.register("code", {
                required: "Le code est requis.",
              })}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={submitting}
              sx={{ mt: 1 }}
            >
              {submitting ? "Vérification..." : "Rejoindre"}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>ou</Divider>

          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Add sx={{ fontSize: 48, color: "secondary.main", mb: 1 }} />
            <Typography variant="h5">Créer un club</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Vous deviendrez administrateur du club.
            </Typography>
          </Box>

          <Box component="form" onSubmit={createForm.handleSubmit(onCreate)} noValidate>
            <TextField
              label="Nom du club"
              fullWidth
              margin="normal"
              error={!!createForm.formState.errors.name}
              helperText={createForm.formState.errors.name?.message}
              {...createForm.register("name", {
                required: "Le nom du club est requis.",
              })}
            />
            <Button
              type="submit"
              variant="outlined"
              color="secondary"
              fullWidth
              size="large"
              disabled={submitting}
              sx={{ mt: 1 }}
            >
              {submitting ? "Création..." : "Créer mon club"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
