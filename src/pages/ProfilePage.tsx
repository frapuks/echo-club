import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
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
import { useAuth } from "../contexts/AuthContext";
import { db } from "../config/firebase";

interface ProfileForm {
  firstName: string;
  lastName: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user, userProfile, refreshProfile } = useAuth();

  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      firstName: userProfile?.firstName ?? "",
      lastName: userProfile?.lastName ?? "",
    },
  });

  const passwordForm = useForm<PasswordForm>();
  const newPassword = passwordForm.watch("newPassword");

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!user) return;
    setProfileSuccess("");
    setProfileError("");
    setProfileSubmitting(true);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: `${data.firstName} ${data.lastName}`,
      });
      await refreshProfile();
      setProfileSuccess("Profil mis à jour.");
    } catch {
      setProfileError("Erreur lors de la mise à jour du profil.");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    if (!user || !user.email) return;
    setPasswordSuccess("");
    setPasswordError("");
    setPasswordSubmitting(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        data.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);
      setPasswordSuccess("Mot de passe modifié.");
      passwordForm.reset();
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/wrong-password" || firebaseError.code === "auth/invalid-credential") {
        setPasswordError("Mot de passe actuel incorrect.");
      } else if (firebaseError.code === "auth/weak-password") {
        setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      } else {
        setPasswordError("Erreur lors du changement de mot de passe.");
      }
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto" }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Mon profil
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Informations personnelles
          </Typography>

          {profileSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {profileSuccess}
            </Alert>
          )}
          {profileError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {profileError}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            noValidate
          >
            <TextField
              label="Prénom"
              fullWidth
              margin="normal"
              {...profileForm.register("firstName", {
                required: "Le prénom est requis.",
              })}
              error={!!profileForm.formState.errors.firstName}
              helperText={profileForm.formState.errors.firstName?.message}
            />

            <TextField
              label="Nom"
              fullWidth
              margin="normal"
              {...profileForm.register("lastName", {
                required: "Le nom est requis.",
              })}
              error={!!profileForm.formState.errors.lastName}
              helperText={profileForm.formState.errors.lastName?.message}
            />

            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={userProfile?.email ?? ""}
              disabled
              helperText="L'email ne peut pas être modifié."
            />

            <TextField
              label="Rôle"
              fullWidth
              margin="normal"
              value={
                userProfile?.role === "admin"
                  ? "Administrateur"
                  : userProfile?.role === "coach"
                    ? "Coach"
                    : "Joueur"
              }
              disabled
            />

            <Button
              type="submit"
              variant="contained"
              disabled={profileSubmitting}
              sx={{ mt: 2 }}
            >
              {profileSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Changer le mot de passe
          </Typography>

          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {passwordSuccess}
            </Alert>
          )}
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            noValidate
          >
            <TextField
              label="Mot de passe actuel"
              type="password"
              fullWidth
              margin="normal"
              autoComplete="current-password"
              {...passwordForm.register("currentPassword", {
                required: "Le mot de passe actuel est requis.",
              })}
              error={!!passwordForm.formState.errors.currentPassword}
              helperText={
                passwordForm.formState.errors.currentPassword?.message
              }
            />

            <Divider sx={{ my: 2 }} />

            <TextField
              label="Nouveau mot de passe"
              type="password"
              fullWidth
              margin="normal"
              autoComplete="new-password"
              {...passwordForm.register("newPassword", {
                required: "Le nouveau mot de passe est requis.",
                minLength: {
                  value: 6,
                  message: "Le mot de passe doit contenir au moins 6 caractères.",
                },
              })}
              error={!!passwordForm.formState.errors.newPassword}
              helperText={passwordForm.formState.errors.newPassword?.message}
            />

            <TextField
              label="Confirmer le nouveau mot de passe"
              type="password"
              fullWidth
              margin="normal"
              autoComplete="new-password"
              {...passwordForm.register("confirmPassword", {
                required: "Veuillez confirmer le mot de passe.",
                validate: (value) =>
                  value === newPassword ||
                  "Les mots de passe ne correspondent pas.",
              })}
              error={!!passwordForm.formState.errors.confirmPassword}
              helperText={
                passwordForm.formState.errors.confirmPassword?.message
              }
            />

            <Button
              type="submit"
              variant="contained"
              disabled={passwordSubmitting}
              sx={{ mt: 2 }}
            >
              {passwordSubmitting ? "Modification..." : "Modifier le mot de passe"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
