import React, { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "@/lib/axios";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SortableCategory = ({
  cat,
  platforms,
  onMove,
  onEdit,
  onToggleActive,
  onDelete,
  selected,
  onToggleSelect,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat._id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const moveTargets = platforms.filter((p) => p.slug !== cat.platform_slug);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        padding: "10px 16px",
        background: isDragging ? "var(--bg-hover)" : "var(--bg-card)",
        borderRadius: 8,
        marginBottom: 4,
        border: "1px solid var(--border)",
        gap: 12,
        cursor: "default",
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          color: "var(--text-muted)",
          fontSize: 16,
          padding: "0 4px",
          userSelect: "none",
        }}
      >
        ⠿
      </span>

      <span
        style={{
          background: "rgba(0,210,255,0.1)",
          border: "1px solid rgba(0,210,255,0.2)",
          color: "#00d2ff",
          borderRadius: 6,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700,
          minWidth: 28,
          textAlign: "center",
        }}
      >
        {cat.sort_order}
      </span>

      <span
        style={{
          flex: 1,
          fontSize: 14,
          color: "var(--text-primary)",
          fontWeight: 500,
        }}
      >
        {cat.name}
      </span>

      <span
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          marginRight: 8,
        }}
      >
        {cat.services_count || 0} services
      </span>

      <span
        style={{
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 50,
          background: cat.is_active ? "var(--success-bg)" : "var(--error-bg)",
          color: cat.is_active ? "var(--success)" : "var(--error)",
          border: `1px solid ${
            cat.is_active
              ? "color-mix(in srgb, var(--success) 40%, transparent)"
              : "color-mix(in srgb, var(--error) 40%, transparent)"
          }`,
          marginRight: 8,
        }}
      >
        {cat.is_active ? "Active" : "Inactive"}
      </span>

      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        className="mr-2"
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text-primary)",
            borderRadius: 6,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onToggleActive}
          style={{
            background: cat.is_active
              ? "rgba(148,163,184,0.15)"
              : "rgba(34,197,94,0.15)",
            border: "1px solid rgba(148,163,184,0.4)",
            color: "var(--text-primary)",
            borderRadius: 6,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {cat.is_active ? "Disable" : "Enable"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.4)",
            color: "#fecaca",
            borderRadius: 6,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Delete
        </button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Move to different platform"
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Move →
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="min-w-[200px] z-[10050] border border-white/10 bg-[#0f1729] text-gray-100 shadow-xl"
          >
            {moveTargets.length === 0 ? (
              <DropdownMenuItem disabled className="text-gray-500">
                No other platforms
              </DropdownMenuItem>
            ) : (
              moveTargets.map((p) => (
                <DropdownMenuItem
                  key={p._id}
                  className="cursor-pointer gap-2 focus:bg-white/10 focus:text-white"
                  onClick={() => onMove(cat._id, p.slug)}
                >
                  <span className="text-base" aria-hidden>
                    {p.icon}
                  </span>
                  <span>{p.name}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const PlatformGroup = ({
  platform,
  platforms,
  onMoveCategory,
  onEditCategory,
  onToggleCategoryActive,
  onDeleteCategory,
  onMovePlatformUp,
  onMovePlatformDown,
  isFirst,
  isLast,
  sensors,
  onDragEnd,
  selectedIds,
  onToggleSelect,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const cats = platform.categories || [];
  const ids = cats.map((c) => c._id.toString());

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e) => onDragEnd(e, platform._id)}
    >
      <div
        style={{
          marginBottom: 16,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderLeft: `4px solid ${platform.color || "#00d2ff"}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 20px",
          background: "var(--bg-card)",
            borderBottom: collapsed
              ? "none"
            : "1px solid var(--border)",
            gap: 12,
          }}
        >
          <span
            style={{
              background: (platform.color || "#00d2ff") + "22",
              border: `1px solid ${(platform.color || "#00d2ff")}44`,
              color: platform.color || "#00d2ff",
              borderRadius: 6,
              padding: "2px 10px",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            #{platform.priority}
          </span>

          <span style={{ fontSize: 22 }}>{platform.icon || "📱"}</span>

          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary)",
              flex: 1,
            }}
          >
            {platform.name}
          </span>

          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {platform.categories_count} categories
          </span>

          <button
            type="button"
            onClick={() => onMovePlatformUp(platform._id)}
            disabled={isFirst}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-muted)",
              borderRadius: 6,
              width: 28,
              height: 28,
              cursor: isFirst ? "not-allowed" : "pointer",
              fontSize: 12,
            }}
          >
            ▲
          </button>

          <button
            type="button"
            onClick={() => onMovePlatformDown(platform._id)}
            disabled={isLast}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-muted)",
              borderRadius: 6,
              width: 28,
              height: 28,
              cursor: isLast ? "not-allowed" : "pointer",
              fontSize: 12,
            }}
          >
            ▼
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-muted)",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {collapsed ? `Show ${cats.length}` : "Collapse"}
          </button>
        </div>

        {!collapsed && (
          <div style={{ padding: "12px 16px" }}>
            {cats.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                No categories in this platform
              </div>
            ) : (
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {cats.map((cat) => (
                  <SortableCategory
                    key={cat._id}
                    cat={cat}
                    platforms={platforms}
                    onMove={onMoveCategory}
                    onEdit={() => onEditCategory(cat)}
                    onToggleActive={() => onToggleCategoryActive(cat)}
                    onDelete={() => onDeleteCategory(cat)}
                    selected={selectedIds.has(String(cat._id))}
                    onToggleSelect={() => onToggleSelect(String(cat._id))}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        )}
      </div>
    </DndContext>
  );
};

const CategoryManagement = () => {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPlatformSlug, setFormPlatformSlug] = useState("youtube");
  const [categoryFormError, setCategoryFormError] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/category-management");
      setPlatforms(res.data.platforms || []);
      setSelectedIds(new Set());
      return res.data.platforms || [];
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDragEnd = (event, platformId) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPlatforms((prev) =>
      prev.map((p) => {
        if (p._id.toString() !== platformId.toString()) return p;

        const cats = p.categories || [];
        const oldIdx = cats.findIndex((c) => c._id.toString() === active.id);
        const newIdx = cats.findIndex((c) => c._id.toString() === over.id);
        if (oldIdx === -1 || newIdx === -1) return p;

        const newCats = arrayMove(cats, oldIdx, newIdx).map((c, i) => ({
          ...c,
          sort_order: i + 1,
        }));

        return { ...p, categories: newCats };
      })
    );
    setHasChanges(true);
  };

  const movePlatformUp = (platformId) => {
    setPlatforms((prev) => {
      const idx = prev.findIndex((p) => p._id.toString() === platformId.toString());
      if (idx <= 0) return prev;
      const newArr = [...prev];
      [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
      return newArr.map((p, i) => ({ ...p, priority: i + 1 }));
    });
    setHasChanges(true);
  };

  const movePlatformDown = (platformId) => {
    setPlatforms((prev) => {
      const idx = prev.findIndex((p) => p._id.toString() === platformId.toString());
      if (idx === -1 || idx === prev.length - 1) return prev;
      const newArr = [...prev];
      [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      return newArr.map((p, i) => ({ ...p, priority: i + 1 }));
    });
    setHasChanges(true);
  };

  const moveCategory = async (categoryId, newPlatformSlug) => {
    try {
      await api.put("/admin/category-management/move", {
        category_id: String(categoryId),
        new_platform_slug: newPlatformSlug,
      });
      await fetchData();
    } catch (err) {
      alert("Move failed: " + (err?.response?.data?.error || err.message));
    }
  };

  const saveOrder = async () => {
    try {
      setSaving(true);
      const payload = platforms.map((p, pIdx) => ({
        platform_id: String(p._id),
        priority: pIdx + 1,
        categories: (p.categories || []).map((c, cIdx) => ({
          category_id: String(c._id),
          sort_order: cIdx + 1,
        })),
      }));
      await api.put("/admin/category-management/reorder", { platforms: payload });
      setHasChanges(false);
      await fetchData();
      alert("✅ Order saved successfully!");
    } catch (err) {
      alert("Save failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const runMigration = async () => {
    if (
      !window.confirm(
        "This will auto-assign all categories to their platforms based on name. Run migration?"
      )
    )
      return;
    setMigrating(true);
    try {
      await api.post("/admin/category-management/migrate");
      await fetchData();
      alert("✅ Migration complete! Categories grouped by platform.");
    } catch (err) {
      alert("Migration failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setMigrating(false);
    }
  };

  const totalCategories = platforms.reduce(
    (sum, p) => sum + (p.categories_count || 0),
    0
  );
  const activeCategories = platforms.reduce(
    (sum, p) =>
      sum + (p.categories || []).filter((c) => c.is_active !== false).length,
    0
  );

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (active) => {
    if (!selectedIds.size) return;
    if (
      !window.confirm(
        `Are you sure you want to ${active ? "enable" : "disable"} ${
          selectedIds.size
        } categories?`
      )
    )
      return;
    try {
      await Promise.all(
        platforms
          .flatMap((p) => p.categories || [])
          .filter((c) => selectedIds.has(String(c._id)))
          .map((c) =>
            api.put(`/admin/category-management/categories/${c._id}`, {
              is_active: active,
            })
          )
      );
      await fetchData();
    } catch (err) {
      alert(
        "Bulk status update failed: " +
          (err?.response?.data?.error || err.message)
      );
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (
      !window.confirm(
        `This will delete ${selectedIds.size} categories (services remain). Continue?`
      )
    )
      return;
    try {
      await Promise.all(
        platforms
          .flatMap((p) => p.categories || [])
          .filter((c) => selectedIds.has(String(c._id)))
          .map((c) => api.delete(`/admin/category-management/categories/${c._id}`))
      );
      await fetchData();
    } catch (err) {
      alert(
        "Bulk delete failed: " + (err?.response?.data?.error || err.message)
      );
    }
  };

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
    setCategoryFormError(null);
    setSavingCategory(false);
    const firstPlatform = platforms[0];
    // Backend `platforms` collection uses `slug`, not `platform_slug`
    setFormPlatformSlug(
      firstPlatform?.slug || firstPlatform?.platform_slug || "youtube"
    );
    setFormName("");
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryModalOpen(true);
    setCategoryFormError(null);
    setSavingCategory(false);
    setFormName(cat.name || "");
    setFormPlatformSlug(cat.platform_slug || "youtube");
  };

  const submitCategoryForm = async (e) => {
    e.preventDefault();
    setCategoryFormError(null);
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setCategoryFormError("Category name is required");
      alert("Category name is required");
      return;
    }
    const platform = platforms.find(
      (p) => (p.slug ?? p.platform_slug) === formPlatformSlug
    );
    if (!platform) {
      setCategoryFormError("Select a valid platform");
      alert("Select a valid platform");
      return;
    }
    try {
      setSavingCategory(true);
      let createOrUpdateRes = null;
      if (editingCategory) {
        createOrUpdateRes = await api.put(
          `/admin/category-management/categories/${editingCategory._id}`,
          {
          name: trimmedName,
          platform_id: String(platform._id),
          }
        );
        if (!createOrUpdateRes?.data?.success && createOrUpdateRes?.data?.error)
          throw new Error(createOrUpdateRes.data.error);
      } else {
        createOrUpdateRes = await api.post("/admin/category-management/categories", {
          name: trimmedName,
          platform_id: String(platform._id),
        });
        if (!createOrUpdateRes?.data?.success && createOrUpdateRes?.data?.error)
          throw new Error(createOrUpdateRes.data.error);
      }
      setEditingCategory(null);
      const updatedPlatforms = await fetchData();
      const normalizedName = trimmedName.toLowerCase();

      const existsAnywhere = (updatedPlatforms || []).some((p) =>
        (p.categories || []).some((c) => String(c?.name || "").toLowerCase().trim() === normalizedName)
      );

      const selectedPlatformSlug = platform?.slug ?? platform?.platform_slug ?? formPlatformSlug;
      const existsOnSelectedPlatform = (updatedPlatforms || []).some((p) => {
        const pSlug = p?.slug ?? p?.platform_slug ?? "";
        if (pSlug !== selectedPlatformSlug) return false;
        return (p.categories || []).some((c) => String(c?.name || "").toLowerCase().trim() === normalizedName);
      });

      if (!existsAnywhere) {
        alert("Category saved, but it was NOT returned by category-management. Check Network response for `/admin/category-management/categories` and `/admin/category-management`.");
      } else if (!existsOnSelectedPlatform) {
        alert("Category saved, but it appeared under a different platform after refresh.");
      } else {
        alert("Category saved successfully!");
      }

      setCategoryModalOpen(false);
      setFormName("");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Save failed";
      setCategoryFormError(msg);
      alert(msg);
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleCategoryActive = async (cat) => {
    try {
      await api.put(`/admin/category-management/categories/${cat._id}`, {
        is_active: !cat.is_active,
      });
      await fetchData();
    } catch (err) {
      alert("Toggle failed: " + (err?.response?.data?.error || err.message));
    }
  };

  const deleteCategory = async (cat) => {
    if (
      !window.confirm(
        `Delete category "${cat.name}"? Services will remain, but ungrouped.`
      )
    )
      return;
    try {
      await api.delete(`/admin/category-management/categories/${cat._id}`);
      await fetchData();
    } catch (err) {
      alert("Delete failed: " + (err?.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Category Management">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 400,
            color: "var(--accent)",
            fontSize: 16,
          }}
        >
          Loading categories...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Category Management">
      <div
        style={{
          padding: 24,
          background: "var(--bg-primary)",
          minHeight: "100vh",
          color: "var(--text-primary)",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "var(--text-primary)",
              marginBottom: 6,
            }}
          >
            📂 Category Management
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Drag categories to reorder within platforms. Use ▲▼ to reorder
            platform groups.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Platforms", value: platforms.length, icon: "📱" },
            { label: "Total Categories", value: totalCategories, icon: "📂" },
            { label: "Active", value: activeCategories, icon: "✅" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--accent)",
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Button
            type="button"
            onClick={openNewCategory}
            className="bg-cyber-purple hover:bg-cyber-purple/90 text-white font-semibold px-4 py-2 rounded-lg"
          >
            + Add Category
          </Button>

          <button
            type="button"
            onClick={runMigration}
            disabled={migrating}
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#f59e0b",
              padding: "10px 20px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {migrating ? "Running..." : "🔄 Auto-Group by Platform"}
          </button>

          <button
            type="button"
            onClick={saveOrder}
            disabled={!hasChanges || saving}
            style={{
              background: hasChanges
                ? "linear-gradient(135deg,#00d2ff,#0070f3)"
                : "rgba(255,255,255,0.05)",
              border: "none",
              color: hasChanges ? "#fff" : "var(--text-muted)",
              padding: "10px 24px",
              borderRadius: 8,
              cursor: hasChanges ? "pointer" : "not-allowed",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: hasChanges
                ? "0 4px 15px rgba(0,210,255,0.3)"
                : "none",
            }}
          >
            {saving ? "Saving..." : hasChanges ? "💾 Save Order" : "✓ Saved"}
          </button>

          {error && (
            <span style={{ color: "var(--error)", fontSize: 13 }}>⚠️ {error}</span>
          )}

          {selectedIds.size > 0 && (
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              <span>{selectedIds.size} selected</span>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-emerald-300"
                onClick={() => handleBulkStatus(true)}
              >
                Enable
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-amber-300"
                onClick={() => handleBulkStatus(false)}
              >
                Disable
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-400 text-red-300"
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
            </div>
          )}
        </div>

        {platforms.map((platform, idx) => (
          <PlatformGroup
            key={platform._id}
            platform={platform}
            platforms={platforms}
            onMoveCategory={moveCategory}
            onEditCategory={openEditCategory}
            onToggleCategoryActive={toggleCategoryActive}
            onDeleteCategory={deleteCategory}
            onMovePlatformUp={movePlatformUp}
            onMovePlatformDown={movePlatformDown}
            isFirst={idx === 0}
            isLast={idx === platforms.length - 1}
            sensors={sensors}
            onDragEnd={handleDragEnd}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        ))}

        {categoryModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                background: "#020617",
                borderRadius: 12,
                padding: 20,
                width: 420,
                border: "1px solid rgba(148,163,184,0.4)",
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                {editingCategory ? "Edit Category" : "Add Category"}
              </h2>
              <form onSubmit={submitCategoryForm} className="space-y-3">
                <label className="block text-sm text-slate-300 mb-1">
                  Name
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700"
                  />
                </label>
                <label className="block text-sm text-slate-300 mb-1">
                  Platform
                  <Select
                    value={formPlatformSlug}
                    onValueChange={(v) => setFormPlatformSlug(v)}
                  >
                    <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {platforms
                        .filter((p) => p.slug || p.platform_slug)
                        .map((p) => {
                          const slug = p.slug || p.platform_slug;
                          return (
                            <SelectItem key={p._id} value={slug}>
                              {p.name || slug}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </label>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryModalOpen(false);
                      setFormName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-cyber-purple text-white"
                    disabled={savingCategory}
                  >
                    {savingCategory ? "Saving..." : "Save"}
                  </Button>
                </div>
                {categoryFormError && (
                  <div style={{ marginTop: 10, color: "var(--error)", fontSize: 13 }}>
                    {categoryFormError}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CategoryManagement;

