import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link as RouterLink, Navigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  invitationCode: string;
}

function getErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Cet email est déjà utilisé.";
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères.";
    case "INVALID_INVITATION_CODE":
      return "Code d'invitation invalide ou déjà utilisé.";
    default:
      return "Une erreur est survenue. Veuillez réessayer.";
  }
}

export default function RegisterPage() {
  const { register: registerUser, user, loading } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch("password");

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: RegisterForm) => {
    setError("");
    setSubmitting(true);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        invitationCode: data.invitationCode,
      });
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const firebaseError = err as { code?: string; message?: string };
      const code =
        firebaseError.message === "INVALID_INVITATION_CODE"
          ? "INVALID_INVITATION_CODE"
          : firebaseError.code ?? "";
      setError(getErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" component="h2" align="center" sx={{ mb: 3 }}>
          Inscription
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Prénom"
            fullWidth
            margin="normal"
            autoFocus
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
            {...register("firstName", {
              required: "Le prénom est requis.",
            })}
          />

          <TextField
            label="Nom"
            fullWidth
            margin="normal"
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
            {...register("lastName", {
              required: "Le nom est requis.",
            })}
          />

          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            autoComplete="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register("email", {
              required: "L'email est requis.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Email invalide.",
              },
            })}
          />

          <TextField
            label="Mot de passe"
            type="password"
            fullWidth
            margin="normal"
            autoComplete="new-password"
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register("password", {
              required: "Le mot de passe est requis.",
              minLength: {
                value: 6,
                message: "Le mot de passe doit contenir au moins 6 caractères.",
              },
            })}
          />

          <TextField
            label="Confirmer le mot de passe"
            type="password"
            fullWidth
            margin="normal"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            {...register("confirmPassword", {
              required: "Veuillez confirmer le mot de passe.",
              validate: (value) =>
                value === password ||
                "Les mots de passe ne correspondent pas.",
            })}
          />

          <TextField
            label="Code d'invitation"
            fullWidth
            margin="normal"
            error={!!errors.invitationCode}
            helperText={errors.invitationCode?.message}
            slotProps={{ htmlInput: { style: { textTransform: "uppercase" } } }}
            {...register("invitationCode", {
              required: "Le code d'invitation est requis.",
            })}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={submitting}
            sx={{ mt: 3, mb: 2 }}
          >
            {submitting ? "Inscription..." : "S'inscrire"}
          </Button>

          <Typography align="center" variant="body2">
            Déjà un compte ?{" "}
            <Link component={RouterLink} to="/connexion">
              Se connecter
            </Link>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
