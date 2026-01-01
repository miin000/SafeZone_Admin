'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { EpidemicZone, PushNotificationPayload } from '@/types';
import { getDiseaseColor, getBilingualDiseaseLabel } from '@/types';
import ZoneModal from '@/components/ZoneModal';

const API = process.env.NEXT_PUBLIC_API_URL!;

const RISK_LEVEL_CONFIG = {
  low: { label: 'Thấp / Low', color: '#4caf50', icon: '🟢' },
  medium: { label: 'Trung bình / Medium', color: '#ff9800', icon: '🟡' },
  high: { label: 'Cao / High', color: '#ff5722', icon: '🟠' },
  critical: { label: 'Nghiêm trọng / Critical', color: '#f44336', icon: '🔴' },
};

export default function NotificationsPage() {
  const [zones, setZones] = useState<EpidemicZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<EpidemicZone | null>(null);
  const [showCreateZone, setShowCreateZone] = useState(false);
  const [showSendNotification, setShowSendNotification] = useState(false);

  // Load zones from API - fetch all including inactive
  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/zones?all=true`);
      if (res.ok) {
        const data = await res.json();
        setZones(data);
      }
    } catch (err) {
      console.error('Error loading zones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Stats - handle both active and isActive from API
  const stats = useMemo(() => ({
    total: zones.length,
    active: zones.filter(z => z.active ?? (z as any).isActive ?? true).length,
    critical: zones.filter(z => (z.risk_level || (z as any).riskLevel) === 'critical').length,
    high: zones.filter(z => (z.risk_level || (z as any).riskLevel) === 'high').length,
  }), [zones]);

  // Toggle zone active status
  const toggleZoneActive = async (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    // Handle both active and isActive from API
    const currentActive = zone.active ?? (zone as any).isActive ?? true;
    
    try {
      const res = await fetch(`${API}/zones/${zoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        loadZones();
      } else {
        alert('Lỗi khi cập nhật trạng thái vùng dịch');
      }
    } catch (err) {
      console.error('Error toggling zone:', err);
      alert('Lỗi kết nối');
    }
  };

  // Delete zone
  const deleteZone = async (zoneId: string) => {
    if (confirm('Bạn có chắc muốn xóa vùng dịch này?')) {
      try {
        const res = await fetch(`${API}/zones/${zoneId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          loadZones();
        } else {
          setZones(prev => prev.filter(z => z.id !== zoneId));
        }
      } catch (err) {
        console.error('Error deleting zone:', err);
        setZones(prev => prev.filter(z => z.id !== zoneId));
      }
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
            🔔 Quản lý thông báo / Notifications
          </h1>
          <div style={{ opacity: 0.6, marginTop: 6, fontSize: 14 }}>
            Quản lý vùng dịch và gửi thông báo đẩy đến người dùng mobile
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/admin" style={navLinkStyle}>📊 Quản lý ca</Link>
          <Link href="/admin/reports" style={navLinkStyle}>📋 Duyệt báo cáo</Link>
          <Link href="/" style={navLinkStyle}>🗺️ Bản đồ</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard title="Tổng vùng dịch" value={stats.total} icon="🗺️" color="#1f77b4" />
        <StatCard title="Đang hoạt động" value={stats.active} icon="✅" color="#4caf50" />
        <StatCard title="Nghiêm trọng" value={stats.critical} icon="🔴" color="#f44336" />
        <StatCard title="Nguy cơ cao" value={stats.high} icon="🟠" color="#ff5722" />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => setShowCreateZone(true)}
          style={{
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#4caf50',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ➕ Tạo vùng dịch mới
        </button>
        <button
          onClick={() => setShowSendNotification(true)}
          style={{
            padding: '12px 20px',
            borderRadius: 8,
            border: '1px solid #2196f3',
            background: '#2196f320',
            color: '#2196f3',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          📤 Gửi thông báo thủ công
        </button>
      </div>

      {/* Zone List */}
      <div style={cardStyle}>
        <div style={{ ...cardTitleStyle, marginBottom: 16 }}>
          📍 Danh sách vùng dịch / Epidemic Zones
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
            <div>Đang tải dữ liệu...</div>
          </div>
        ) : zones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <div>Chưa có vùng dịch nào được tạo</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {zones.map(zone => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                onToggleActive={() => toggleZoneActive(zone.id)}
                onEdit={() => setSelectedZone(zone)}
                onDelete={() => deleteZone(zone.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* How it works section */}
      <div style={{ ...cardStyle, marginTop: 24 }}>
        <div style={{ ...cardTitleStyle, marginBottom: 16 }}>
          💡 Cách hoạt động / How it works
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          <InfoCard
            icon="📍"
            title="1. Tạo vùng dịch"
            description="Admin tạo vùng dịch với tọa độ trung tâm và bán kính. Hệ thống tự động tính toán từ các ca bệnh đã xác thực."
          />
          <InfoCard
            icon="📱"
            title="2. Đồng bộ với Mobile"
            description="Mobile app tải danh sách vùng dịch và thiết lập geofencing cho từng vùng."
          />
          <InfoCard
            icon="🔔"
            title="3. Cảnh báo người dùng"
            description="Khi người dùng đi vào vùng dịch, app sẽ hiển thị thông báo cảnh báo ngay lập tức."
          />
          <InfoCard
            icon="📊"
            title="4. Theo dõi & Cập nhật"
            description="Admin theo dõi số người vào vùng dịch và cập nhật trạng thái vùng dịch theo thời gian thực."
          />
        </div>
      </div>

      {/* Create Zone Modal - Using shared ZoneModal component */}
      <ZoneModal
        isOpen={showCreateZone}
        onClose={() => setShowCreateZone(false)}
        onSave={() => {
          loadZones();
          setShowCreateZone(false);
        }}
      />

      {/* Send Notification Modal */}
      {showSendNotification && (
        <SendNotificationModal
          zones={zones}
          onClose={() => setShowSendNotification(false)}
          onSend={async (payload) => {
            try {
              const res = await fetch(`${API}/notifications/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (res.ok) {
                alert('Thông báo đã được gửi đến người dùng!');
              } else {
                alert('Gửi thông báo thất bại!');
              }
            } catch (err) {
              console.error('Error sending notification:', err);
              alert('Lỗi khi gửi thông báo!');
            }
            setShowSendNotification(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// SUB COMPONENTS
// ============================================

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div style={{
      background: '#111',
      borderRadius: 12,
      padding: 16,
      border: '1px solid #1a1a1a',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{title}</div>
    </div>
  );
}

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: '#1f77b420',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>{description}</div>
      </div>
    </div>
  );
}

function ZoneCard({ 
  zone, 
  onToggleActive, 
  onEdit, 
  onDelete 
}: { 
  zone: EpidemicZone; 
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Handle both snake_case and camelCase from API
  const riskLevel = zone.risk_level || (zone as any).riskLevel || 'medium';
  const riskConfig = RISK_LEVEL_CONFIG[riskLevel as keyof typeof RISK_LEVEL_CONFIG] 
    || RISK_LEVEL_CONFIG.medium;
  
  // Handle both active (snake_case interface) and isActive (API response)
  const isActive = zone.active ?? (zone as any).isActive ?? true;

  return (
    <div style={{
      background: isActive ? '#111' : '#0a0a0a',
      borderRadius: 10,
      border: `1px solid ${isActive ? riskConfig.color + '40' : '#1a1a1a'}`,
      padding: 16,
      opacity: isActive ? 1 : 0.6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Main Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{riskConfig.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{zone.name}</span>
            {!isActive && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: '#666',
                fontSize: 10,
                fontWeight: 600,
              }}>
                TẮT
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 16, fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
            <span>📍 Bán kính: {zone.radius || ((zone as any).radiusKm ? (zone as any).radiusKm * 1000 : 0)}m</span>
            <span>🏥 {zone.case_count ?? (zone as any).caseCount ?? 0} ca bệnh</span>
            <span style={{ color: riskConfig.color }}>{riskConfig.label}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Handle both array (disease_types) and single string (diseaseType) from API */}
            {(() => {
              const diseases = zone.disease_types || (zone as any).diseaseTypes || 
                ((zone as any).diseaseType ? [(zone as any).diseaseType] : []);
              return diseases.map((disease: string) => (
                <span key={disease} style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  background: getDiseaseColor(disease) + '20',
                  color: getDiseaseColor(disease),
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {getBilingualDiseaseLabel(disease)}
                </span>
              ));
            })()}
          </div>

          {zone.notification_message_vi && (
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7, fontStyle: 'italic' }}>
              💬 "{zone.notification_message_vi}"
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onToggleActive}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: isActive ? '#f4433620' : '#4caf5020',
              color: isActive ? '#f44336' : '#4caf50',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isActive ? '🔴 Tắt' : '🟢 Bật'}
          </button>
          <button
            onClick={onEdit}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #2a2a2a',
              background: 'transparent',
              color: 'inherit',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ✏️ Sửa
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #f4433650',
              background: 'transparent',
              color: '#f44336',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

function SendNotificationModal({ zones, onClose, onSend }: { 
  zones: EpidemicZone[]; 
  onClose: () => void; 
  onSend: (payload: PushNotificationPayload) => void;
}) {
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyVi, setBodyVi] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'zone'>('all');
  const [selectedZoneId, setSelectedZoneId] = useState('');

  const handleSubmit = () => {
    if (!titleVi || !bodyVi) {
      alert('Vui lòng điền tiêu đề và nội dung');
      return;
    }

    onSend({
      title: titleEn || titleVi,
      title_vi: titleVi,
      body: bodyEn || bodyVi,
      body_vi: bodyVi,
      data: {
        type: 'general',
        zone_id: targetType === 'zone' ? selectedZoneId : undefined,
      },
    });
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📤 Gửi thông báo</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <div style={{ padding: 20, maxHeight: '70vh', overflow: 'auto' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Đối tượng nhận</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setTargetType('all')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: `2px solid ${targetType === 'all' ? '#2196f3' : '#2a2a2a'}`,
                  background: targetType === 'all' ? '#2196f320' : 'transparent',
                  color: targetType === 'all' ? '#2196f3' : '#999',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🌍 Tất cả người dùng
              </button>
              <button
                onClick={() => setTargetType('zone')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: `2px solid ${targetType === 'zone' ? '#2196f3' : '#2a2a2a'}`,
                  background: targetType === 'zone' ? '#2196f320' : 'transparent',
                  color: targetType === 'zone' ? '#2196f3' : '#999',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📍 Theo vùng dịch
              </button>
            </div>
          </div>

          {targetType === 'zone' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Chọn vùng dịch</label>
              <select value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)} style={inputStyle}>
                <option value="">-- Chọn vùng --</option>
                {zones.filter(z => z.active).map(zone => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Tiêu đề (Tiếng Việt) *</label>
              <input type="text" value={titleVi} onChange={e => setTitleVi(e.target.value)} placeholder="VD: Cảnh báo dịch bệnh" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Title (English)</label>
              <input type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="E.g.: Epidemic Alert" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nội dung (Tiếng Việt) *</label>
              <textarea value={bodyVi} onChange={e => setBodyVi(e.target.value)} placeholder="Nhập nội dung thông báo..." style={{ ...inputStyle, minHeight: 100 }} />
            </div>
            <div>
              <label style={labelStyle}>Body (English)</label>
              <textarea value={bodyEn} onChange={e => setBodyEn(e.target.value)} placeholder="Enter notification body..." style={{ ...inputStyle, minHeight: 100 }} />
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>XEM TRƯỚC / PREVIEW</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{titleVi || 'Tiêu đề thông báo'}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{bodyVi || 'Nội dung thông báo...'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #2a2a2a', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: 8, border: '1px solid #2a2a2a', background: 'transparent', color: '#999', fontSize: 14, cursor: 'pointer' }}>
            Hủy
          </button>
          <button onClick={handleSubmit} style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: '#2196f3', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            📤 Gửi thông báo
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0a0a0a',
  padding: 24,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 24,
  flexWrap: 'wrap',
  gap: 16,
};

const navLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #2a2a2a',
  background: '#111',
  color: 'inherit',
  textDecoration: 'none',
  fontSize: 13,
};

const cardStyle: React.CSSProperties = {
  background: '#111',
  borderRadius: 12,
  padding: 20,
  border: '1px solid #1a1a1a',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  opacity: 0.9,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 8,
  opacity: 0.8,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #2a2a2a',
  background: '#0a0a0a',
  color: 'inherit',
  fontSize: 14,
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 24,
};

const modalContentStyle: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: 16,
  maxWidth: 600,
  width: '100%',
  maxHeight: '90vh',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};

const closeButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid #2a2a2a',
  background: 'transparent',
  color: 'inherit',
  fontSize: 16,
  cursor: 'pointer',
};
