'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('./LocationPicker'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL!;

// Risk levels
const RISK_LEVELS = [
  { value: 'low', label: 'Thấp / Low', color: '#4caf50' },
  { value: 'medium', label: 'Trung bình / Medium', color: '#ff9800' },
  { value: 'high', label: 'Cao / High', color: '#f44336' },
  { value: 'critical', label: 'Nguy hiểm / Critical', color: '#9c27b0' },
];

// Disease types
const DEFAULT_DISEASE_TYPES = ['Dengue'];

export interface ZoneFormData {
  name: string;
  diseaseType: string;
  lat: number;
  lon: number;
  radiusKm: number;
  riskLevel: string;
  caseCount: number;
  description: string;
  startDate: string;
}

interface ZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneId?: string | null;
  onSave?: () => void;
  initialLocation?: { lat: number; lon: number };
}

export default function ZoneModal({
  isOpen,
  onClose,
  zoneId,
  onSave,
  initialLocation,
}: ZoneModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [diseaseTypes, setDiseaseTypes] = useState<string[]>(
    DEFAULT_DISEASE_TYPES,
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [formData, setFormData] = useState<ZoneFormData>({
    name: '',
    diseaseType: 'Dengue',
    lat: initialLocation?.lat || 21.0285,
    lon: initialLocation?.lon || 105.8542,
    radiusKm: 1,
    riskLevel: 'medium',
    caseCount: 0,
    description: '',
    startDate: new Date().toISOString().split('T')[0],
  });

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
            diseaseType: prev.diseaseType || names[0],
          }));
        }
      })
      .catch(() => {
        setDiseaseTypes(DEFAULT_DISEASE_TYPES);
      });
  }, [isOpen]);

  // Load zone data if editing
  useEffect(() => {
    if (zoneId && isOpen) {
      setLoading(true);
      fetch(`${API}/zones/${zoneId}`)
        .then((r) => r.json())
        .then((zone) => {
          setFormData({
            name: zone.name || '',
            diseaseType: zone.diseaseType || 'Dengue',
            lat: zone.center?.coordinates?.[1] || zone.latitude || 21.0285,
            lon: zone.center?.coordinates?.[0] || zone.longitude || 105.8542,
            radiusKm: zone.radiusKm || 1,
            riskLevel: zone.riskLevel || 'medium',
            caseCount: zone.caseCount || 0,
            description: zone.description || '',
            startDate: zone.startDate
              ? new Date(zone.startDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
          });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (!zoneId && isOpen) {
      // Reset form for new zone
      setFormData({
        name: '',
        diseaseType: 'Dengue',
        lat: initialLocation?.lat || 21.0285,
        lon: initialLocation?.lon || 105.8542,
        radiusKm: 1,
        riskLevel: 'medium',
        caseCount: 0,
        description: '',
        startDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [zoneId, isOpen, initialLocation]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    // Handle numeric fields (both number and range inputs)
    const numericFields = ['lat', 'lon', 'radiusKm', 'caseCount'];
    const isNumeric = type === 'number' || type === 'range' || numericFields.includes(name);
    setFormData((prev) => ({
      ...prev,
      [name]: isNumeric ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = zoneId ? `${API}/zones/${zoneId}` : `${API}/zones`;
      const method = zoneId ? 'PATCH' : 'POST';
      const token = localStorage.getItem('token');

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('API Error:', res.status, errorData);
        throw new Error(errorData.message || `Failed to save zone (${res.status})`);
      }

      onSave?.();
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      alert('Có lỗi khi lưu vùng dịch / Error saving zone');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const riskConfig = RISK_LEVELS.find((r) => r.value === formData.riskLevel);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            🚨 {zoneId ? 'Chỉnh sửa vùng dịch' : 'Tạo vùng cảnh báo mới'}
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ padding: 20, maxHeight: '70vh', overflow: 'auto' }}>
              {/* Zone Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Tên vùng dịch / Zone Name <span style={{ color: '#f44336' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="VD: Ổ dịch Sốt xuất huyết Q.Hoàng Mai"
                  style={inputStyle}
                />
              </div>

              {/* Disease Type */}
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Loại bệnh / Disease Type <span style={{ color: '#f44336' }}>*</span>
                </label>
                <select
                  name="diseaseType"
                  value={formData.diseaseType}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                >
                  {diseaseTypes.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Risk Level */}
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Mức độ nguy hiểm / Risk Level <span style={{ color: '#f44336' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {RISK_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, riskLevel: level.value }))}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: `2px solid ${formData.riskLevel === level.value ? level.color : '#2a2a2a'}`,
                        background: formData.riskLevel === level.value ? `${level.color}20` : 'transparent',
                        color: formData.riskLevel === level.value ? level.color : '#9ca3af',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Section */}
              <div style={{ ...fieldStyle, background: '#0d1117', borderRadius: 12, padding: 16, border: '1px solid #21262d' }}>
                <label style={{ ...labelStyle, marginBottom: 12 }}>
                  📍 Vị trí vùng dịch / Zone Location <span style={{ color: '#f44336' }}>*</span>
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 10 }}>Vĩ độ / Latitude</label>
                    <input
                      type="number"
                      name="lat"
                      value={formData.lat}
                      onChange={handleChange}
                      step="0.000001"
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 10 }}>Kinh độ / Longitude</label>
                    <input
                      type="number"
                      name="lon"
                      value={formData.lon}
                      onChange={handleChange}
                      step="0.000001"
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ ...labelStyle, fontSize: 10 }}>Bán kính (km) / Radius</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="range"
                      name="radiusKm"
                      value={formData.radiusKm}
                      onChange={handleChange}
                      min="0.1"
                      max="20"
                      step="0.1"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      name="radiusKm"
                      value={formData.radiusKm}
                      onChange={handleChange}
                      min="0.1"
                      max="100"
                      step="0.1"
                      style={{ ...inputStyle, width: 80, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: 12, opacity: 0.7 }}>km</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #1f77b4',
                    background: '#1f77b420',
                    color: '#1f77b4',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  🗺️ Chọn / Vẽ trên bản đồ
                </button>
              </div>

              {/* Case Count */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Số ca trong vùng / Case Count</label>
                <input
                  type="number"
                  name="caseCount"
                  value={formData.caseCount}
                  onChange={handleChange}
                  min="0"
                  style={inputStyle}
                />
              </div>

              {/* Start Date with Time */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Ngày bắt đầu / Start Date</label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate.includes('T') ? formData.startDate.slice(0, 16) : `${formData.startDate}T00:00`}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Description */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Mô tả / Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Mô tả chi tiết về vùng dịch..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Preview */}
              <div style={{
                background: `${riskConfig?.color}10`,
                border: `1px solid ${riskConfig?.color}40`,
                borderRadius: 10,
                padding: 12,
                marginTop: 12,
              }}>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>Xem trước / Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `${riskConfig?.color}30`,
                    border: `2px solid ${riskConfig?.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    🚨
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{formData.name || 'Vùng dịch mới'}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {formData.diseaseType} • {formData.radiusKm}km • {formData.caseCount} ca
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={footerStyle}>
              <button type="button" onClick={onClose} style={cancelButtonStyle}>
                Hủy / Cancel
              </button>
              <button type="submit" disabled={saving} style={submitButtonStyle}>
                {saving ? 'Đang lưu...' : zoneId ? 'Cập nhật' : 'Tạo vùng dịch'}
              </button>
            </div>
          </form>
        )}

        {/* Location Picker Modal */}
        {showLocationPicker && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 10001,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px 20px',
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                🗺️ Chọn vị trí trên bản đồ / Select location on map
              </h3>
              <button
                onClick={() => setShowLocationPicker(false)}
                style={closeButtonStyle}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <LocationPicker
                lat={formData.lat}
                lon={formData.lon}
                onChange={(lat, lon) => {
                  setFormData((prev) => ({ ...prev, lat, lon }));
                }}
                onClose={() => setShowLocationPicker(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  width: '100%',
  maxWidth: 520,
  maxHeight: '90vh',
  overflow: 'hidden',
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#f8fafc',
};

const closeButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#64748b',
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
  background: '#f8fafc',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
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
