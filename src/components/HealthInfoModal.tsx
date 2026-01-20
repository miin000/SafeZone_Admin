'use client';

import { useState, useEffect } from 'react';
import type { HealthInfo, HealthInfoFormData, HealthInfoCategory } from '@/types';
import { HEALTH_INFO_CATEGORY_CONFIG } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL!;

interface HealthInfoModalProps {
  item: HealthInfo | null;
  onClose: () => void;
  onSave: () => void;
}

export default function HealthInfoModal({
  item,
  onClose,
  onSave,
}: HealthInfoModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<HealthInfoFormData>({
    title: '',
    content: '',
    summary: '',
    category: 'disease_prevention',
    thumbnailUrl: '',
    imageUrls: [],
    tags: [],
    isFeatured: false,
    sourceUrl: '',
    sourceName: '',
  });

  const [tagInput, setTagInput] = useState('');

  // Load existing data if editing
  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        content: item.content,
        summary: item.summary || '',
        category: item.category,
        thumbnailUrl: item.thumbnailUrl || '',
        imageUrls: item.imageUrls || [],
        tags: item.tags || [],
        isFeatured: item.isFeatured,
        sourceUrl: item.sourceUrl || '',
        sourceName: item.sourceName || '',
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = item
        ? `${API}/health-info/${item.id}`
        : `${API}/health-info`;
      const method = item ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Có lỗi xảy ra');
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">
            {item ? '✏️ Sửa thông tin y tế' : '➕ Thêm thông tin y tế mới'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm text-slate-600 font-medium mb-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              minLength={5}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              placeholder="Nhập tiêu đề bài viết..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-slate-600 font-medium mb-1">
              Danh mục <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as HealthInfoCategory,
                })
              }
              required
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              {Object.entries(HEALTH_INFO_CATEGORY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.icon} {cfg.labelVi}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm text-slate-600 font-medium mb-1">
              Tóm tắt
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              placeholder="Tóm tắt ngắn gọn nội dung..."
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm text-slate-600 font-medium mb-1">
              Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              required
              minLength={20}
              rows={10}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              placeholder="Nhập nội dung chi tiết..."
            />
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-sm text-slate-600 font-medium mb-1">
              URL Ảnh đại diện
            </label>
            <input
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) =>
                setFormData({ ...formData, thumbnailUrl: e.target.value })
              }
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-slate-600 font-medium mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="Nhập tag và Enter..."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-red-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 font-medium mb-1">
                Tên nguồn
              </label>
              <input
                type="text"
                value={formData.sourceName}
                onChange={(e) =>
                  setFormData({ ...formData, sourceName: e.target.value })
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="VD: Bộ Y tế"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 font-medium mb-1">
                URL nguồn
              </label>
              <input
                type="url"
                value={formData.sourceUrl}
                onChange={(e) =>
                  setFormData({ ...formData, sourceUrl: e.target.value })
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Featured */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isFeatured"
              checked={formData.isFeatured}
              onChange={(e) =>
                setFormData({ ...formData, isFeatured: e.target.checked })
              }
              className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="isFeatured" className="text-sm text-slate-700">
              ⭐ Đánh dấu là bài viết nổi bật
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Đang lưu...' : item ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
