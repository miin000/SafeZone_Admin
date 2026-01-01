'use client';

import { useState } from 'react';
import type { Case } from '@/types';
import { STATUS_COLORS, SEVERITY_LEVELS } from '@/types';

interface CaseDetailPanelProps {
  caseData: Case | null;
  onClose: () => void;
  onEdit: (caseData: Case) => void;
}

export default function CaseDetailPanel({ caseData, onClose, onEdit }: CaseDetailPanelProps) {
  if (!caseData) return null;

  const severityInfo = SEVERITY_LEVELS.find(s => s.value === caseData.severity) || SEVERITY_LEVELS[0];
  const statusColor = STATUS_COLORS[caseData.status] || STATUS_COLORS.unknown;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Chi tiết ca bệnh</h3>
        <button onClick={onClose} style={closeButtonStyle}>×</button>
      </div>

      <div style={contentStyle}>
        <div style={sectionStyle}>
          <div style={rowStyle}>
            <span style={labelStyle}>ID</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>#{caseData.id}</span>
          </div>
          {caseData.external_id && (
            <div style={rowStyle}>
              <span style={labelStyle}>Mã ngoài</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{caseData.external_id}</span>
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Thông tin bệnh</div>
          <div style={rowStyle}>
            <span style={labelStyle}>Loại bệnh</span>
            <span style={{ fontWeight: 700, fontSize: 11 }}>{caseData.disease_type}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Trạng thái</span>
            <span style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusColor,
              }} />
              <span style={{ textTransform: 'capitalize' }}>{caseData.status}</span>
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Mức độ</span>
            <span style={{ 
              color: severityInfo.color,
              fontWeight: 700,
              fontSize: 11,
            }}>
              {severityInfo.label}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Ngày báo cáo</span>
            <span style={{ fontSize: 11 }}>{new Date(caseData.reported_time).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Vị trí</div>
          <div style={rowStyle}>
            <span style={labelStyle}>Vùng</span>
            <span style={{ fontSize: 11 }}>{caseData.region_name || `ID: ${caseData.region_id || '-'}`}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Tọa độ</span>
            <span style={{ fontFamily: 'monospace', fontSize: 10 }}>
              {caseData.lat.toFixed(4)}, {caseData.lon.toFixed(4)}
            </span>
          </div>
        </div>

        {(caseData.patient_name || caseData.patient_age || caseData.patient_gender) && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Bệnh nhân</div>
            {caseData.patient_name && (
              <div style={rowStyle}>
                <span style={labelStyle}>Tên</span>
                <span style={{ fontSize: 11 }}>{caseData.patient_name}</span>
              </div>
            )}
            {caseData.patient_age && (
              <div style={rowStyle}>
                <span style={labelStyle}>Tuổi</span>
                <span style={{ fontSize: 11 }}>{caseData.patient_age}</span>
              </div>
            )}
            {caseData.patient_gender && (
              <div style={rowStyle}>
                <span style={labelStyle}>Giới tính</span>
                <span style={{ fontSize: 11 }}>{caseData.patient_gender}</span>
              </div>
            )}
          </div>
        )}

        {caseData.notes && (
          <div style={{ ...sectionStyle, borderBottom: 'none' }}>
            <div style={sectionTitleStyle}>Ghi chú</div>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 11, lineHeight: 1.4 }}>
              {caseData.notes}
            </p>
          </div>
        )}
      </div>

      <div style={footerStyle}>
        <button onClick={() => onEdit(caseData)} style={editButtonStyle}>
          ✏️ Chỉnh sửa
        </button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  right: 10,
  top: 70,
  width: 280,
  maxHeight: 'calc(100% - 90px)',
  background: 'rgba(10, 10, 10, 0.95)',
  borderRadius: 10,
  border: '1px solid #2a2a2a',
  zIndex: 1001,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 14px',
  borderBottom: '1px solid #2a2a2a',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  fontSize: 20,
  cursor: 'pointer',
  opacity: 0.7,
  lineHeight: 1,
};

const contentStyle: React.CSSProperties = {
  padding: 14,
  overflow: 'auto',
  flex: 1,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 14,
  paddingBottom: 14,
  borderBottom: '1px solid #1a1a1a',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  opacity: 0.6,
  marginBottom: 10,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
  fontSize: 12,
};

const labelStyle: React.CSSProperties = {
  opacity: 0.7,
};

const footerStyle: React.CSSProperties = {
  padding: 10,
  borderTop: '1px solid #2a2a2a',
};

const editButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid #1f77b4',
  background: 'transparent',
  color: '#1f77b4',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
