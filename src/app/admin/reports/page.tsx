'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { 
  Report, 
  ReportListResponse, 
  ReportStatus, 
  VerificationStatus,
  ReportReviewPayload,
} from '@/types';
import { 
  REPORT_STATUS_CONFIG, 
  VERIFICATION_STATUS_CONFIG,
  getReportStatusConfig,
  getVerificationStatusConfig,
  getBilingualDiseaseLabel,
  getDiseaseColor,
} from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Load reports from API
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (verificationFilter !== 'ALL') params.set('verification', verificationFilter);
      if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API}/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.data || data || []);
      } else {
        console.error('Failed to fetch reports');
        setReports([]);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, verificationFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Stats
  const stats = useMemo(() => {
    return {
      pending: reports.filter(r => r.report_status === 'pending').length,
      in_review: reports.filter(r => r.report_status === 'in_review').length,
      approved: reports.filter(r => r.report_status === 'approved').length,
      rejected: reports.filter(r => r.report_status === 'rejected').length,
      needs_info: reports.filter(r => r.report_status === 'needs_info').length,
      total: reports.length,
    };
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (statusFilter !== 'ALL' && r.report_status !== statusFilter) return false;
      if (verificationFilter !== 'ALL' && r.verification_status !== verificationFilter) return false;
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !r.reporter_name.toLowerCase().includes(query) &&
          !r.description.toLowerCase().includes(query) &&
          !r.disease_type.toLowerCase().includes(query) &&
          !(r.region_name || '').toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reports, statusFilter, verificationFilter, priorityFilter, searchQuery]);

  // Handle review action
  const handleReview = async (report: Report, payload: ReportReviewPayload) => {
    try {
      const res = await fetch(`${API}/reports/${report.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        // Reload reports after successful review
        loadReports();
      } else {
        // Update locally as fallback
        setReports(prev => prev.map(r => 
          r.id === report.id 
            ? {
                ...r,
                report_status: payload.report_status,
                review_notes: payload.review_notes,
                verification_status: payload.verification_status || r.verification_status,
                verification_notes: payload.verification_notes,
                reviewed_by: 'Admin',
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : r
        ));
      }
    } catch (err) {
      console.error('Error reviewing report:', err);
    }
    setReviewModalOpen(false);
    setSelectedReport(null);
  };

  // Quick actions
  const handleQuickApprove = (report: Report) => {
    handleReview(report, { report_status: 'approved', verification_status: 'verified' });
  };

  const handleQuickReject = (report: Report) => {
    handleReview(report, { report_status: 'rejected' });
  };

  const handleStartReview = (report: Report) => {
    handleReview(report, { report_status: 'in_review' });
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
            📋 Quản lý báo cáo / Report Management
          </h1>
          <div style={{ opacity: 0.6, marginTop: 6, fontSize: 14 }}>
            Duyệt và xác thực báo cáo từ người dùng mobile
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/" style={navLinkStyle}>🗺️ Bản đồ</Link>
          <Link href="/admin" style={navLinkStyle}>📊 Quản lý ca</Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {Object.entries(REPORT_STATUS_CONFIG).map(([status, config]) => (
          <div
            key={status}
            onClick={() => setStatusFilter(status as ReportStatus)}
            style={{
              padding: 16,
              borderRadius: 12,
              background: statusFilter === status ? config.bgColor : '#111',
              border: `1px solid ${statusFilter === status ? config.color : '#1a1a1a'}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>{config.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: config.color }}>
              {stats[status as keyof typeof stats] || 0}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{config.labelVi}</div>
          </div>
        ))}
        <div
          onClick={() => setStatusFilter('ALL')}
          style={{
            padding: 16,
            borderRadius: 12,
            background: statusFilter === 'ALL' ? '#1f77b420' : '#111',
            border: `1px solid ${statusFilter === 'ALL' ? '#1f77b4' : '#1a1a1a'}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 4 }}>📊</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1f77b4' }}>{stats.total}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Tất cả</div>
        </div>
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm theo tên, mô tả, loại bệnh, vùng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value as VerificationStatus | 'ALL')}
          style={inputStyle}
        >
          <option value="ALL">Tất cả xác thực</option>
          {Object.entries(VERIFICATION_STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>{config.icon} {config.labelVi}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="ALL">Tất cả độ ưu tiên</option>
          <option value="urgent">🔴 Khẩn cấp</option>
          <option value="high">🟠 Cao</option>
          <option value="medium">🟡 Trung bình</option>
          <option value="low">🟢 Thấp</option>
        </select>
      </div>

      {/* Reports List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: '#111', borderRadius: 12 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Không có báo cáo nào</div>
            <div style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
              Thay đổi bộ lọc để xem các báo cáo khác
            </div>
          </div>
        ) : (
          filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onView={() => {
                setSelectedReport(report);
                setReviewModalOpen(true);
              }}
              onQuickApprove={() => handleQuickApprove(report)}
              onQuickReject={() => handleQuickReject(report)}
              onStartReview={() => handleStartReview(report)}
            />
          ))
        )}
      </div>

      {/* Review Modal */}
      {reviewModalOpen && selectedReport && (
        <ReviewModal
          report={selectedReport}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedReport(null);
          }}
          onSubmit={(payload) => handleReview(selectedReport, payload)}
        />
      )}
    </div>
  );
}

// ============================================
// REPORT CARD COMPONENT
// ============================================
function ReportCard({ 
  report, 
  onView, 
  onQuickApprove, 
  onQuickReject,
  onStartReview,
}: { 
  report: Report; 
  onView: () => void;
  onQuickApprove: () => void;
  onQuickReject: () => void;
  onStartReview: () => void;
}) {
  const statusConfig = getReportStatusConfig(report.report_status);
  const verificationConfig = getVerificationStatusConfig(report.verification_status);

  const priorityConfig = {
    urgent: { color: '#f44336', label: 'Khẩn cấp', icon: '🔴' },
    high: { color: '#ff9800', label: 'Cao', icon: '🟠' },
    medium: { color: '#ffeb3b', label: 'Trung bình', icon: '🟡' },
    low: { color: '#4caf50', label: 'Thấp', icon: '🟢' },
  }[report.priority];

  const timeAgo = getTimeAgo(report.created_at);

  return (
    <div style={{
      background: '#111',
      borderRadius: 12,
      border: `1px solid ${report.report_status === 'pending' ? '#ff980050' : '#1a1a1a'}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        background: statusConfig.bgColor,
        borderBottom: `1px solid ${statusConfig.color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>{statusConfig.icon}</span>
          <div>
            <span style={{ fontWeight: 600, color: statusConfig.color }}>
              {statusConfig.labelVi}
            </span>
            <span style={{ opacity: 0.5, marginLeft: 8, fontSize: 12 }}>
              #{report.id}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ 
            padding: '4px 8px', 
            borderRadius: 4, 
            background: verificationConfig.color + '20',
            color: verificationConfig.color,
            fontSize: 11,
            fontWeight: 600,
          }}>
            {verificationConfig.icon} {verificationConfig.labelVi}
          </span>
          <span style={{ 
            padding: '4px 8px', 
            borderRadius: 4, 
            background: priorityConfig.color + '20',
            color: priorityConfig.color,
            fontSize: 11,
            fontWeight: 600,
          }}>
            {priorityConfig.icon} {priorityConfig.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Main Info */}
          <div style={{ flex: 1 }}>
            {/* Reporter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}>
                👤
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{report.reporter_name}</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>
                  {report.reporter_phone} • {timeAgo}
                </div>
              </div>
            </div>

            {/* Disease & Location */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: getDiseaseColor(report.disease_type),
                }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {getBilingualDiseaseLabel(report.disease_type)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 }}>
                <span>📍</span>
                <span style={{ fontSize: 13 }}>{report.region_name || report.address}</span>
              </div>
              {report.affected_count && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 }}>
                  <span>👥</span>
                  <span style={{ fontSize: 13 }}>{report.affected_count} người</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
              {report.description}
            </div>

            {/* Symptoms */}
            {report.symptoms && report.symptoms.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {report.symptoms.map((symptom, idx) => (
                  <span key={idx} style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: '#2a2a2a',
                    fontSize: 11,
                  }}>
                    {symptom}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
            <button onClick={onView} style={actionButtonStyle}>
              👁️ Xem chi tiết
            </button>
            {report.report_status === 'pending' && (
              <>
                <button onClick={onStartReview} style={{ ...actionButtonStyle, background: '#2196f3' }}>
                  🔍 Bắt đầu duyệt
                </button>
                <button onClick={onQuickApprove} style={{ ...actionButtonStyle, background: '#4caf50' }}>
                  ✅ Duyệt nhanh
                </button>
                <button onClick={onQuickReject} style={{ ...actionButtonStyle, background: '#f44336' }}>
                  ❌ Từ chối
                </button>
              </>
            )}
            {report.report_status === 'in_review' && (
              <>
                <button onClick={onQuickApprove} style={{ ...actionButtonStyle, background: '#4caf50' }}>
                  ✅ Duyệt
                </button>
                <button onClick={onQuickReject} style={{ ...actionButtonStyle, background: '#f44336' }}>
                  ❌ Từ chối
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// REVIEW MODAL COMPONENT
// ============================================
function ReviewModal({ 
  report, 
  onClose, 
  onSubmit 
}: { 
  report: Report; 
  onClose: () => void; 
  onSubmit: (payload: ReportReviewPayload) => void;
}) {
  const [status, setStatus] = useState<ReportStatus>(report.report_status);
  const [verification, setVerification] = useState<VerificationStatus>(report.verification_status);
  const [reviewNotes, setReviewNotes] = useState(report.review_notes || '');
  const [verificationNotes, setVerificationNotes] = useState(report.verification_notes || '');
  const [createCase, setCreateCase] = useState(false);
  const [caseSeverity, setCaseSeverity] = useState(2);

  const handleSubmit = () => {
    onSubmit({
      report_status: status,
      review_notes: reviewNotes,
      verification_status: verification,
      verification_notes: verificationNotes,
      create_case: createCase && status === 'approved',
      case_severity: caseSeverity,
    });
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            📝 Duyệt báo cáo #{report.id}
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, maxHeight: '70vh', overflow: 'auto' }}>
          {/* Report Summary */}
          <div style={{ 
            background: '#111', 
            padding: 16, 
            borderRadius: 8, 
            marginBottom: 20,
            border: '1px solid #2a2a2a',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>📋 Thông tin báo cáo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><span style={{ opacity: 0.6 }}>Người báo cáo:</span> {report.reporter_name}</div>
              <div><span style={{ opacity: 0.6 }}>Điện thoại:</span> {report.reporter_phone}</div>
              <div><span style={{ opacity: 0.6 }}>Loại bệnh:</span> {getBilingualDiseaseLabel(report.disease_type)}</div>
              <div><span style={{ opacity: 0.6 }}>Khu vực:</span> {report.region_name || report.address}</div>
              <div><span style={{ opacity: 0.6 }}>Số người:</span> {report.affected_count || 'N/A'}</div>
              <div><span style={{ opacity: 0.6 }}>Thời gian:</span> {new Date(report.created_at).toLocaleString('vi-VN')}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <span style={{ opacity: 0.6 }}>Mô tả:</span>
              <div style={{ marginTop: 4 }}>{report.description}</div>
            </div>
          </div>

          {/* Review Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Trạng thái duyệt / Review Status</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(REPORT_STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key as ReportStatus)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: `2px solid ${status === key ? config.color : '#2a2a2a'}`,
                    background: status === key ? config.bgColor : 'transparent',
                    color: status === key ? config.color : '#999',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {config.icon} {config.labelVi}
                </button>
              ))}
            </div>
          </div>

          {/* Verification Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Trạng thái xác thực / Verification Status</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(VERIFICATION_STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setVerification(key as VerificationStatus)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: `2px solid ${verification === key ? config.color : '#2a2a2a'}`,
                    background: verification === key ? config.color + '20' : 'transparent',
                    color: verification === key ? config.color : '#999',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {config.icon} {config.labelVi}
                </button>
              ))}
            </div>
          </div>

          {/* Review Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Ghi chú duyệt / Review Notes</label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Nhập ghi chú khi duyệt báo cáo..."
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            />
          </div>

          {/* Verification Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Ghi chú xác thực / Verification Notes</label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Nhập ghi chú từ đội xác thực thực địa..."
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            />
          </div>

          {/* Create Case Option */}
          {status === 'approved' && (
            <div style={{ 
              background: '#4caf5010', 
              border: '1px solid #4caf5030', 
              borderRadius: 8, 
              padding: 16,
              marginBottom: 20,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={createCase}
                  onChange={(e) => setCreateCase(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#4caf50' }}
                />
                <span style={{ fontWeight: 600 }}>
                  🏥 Tự động tạo ca bệnh từ báo cáo này
                </span>
              </label>
              
              {createCase && (
                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Mức độ nghiêm trọng / Severity</label>
                  <select
                    value={caseSeverity}
                    onChange={(e) => setCaseSeverity(Number(e.target.value))}
                    style={inputStyle}
                  >
                    <option value={1}>1 - Nhẹ / Low</option>
                    <option value={2}>2 - Trung bình / Medium</option>
                    <option value={3}>3 - Nặng / High</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '16px 20px', 
          borderTop: '1px solid #2a2a2a',
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid #2a2a2a',
            background: 'transparent',
            color: '#999',
            fontSize: 14,
            cursor: 'pointer',
          }}>
            Hủy
          </button>
          <button onClick={handleSubmit} style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: getReportStatusConfig(status).color,
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            {getReportStatusConfig(status).icon} Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
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

const filtersStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginBottom: 20,
  flexWrap: 'wrap',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #2a2a2a',
  background: '#111',
  color: 'inherit',
  fontSize: 13,
  minWidth: 160,
  width: '100%',
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

const actionButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: 'none',
  background: '#2a2a2a',
  color: 'white',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
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
  maxWidth: 700,
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
