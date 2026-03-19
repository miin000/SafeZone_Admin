'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Case, CaseFormData } from '@/types';
import { STATUS_OPTIONS, SEVERITY_LEVELS } from '@/types';
import { getCaseById, createCase, updateCase } from '@/hooks/useGisData';

const LocationPicker = dynamic(() => import('./LocationPicker'), { ssr: false });

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string | null;
  initialData?: Partial<Case> | null;
  onSave: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function CaseModal({ isOpen, onClose, caseId, initialData, onSave }: CaseModalProps) {
  const [diseaseTypes, setDiseaseTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationFetching, setLocationFetching] = useState(false);
  const [formData, setFormData] = useState<CaseFormData>({
    disease_type: '',
    status: 'suspected',
    severity: 1,
    reported_time: new Date().toISOString().slice(0, 16),
    lat: 21.0278,
    lon: 105.8342,
    patient_name: '',
    patient_age: undefined,
    patient_gender: '',
    notes: '',
  });

  // Normalize gender value to match select options
  const normalizeGender = (gender: string | undefined): string => {
    if (!gender) return '';
    const lower = gender.toLowerCase();
    if (lower === 'male' || lower === 'nam') return 'male';
    if (lower === 'female' || lower === 'nữ' || lower === 'nu') return 'female';
    if (lower === 'other' || lower === 'khác' || lower === 'khac') return 'other';
    return gender;
  };

  // Auto-detect region from lat/lon
  useEffect(() => {
    if (!isOpen || !formData.lat || !formData.lon) return;
    
    const timeoutId = setTimeout(() => {
      setLocationFetching(true);
      fetch(`${API}/gis/reverse-geocode?lat=${formData.lat}&lon=${formData.lon}`)
        .then(r => r.json())
        .then(data => {
          if (data.regionId) {
            setFormData(prev => ({ ...prev, region_id: data.regionId }));
          }
        })
        .catch(err => console.error('Failed to fetch region:', err))
        .finally(() => setLocationFetching(false));
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [formData.lat, formData.lon, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    fetch(`${API}/diseases`)
      .then((r) => r.json())
      .then((rows) => {
        const names = Array.isArray(rows)
          ? rows
              .map((item: { name?: string }) => item?.name?.trim())
              .filter((name): name is string => Boolean(name))
          : [];
        if (names.length > 0) {
          setDiseaseTypes(names);
          setFormData((prev) => ({
            ...prev,
            disease_type: prev.disease_type || names[0],
          }));
        }
      })
      .catch(() => setDiseaseTypes([]));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && caseId) {
      setLoading(true);
      getCaseById(caseId)
        .then((c) => {
          setFormData({
            disease_type: c.disease_type,
            status: c.status,
            severity: c.severity,
            reported_time: c.reported_time?.slice(0, 16) || '',
            lat: c.lat,
            lon: c.lon,
            region_id: c.region_id,
            patient_name: c.patient_name || '',
            patient_age: c.patient_age,
            patient_gender: normalizeGender(c.patient_gender),
            notes: c.notes || '',
          });
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (isOpen && initialData) {
      setFormData({
        disease_type: initialData.disease_type || diseaseTypes[0] || '',
        status: initialData.status || 'suspected',
        severity: initialData.severity || 1,
        reported_time: initialData.reported_time?.slice(0, 16) || new Date().toISOString().slice(0, 16),
        lat: initialData.lat || 21.0278,
        lon: initialData.lon || 105.8342,
        region_id: initialData.region_id,
        patient_name: initialData.patient_name || '',
        patient_age: initialData.patient_age,
        patient_gender: normalizeGender(initialData.patient_gender),
        notes: initialData.notes || '',
      });
    } else if (isOpen) {
      // Reset form for new case
      setFormData({
        disease_type: diseaseTypes[0] || '',
        status: 'suspected',
        severity: 1,
        reported_time: new Date().toISOString().slice(0, 16),
        lat: 21.0278,
        lon: 105.8342,
        patient_name: '',
        patient_age: undefined,
        patient_gender: '',
        notes: '',
      });
    }
    setError(null);
  }, [isOpen, caseId, initialData, diseaseTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (caseId) {
        await updateCase(caseId, formData);
      } else {
        await createCase(formData);
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {caseId ? 'Chỉnh sửa ca bệnh' : 'Thêm ca bệnh mới'}
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 16 }}>
            {error && (
              <div style={errorStyle}>{error}</div>
            )}

            <div style={gridStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Loại bệnh *</label>
                <select
                  value={formData.disease_type}
                  onChange={(e) => setFormData({ ...formData, disease_type: e.target.value })}
                  style={inputStyle}
                  required
                >
                  {diseaseTypes.length === 0 && (
                    <option value="" disabled>
                      Không có dữ liệu bệnh
                    </option>
                  )}
                  {diseaseTypes.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Trạng thái *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={inputStyle}
                  required
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Mức độ *</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: Number(e.target.value) })}
                  style={inputStyle}
                  required
                >
                  {SEVERITY_LEVELS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.emoji} {s.labelVi} / {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Thời gian báo cáo *</label>
                <input
                  type="datetime-local"
                  value={formData.reported_time}
                  onChange={(e) => setFormData({ ...formData, reported_time: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Vĩ độ *</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Kinh độ *</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.lon}
                  onChange={(e) => setFormData({ ...formData, lon: parseFloat(e.target.value) })}
                  style={inputStyle}
                  required
                />
              </div>

              {locationFetching && (
                <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                  🔍 Đang xác định khu vực...
                </div>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  style={mapPickerButtonStyle}
                >
                  📍 Chọn vị trí trên bản đồ
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#475569', fontWeight: 600 }}>Thông tin bệnh nhân (Tùy chọn)</h3>
              
              <div style={gridStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Tên bệnh nhân</label>
                  <input
                    type="text"
                    value={formData.patient_name || ''}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    style={inputStyle}
                    placeholder="Nhập tên bệnh nhân"
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Tuổi</label>
                  <input
                    type="number"
                    value={formData.patient_age || ''}
                    onChange={(e) => setFormData({ ...formData, patient_age: e.target.value ? parseInt(e.target.value) : undefined })}
                    style={inputStyle}
                    placeholder="Tuổi"
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Giới tính</label>
                  <select
                    value={formData.patient_gender || ''}
                    onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Chọn</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              <div style={{ ...fieldStyle, marginTop: 12 }}>
                <label style={labelStyle}>Ghi chú</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                  placeholder="Ghi chú thêm..."
                />
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={cancelButtonStyle}>
                Hủy
              </button>
              <button type="submit" style={submitButtonStyle} disabled={saving}>
                {saving ? 'Đang lưu...' : caseId ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </form>
        )}

        {showLocationPicker && (
          <LocationPicker
            lat={formData.lat}
            lon={formData.lon}
            onChange={(lat, lon) => setFormData({ ...formData, lat, lon })}
            onClose={() => setShowLocationPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
};

const modalStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  width: '100%',
  maxWidth: 520,
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  fontSize: 24,
  cursor: 'pointer',
  lineHeight: 1,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 12,
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  color: '#475569',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#1e293b',
  fontSize: 14,
};

const errorStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid #fecaca',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
  color: '#dc2626',
  fontSize: 13,
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#475569',
  fontSize: 14,
  cursor: 'pointer',
};

const submitButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(135deg, #10b981, #059669)',
  color: 'white',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const mapPickerButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 8,
  border: '1px dashed #cbd5e1',
  background: 'rgba(16, 185, 129, 0.05)',
  color: '#10b981',
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};
