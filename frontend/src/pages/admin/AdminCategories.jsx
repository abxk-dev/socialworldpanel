import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, GripVertical } from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Toaster } from '../../components/ui/sonner';
import { toast } from 'sonner';
import api from '../../lib/axios';
import { API } from '../../config';
import { useAuth } from '../../App';
import BulkActionsBar from '../../components/admin/BulkActionsBar';
import { useBulkSelection } from '../../hooks/useBulkSelection';

const slugify = (name) =>
  (name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

const AdminCategories = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    order: 0,
  });
  const bulk = useBulkSelection();

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/categories', {
        headers,
        withCredentials: true,
      });
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.categories || [];
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm({
      name: '',
      description: '',
      order: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || '',
      description: category.description || '',
      order: category.order ?? 0,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || '',
        order: Number.isFinite(form.order)
          ? form.order
          : parseInt(form.order || 0, 10) || 0,
      };
      if (editingCategory) {
        await api.put(
          `/admin/categories/${editingCategory.category_id}`,
          payload,
          { headers, withCredentials: true }
        );
        toast.success('Category updated');
      } else {
        await api.post('/admin/categories', payload, {
          headers,
          withCredentials: true,
        });
        toast.success('Category created');
      }
      setModalOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          'Failed to save category'
      );
    }
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `Delete category "${category.name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await api.delete(`/admin/categories/${category.category_id}`, {
        headers,
        withCredentials: true,
      });
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(
          error.response?.data?.error ||
            'Cannot delete: services are linked to this category'
        );
      } else {
        toast.error('Failed to delete category');
      }
    }
  };

  const handleToggleStatus = async (category) => {
    try {
      const res = await api.patch(
        `/admin/categories/${category.category_id}/toggle-status`,
        {},
        { headers, withCredentials: true }
      );
      const nextStatus =
        res.data?.status ||
        (category.status === 'active' ? 'inactive' : 'active');
      toast.success(
        `Category ${nextStatus === 'active' ? 'activated' : 'deactivated'}`
      );
      fetchCategories();
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => `cat-${c.category_id}` === active.id);
    const newIndex = categories.findIndex((c) => `cat-${c.category_id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
    try {
      await Promise.all(
        reordered.map((cat, index) =>
          api.put(`/admin/categories/${cat.category_id}`, { order: index }, { headers, withCredentials: true })
        )
      );
      toast.success('Order saved');
    } catch (error) {
      toast.error('Failed to save order');
      fetchCategories();
    }
  };

  const sortableIds = categories.map((c) => `cat-${c.category_id}`);

  function SortableCategoryRow({ category, isActive, onEdit, onToggle, onDelete, bulk, children }) {
    const id = `cat-${category.category_id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <motion.tr
        ref={setNodeRef}
        style={style}
        className={`border-t border-white/5 hover:bg-white/5 ${isDragging ? 'opacity-50 bg-cyber-purple/10' : ''}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <td className="p-4">
          <span
            {...attributes}
            {...listeners}
            className="inline-flex cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-white/10"
            aria-label="Drag to reorder"
          >
            <GripVertical size={18} className="text-gray-500" />
          </span>
        </td>
        {children}
      </motion.tr>
    );
  }

  return (
    <AdminLayout title="Categories">
      <Toaster position="top-right" theme="dark" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-exo font-bold text-white">
              Service Categories
            </h2>
            <p className="text-gray-400 text-sm">
              Organize services into logical groups.
            </p>
          </div>
          <Button
            onClick={openCreateModal}
            className="bg-cyber-purple text-white"
          >
            <Plus size={18} className="mr-2" />
            Add Category
          </Button>
        </div>

        <Card className="glass overflow-hidden border-cyber-purple/20">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/5">
                <BulkActionsBar
                  type="categories"
                  selectedIds={bulk.selectedIds}
                  onClear={bulk.clear}
                  onApplied={fetchCategories}
                />
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-cyber-purple/10">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium w-8" scope="col" aria-label="Drag" />
                    <th className="text-left p-4 text-gray-400 font-medium w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={categories.length > 0 && categories.every((c) => bulk.isSelected(c.category_id))}
                        onChange={(e) => bulk.setMany(categories.map((c) => c.category_id), e.target.checked)}
                      />
                    </th>
                    <th className="text-left p-4 text-gray-400 font-medium w-20">
                      Order
                    </th>
                    <th className="text-left p-4 text-gray-400 font-medium">
                      Name
                    </th>
                    <th className="text-left p-4 text-gray-400 font-medium">
                      Slug
                    </th>
                    <th className="text-left p-4 text-gray-400 font-medium">
                      Status
                    </th>
                    <th className="text-right p-4 text-gray-400 font-medium">
                      Services Count
                    </th>
                    <th className="text-center p-4 text-gray-400 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <tbody>
                  {categories.map((cat) => {
                    const isActive =
                      cat.status === 'active' ||
                      (cat.is_active !== false && cat.status !== 'inactive');
                    return (
                      <SortableCategoryRow
                        key={cat.category_id}
                        category={cat}
                        isActive={isActive}
                        onEdit={() => openEditModal(cat)}
                        onToggle={() => handleToggleStatus(cat)}
                        onDelete={() => handleDelete(cat)}
                        bulk={bulk}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${cat.category_id}`}
                            checked={bulk.isSelected(cat.category_id)}
                            onChange={() => bulk.toggleOne(cat.category_id)}
                          />
                        </td>
                        <td className="p-4 text-gray-300 text-sm">
                          {cat.order ?? 0}
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">
                            {cat.name}
                          </div>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {cat.slug || slugify(cat.name)}
                        </td>
                        <td className="p-4">
                          <Badge
                            className={
                              isActive ? 'status-completed' : 'status-cancelled'
                            }
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right text-gray-300 text-sm">
                          {cat.services_count ?? 0}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(cat)}
                              className="text-gray-400 hover:text-white"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(cat)}
                              className="text-gray-400 hover:text-white"
                            >
                              {cat.status === 'inactive' ||
                              cat.is_active === false ? (
                                <ToggleLeft size={18} />
                              ) : (
                                <ToggleRight size={18} />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(cat)}
                              className="text-gray-400 hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </SortableCategoryRow>
                    );
                  })}
                  {categories.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-6 text-center text-gray-500 text-sm"
                      >
                        No categories found. Create your first category.
                      </td>
                    </tr>
                  )}
                </tbody>
                  </SortableContext>
                </DndContext>
              </table>
            </div>
            </>
          )}
        </Card>

        <Dialog
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setEditingCategory(null);
          }}
        >
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>
          <DialogContent className="glass border-cyber-purple/30 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-exo">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="mt-2 bg-deep-navy border-white/10"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label>Order</Label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value || '0', 10),
                    }))
                  }
                  className="mt-2 bg-deep-navy border-white/10"
                />
              </div>
              <Button
                onClick={handleSave}
                className="w-full bg-cyber-purple text-white"
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;

