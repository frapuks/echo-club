import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import Delete from "@mui/icons-material/Delete";
import DragIndicator from "@mui/icons-material/DragIndicator";
import Add from "@mui/icons-material/Add";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";
import GroupIcon from "@mui/icons-material/Group";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "../../contexts/AuthContext";
import { getClub, updateClubCategories } from "../../services/club.service";
import { getCategoryGroups } from "../../services/groups.service";
import type { GroupWithId } from "../../types/group";

export default function CategoriesSettings() {
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [groupsByCategory, setGroupsByCategory] = useState<Record<string, GroupWithId[]>>({});
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!userProfile?.clubId) return;
    const load = async () => {
      try {
        const club = await getClub(userProfile.clubId!);
        const cats = club?.categories ?? [];
        setCategories(cats);

        const groupsMap: Record<string, GroupWithId[]> = {};
        await Promise.all(
          cats.map(async (cat) => {
            groupsMap[cat] = await getCategoryGroups(userProfile.clubId!, cat);
          }),
        );
        setGroupsByCategory(groupsMap);
      } catch {
        setError("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userProfile?.clubId]);

  const save = async (updated: string[]) => {
    if (!userProfile?.clubId) return;
    try {
      await updateClubCategories(userProfile.clubId, updated);
      setCategories(updated);
    } catch {
      setError("Erreur lors de la sauvegarde.");
    }
  };

  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    const name = newCategory.trim();
    await save([...categories, name]);
    setGroupsByCategory((prev) => ({ ...prev, [name]: [] }));
    setNewCategory("");
  };

  const handleRemove = async (cat: string) => {
    await save(categories.filter((c) => c !== cat));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.indexOf(active.id as string);
    const newIndex = categories.indexOf(over.id as string);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
    await save(reordered);
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 500 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Catégories d'âge</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Gérez les catégories d'âge de votre club. Glissez-déposez pour réorganiser.
          </Typography>

          {categories.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Aucune catégorie.</Typography>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={categories} strategy={verticalListSortingStrategy}>
                <Box sx={{ mb: 2 }}>
                  {categories.map((cat) => (
                    <SortableCategory
                      key={cat}
                      id={cat}
                      groups={groupsByCategory[cat] ?? []}
                      onRemove={() => handleRemove(cat)}
                    />
                  ))}
                </Box>
              </SortableContext>
            </DndContext>
          )}

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              placeholder="Nouvelle catégorie"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              fullWidth
            />
            <Button variant="contained" startIcon={<Add />} onClick={handleAdd} disabled={!newCategory.trim()}>
              Ajouter
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function SortableCategory({
  id,
  groups,
  onRemove,
}: {
  id: string;
  groups: GroupWithId[];
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [open, setOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      <Box sx={{ display: "flex", alignItems: "center", py: 1 }}>
        <IconButton size="small" sx={{ cursor: "grab", mr: 1 }} {...attributes} {...listeners}>
          <DragIndicator fontSize="small" />
        </IconButton>
        <Typography sx={{ flexGrow: 1 }}>{id}</Typography>
        {groups.length > 0 && (
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        )}
        <IconButton size="small" color="error" onClick={onRemove}>
          <Delete fontSize="small" />
        </IconButton>
      </Box>
      {groups.length > 0 && (
        <Collapse in={open}>
          <Box sx={{ pl: 5, pb: 1 }}>
            {groups.map((g) => (
              <Box key={g.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <GroupIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">{g.name}</Typography>
              </Box>
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}
