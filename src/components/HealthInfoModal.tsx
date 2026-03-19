'use client';

import { useState, useEffect } from 'react';
import type {
  HealthInfo,
  HealthInfoFormData,
  HealthInfoCategory,
  HealthInfoDiseaseType,
  HealthInfoTarget,
  HealthInfoSeverity,
} from '@/types';
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
    diseaseType: 'general',
    target: 'general',
    severityLevel: 'low',
    sourceUrl: '',
    sourceName: '',
  });

  // Load existing data if editing
  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        content: item.content,
        summary: item.summary || '',
        category: item.category,
        diseaseType: item.diseaseType || 'general',
        target: item.target || 'general',
        severityLevel: item.severityLevel || 'low',
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

      const payload = {
        ...formData,
        summary: formData.summary?.trim() || undefined,
        sourceUrl: formData.sourceUrl?.trim() || undefined,
        sourceName: formData.sourceName?.trim() || undefined,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(payload),
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 font-medium mb-1">
                Loại bệnh
              </label>
              <select
                value={formData.diseaseType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    diseaseType: e.target.value as HealthInfoDiseaseType,
                  })
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="general">general</option>
                <option value="dengue">dengue</option>
                <option value="covid">covid</option>
                <option value="flu">flu</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600 font-medium mb-1">
                Đối tượng
              </label>
              <select
                value={formData.target}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target: e.target.value as HealthInfoTarget,
                  })
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="general">general</option>
                <option value="children">children</option>
                <option value="elderly">elderly</option>
                <option value="pregnant">pregnant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600 font-medium mb-1">
                Mức độ
              </label>
              <select
                value={formData.severityLevel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    severityLevel: e.target.value as HealthInfoSeverity,
                  })
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="emergency">emergency</option>
              </select>
            </div>
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
