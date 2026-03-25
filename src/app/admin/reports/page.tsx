'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import type { 
  Report, 
  ReportStatus, 
  ReportStatusHistory,
  PreliminaryResult,
  FieldVerificationResult,
  OfficialClassification,
  ClosureAction,
} from '@/types';
import { 
  REPORT_STATUS_CONFIG, 
  getReportStatusConfig,
  getBilingualDiseaseLabel,
  getDiseaseColor,
} from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL!;

function parseReportDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const direct = new Date(dateStr);
  if (!Number.isNaN(direct.getTime())) return direct;
  const withZ = new Date(`${dateStr}Z`);
  if (!Number.isNaN(withZ.getTime())) return withZ;
  return null;
}

function getTimeAgoLabel(dateStr?: string): string {
  const date = parseReportDate(dateStr);
  if (!date) return 'Không xác định';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${diffDays} ngày trước`;
}

function parseContactHistory(raw?: string): Array<{ name: string; phone?: string; relationship?: string; address?: string }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p === 'object' && typeof p.name === 'string')
      .map((p) => ({
        name: String(p.name || '').trim(),
        phone: typeof p.phone === 'string' ? p.phone.trim() : undefined,
        relationship: typeof p.relationship === 'string' ? p.relationship.trim() : undefined,
        address: typeof p.address === 'string' ? p.address.trim() : undefined,
      }))
      .filter((p) => p.name.length > 0);
  } catch {
    return [];
  }
}

// Helper: extract lat/lon from Report (supports GeoJSON location)
function getReportCoords(report: Report): { lat: number; lon: number } {
  if (report.location?.coordinates) {
    return { lon: report.location.coordinates[0], lat: report.location.coordinates[1] };
  }
  return { lat: 0, lon: 0 };
}

// Helper function to get address from coordinates
async function fetchAddressFromCoords(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`${API}/gis/reverse-geocode?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      return data.address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  } catch (e) {
    console.error('Failed to fetch address:', e);
  }
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/** Normalize API response to Report interface (handles both new and legacy fields) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeReport(apiReport: any): Report {
  return {
    ...apiReport,
    // Ensure user info
    reporterName: apiReport.reporterName || apiReport.user?.name || 'Ẩn danh',
    reporterPhone: apiReport.reporterPhone || apiReport.user?.phone || '',
    // Ensure defaults
    diseaseType: apiReport.diseaseType || '',
    description: apiReport.description || '',
    status: apiReport.status || 'submitted',
    createdAt: apiReport.createdAt || new Date().toISOString(),
    updatedAt: apiReport.updatedAt || new Date().toISOString(),
    priority: apiReport.priority || 'medium',
    reportType: apiReport.reportType || 'case_report',
    severityLevel: apiReport.severityLevel || 'medium',
    isDetailedReport: apiReport.isDetailedReport || false,
    isSelfReport: apiReport.isSelfReport || false,
  } as Report;
}

/** Get next available workflow actions based on current status */
function getWorkflowActions(status: ReportStatus): { key: string; label: string; icon: string; color: string }[] {
  switch (status) {
    case 'submitted':
      return [{ key: 'preliminary-review', label: 'Xem xét sơ bộ', icon: '🔍', color: 'bg-blue-500 hover:bg-blue-600' }];
    case 'under_review':
      return [{ key: 'official-confirm', label: 'Duyệt xác nhận', icon: '✅', color: 'bg-emerald-500 hover:bg-emerald-600' }];
    case 'field_verification':
      return [{ key: 'field-verify', label: 'Xác minh thực địa', icon: '🏥', color: 'bg-orange-500 hover:bg-orange-600' }];
    case 'confirmed':
      return [
        { key: 'official-confirm', label: 'Xác nhận chính thức', icon: '✅', color: 'bg-emerald-500 hover:bg-emerald-600' },
        { key: 'close', label: 'Đóng báo cáo', icon: '📁', color: 'bg-slate-500 hover:bg-slate-600' },
      ];
    case 'pending':
      return [];
    case 'verified':
      return [{ key: 'official-confirm', label: 'Duyệt xác nhận', icon: '✅', color: 'bg-emerald-500 hover:bg-emerald-600' }];
    default:
      return [];
  }
}

function toDisplayStatus(status: ReportStatus): ReportStatus {
  return status;
}

// Address Cell Component - Fetches address if not available
function AddressCell({ address, report }: { 
  address?: string; 
  report: Report;
}) {
  const coords = getReportCoords(report);
  const [displayAddress, setDisplayAddress] = useState<string>(
    address || `${coords.lat?.toFixed(4)}, ${coords.lon?.toFixed(4)}`
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      setDisplayAddress(address);
      return;
    }
    if (coords.lat && coords.lon && !address) {
      setLoading(true);
      fetchAddressFromCoords(coords.lat, coords.lon)
        .then(addr => setDisplayAddress(addr))
        .finally(() => setLoading(false));
    }
  }, [address, coords.lat, coords.lon]);

  return (
    <div className="text-sm">
      {loading ? (
        <span className="text-slate-400">Đang tải...</span>
      ) : (
        <span title={`${coords.lat?.toFixed(6)}, ${coords.lon?.toFixed(6)}`}>
          {displayAddress}
        </span>
      )}
    </div>
  );
}

// Use shared navigation items
const navItems = ADMIN_NAV_ITEMS;

export default function ReportsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<string | null>(null);
  const [statusHistory, setStatusHistory] = useState<ReportStatusHistory[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load reports from API
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch(`${API}/reports?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const rawReports = data.data || data || [];
        setReports(rawReports.map(normalizeReport));
      } else {
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
        console.error('Failed to fetch reports:', res.status);
        setReports([]);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, searchQuery, router]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Load status history for a report
  const loadStatusHistory = useCallback(async (reportId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch(`${API}/reports/${reportId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatusHistory(data || []);
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (err) {
      console.error('Error loading status history:', err);
    }
  }, [router]);

  // Stats - new workflow statuses
  const stats = useMemo(() => {
    return {
      submitted: reports.filter(r => r.status === 'submitted' || r.status === 'pending').length,
      under_review: reports.filter(r => r.status === 'under_review').length,
      field_verification: reports.filter(r => r.status === 'field_verification').length,
      pending_publication: reports.filter(r => r.status === 'pending').length,
      confirmed: reports.filter(r => r.status === 'confirmed' || r.status === 'verified').length,
      rejected: reports.filter(r => r.status === 'rejected').length,
      closed: reports.filter(r => r.status === 'closed' || r.status === 'resolved').length,
      total: reports.length,
    };
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const displayStatus = toDisplayStatus(r.status);
      if (statusFilter !== 'ALL' && displayStatus !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = r.reporterName || r.user?.name || '';
        if (
          !name.toLowerCase().includes(query) &&
          !r.description.toLowerCase().includes(query) &&
          !r.diseaseType.toLowerCase().includes(query) &&
          !(r.address || '').toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reports, statusFilter, priorityFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ===== Workflow action handlers =====
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  });

  const handleAuthError = (status: number) => {
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      router.push('/login');
      return true;
    }
    return false;
  };

  const handlePreliminaryReview = async (reportId: string, result: PreliminaryResult, note?: string) => {
    try {
      const res = await fetch(`${API}/reports/${reportId}/preliminary-review`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ result, note }),
      });
      if (res.ok) {
        await loadReports();
        alert('✅ Xem xét sơ bộ thành công!');
      } else {
        if (!handleAuthError(res.status)) {
          alert('❌ Lỗi xử lý xem xét sơ bộ');
        }
      }
    } catch { alert('❌ Lỗi kết nối'); }
    setReviewModalOpen(false);
    setSelectedReport(null);
    setWorkflowAction(null);
  };

  const handleFieldVerify = async (reportId: string, result: FieldVerificationResult, note?: string) => {
    try {
      const res = await fetch(`${API}/reports/${reportId}/field-verify`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ result, note }),
      });
      if (res.ok) {
        await loadReports();
        alert('✅ Xác minh thực địa thành công!');
      } else {
        if (!handleAuthError(res.status)) {
          alert('❌ Lỗi xử lý xác minh thực địa');
        }
      }
    } catch { alert('❌ Lỗi kết nối'); }
    setReviewModalOpen(false);
    setSelectedReport(null);
    setWorkflowAction(null);
  };

  const handleOfficialConfirm = async (reportId: string, classification: OfficialClassification, note?: string) => {
    try {
      const res = await fetch(`${API}/reports/${reportId}/official-confirm`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ classification, note }),
      });
      if (res.ok) {
        await loadReports();
        alert('✅ Duyệt thành công! Báo cáo đã vào hàng chờ công bố chính thức.');
      } else {
        if (!handleAuthError(res.status)) {
          alert('❌ Lỗi xử lý xác nhận chính thức');
        }
      }
    } catch { alert('❌ Lỗi kết nối'); }
    setReviewModalOpen(false);
    setSelectedReport(null);
    setWorkflowAction(null);
  };

  const handleCloseReport = async (reportId: string, action: ClosureAction, note?: string) => {
    try {
      const res = await fetch(`${API}/reports/${reportId}/close`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ action, note }),
      });
      if (res.ok) {
        await loadReports();
        alert('✅ Đóng báo cáo thành công!');
      } else {
        if (!handleAuthError(res.status)) {
          alert('❌ Lỗi đóng báo cáo');
        }
      }
    } catch { alert('❌ Lỗi kết nối'); }
    setReviewModalOpen(false);
    setSelectedReport(null);
    setWorkflowAction(null);
  };

  // Legacy quick reject via status endpoint
  const handleQuickReject = async (report: Report) => {
    try {
      const res = await fetch(`${API}/reports/${report.id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'rejected', adminNote: 'Từ chối nhanh' }),
      });
      if (res.ok) {
        await loadReports();
        alert('✅ Đã từ chối báo cáo');
      } else if (!handleAuthError(res.status)) {
        alert('❌ Lỗi từ chối báo cáo');
      }
    } catch { alert('❌ Lỗi kết nối'); }
  };

  const getTimeAgo = (dateStr: string) => getTimeAgoLabel(dateStr);

  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar navItems={navItems} />

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <Header />

        {/* Page Title */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-slate-800">📋 Quản lý báo cáo</h1>
          <p className="text-sm text-slate-500">Duyệt và xác thực báo cáo từ người dùng</p>
        </div>

        {/* Page Content */}
        <div className="p-6 bg-slate-50 min-h-[calc(100vh-80px)]">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            <div 
              onClick={() => setStatusFilter('ALL')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'ALL' ? 'ring-2 ring-sky-500 bg-sky-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-2xl font-bold text-sky-600">{stats.total}</div>
              <div className="text-xs text-slate-500">Tất cả</div>
            </div>
            <div 
              onClick={() => setStatusFilter('submitted')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'submitted' ? 'ring-2 ring-gray-500 bg-gray-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="text-2xl font-bold text-gray-600">{stats.submitted}</div>
              <div className="text-xs text-slate-500">Đã gửi</div>
            </div>
            <div 
              onClick={() => setStatusFilter('under_review')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'under_review' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-2xl font-bold text-blue-600">{stats.under_review}</div>
              <div className="text-xs text-slate-500">Xem xét</div>
            </div>
            <div 
              onClick={() => setStatusFilter('field_verification')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'field_verification' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">🏥</div>
              <div className="text-2xl font-bold text-orange-600">{stats.field_verification}</div>
              <div className="text-xs text-slate-500">Thực địa</div>
            </div>
            <div 
              onClick={() => setStatusFilter('pending')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'pending' ? 'ring-2 ring-amber-500 bg-amber-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">⏳</div>
              <div className="text-2xl font-bold text-amber-600">{stats.pending_publication}</div>
              <div className="text-xs text-slate-500">Chờ công bố</div>
            </div>
            <div 
              onClick={() => setStatusFilter('confirmed')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'confirmed' ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">✅</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.confirmed}</div>
              <div className="text-xs text-slate-500">Xác nhận</div>
            </div>
            <div 
              onClick={() => setStatusFilter('rejected')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'rejected' ? 'ring-2 ring-red-500 bg-red-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">❌</div>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-xs text-slate-500">Từ chối</div>
            </div>
            <div 
              onClick={() => setStatusFilter('closed')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'closed' ? 'ring-2 ring-slate-500 bg-slate-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">📁</div>
              <div className="text-2xl font-bold text-slate-600">{stats.closed}</div>
              <div className="text-xs text-slate-500">Đã đóng</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm theo tên, mô tả, loại bệnh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'ALL')}
                className="input min-w-[160px]"
              >
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(REPORT_STATUS_CONFIG).map(([status, config]) => {
                  // Skip backward compat statuses in filter
                  if (['resolved'].includes(status)) return null;
                  return <option key={status} value={status}>{config.icon} {config.labelVi}</option>;
                })}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="input min-w-[150px]"
              >
                <option value="ALL">Tất cả ưu tiên</option>
                <option value="urgent">🔴 Khẩn cấp</option>
                <option value="high">🟠 Cao</option>
                <option value="medium">🟡 Trung bình</option>
                <option value="low">🟢 Thấp</option>
              </select>
              <button 
                onClick={() => {
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                  setSearchQuery('');
                }}
                className="btn bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                🔄 Đặt lại
              </button>
            </div>
          </div>

          {/* Reports List */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500">Đang tải...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Không có báo cáo nào</h3>
                <p className="text-slate-500">Thay đổi bộ lọc để xem các báo cáo khác</p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Người báo cáo</th>
                        <th>Loại bệnh</th>
                        <th>Lần gửi</th>
                        <th>Vị trí</th>
                        <th>Mô tả</th>
                        <th>Trạng thái</th>
                        <th>Ưu tiên</th>
                        <th>Thời gian</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReports.map((report) => {
                        const displayStatus = toDisplayStatus(report.status);
                        const statusConfig = getReportStatusConfig(displayStatus);
                        const coords = getReportCoords(report);
                        const reporterName = report.reporterName || report.user?.name || 'Ẩn danh';
                        const reporterPhone = report.reporterPhone || report.user?.phone || '';
                        const priorityColors: Record<string, string> = {
                          urgent: 'bg-red-100 text-red-700',
                          high: 'bg-orange-100 text-orange-700',
                          medium: 'bg-yellow-100 text-yellow-700',
                          low: 'bg-green-100 text-green-700',
                        };
                        const priorityLabels: Record<string, string> = {
                          urgent: 'Khẩn cấp',
                          high: 'Cao',
                          medium: 'TB',
                          low: 'Thấp',
                        };
                        const reportTypeLabels: Record<string, { icon: string; label: string }> = {
                          case_report: { icon: '📋', label: 'Ca bệnh' },
                          outbreak_alert: { icon: '🚨', label: 'Ổ dịch' },
                        };
                        const typeInfo = reportTypeLabels[report.reportType] || reportTypeLabels.case_report;
                        const actions = getWorkflowActions(report.status);

                        return (
                          <tr key={report.id} className="hover:bg-slate-50">
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                                  {report.reportType === 'outbreak_alert' ? '🚨' : report.isDetailedReport ? '🏥' : '👤'}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800 flex items-center gap-2">
                                    {reporterName}
                                    {report.reportType === 'outbreak_alert' && (
                                      <span className="badge bg-red-100 text-red-700 text-xs">Ổ dịch</span>
                                    )}
                                    {report.isDetailedReport && report.reportType !== 'outbreak_alert' && (
                                      <span className="badge badge-warning text-xs">Chi tiết</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500">{reporterPhone}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-3 h-3 rounded-full"
                                  style={{ background: getDiseaseColor(report.diseaseType) }}
                                />
                                <span className="font-medium">{getBilingualDiseaseLabel(report.diseaseType)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center justify-center">
                                {report.userSubmissionCount && report.userSubmissionCount > 1 ? (
                                  <span className="badge badge-warning">
                                    #{report.userSubmissionCount}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-sm">#1</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <AddressCell address={report.address} report={report} />
                            </td>
                            <td>
                              <div className="max-w-[200px] truncate text-sm text-slate-600">
                                {report.description}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${
                                displayStatus === 'submitted' || displayStatus === 'pending' ? 'bg-gray-100 text-gray-700' :
                                displayStatus === 'under_review' ? 'badge-info' :
                                displayStatus === 'field_verification' ? 'bg-orange-100 text-orange-700' :
                                displayStatus === 'confirmed' || displayStatus === 'verified' ? 'badge-success' :
                                displayStatus === 'rejected' ? 'badge-error' :
                                displayStatus === 'closed' || displayStatus === 'resolved' ? 'bg-slate-100 text-slate-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {statusConfig.icon} {statusConfig.labelVi}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${priorityColors[report.priority || 'medium'] || 'bg-slate-100 text-slate-700'}`}>
                                {priorityLabels[report.priority || 'medium'] || report.priority}
                              </span>
                            </td>
                            <td className="text-sm text-slate-500">
                              {getTimeAgo(report.createdAt)}
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setWorkflowAction(null);
                                    setReviewModalOpen(true);
                                    loadStatusHistory(report.id);
                                  }}
                                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                  title="Xem chi tiết"
                                >
                                  👁️
                                </button>
                                {actions.length > 0 && (
                                  <button 
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setWorkflowAction(actions[0].key);
                                      setReviewModalOpen(true);
                                      loadStatusHistory(report.id);
                                    }}
                                    className={`p-2 rounded-lg hover:opacity-80 text-white text-xs ${actions[0].color} transition-colors`}
                                    title={actions[0].label}
                                  >
                                    {actions[0].icon}
                                  </button>
                                )}
                                {report.status !== 'rejected' && report.status !== 'closed' && (
                                  <button 
                                    onClick={() => handleQuickReject(report)}
                                    className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                    title="Từ chối"
                                  >
                                    ❌
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-slate-200">
                    <div className="text-sm text-slate-500">
                      Hiển thị {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredReports.length)} / {filteredReports.length} báo cáo
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="btn bg-white border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Trước
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="btn bg-white border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sau →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {reviewModalOpen && selectedReport && (
        <ReviewModal
          report={selectedReport}
          initialAction={workflowAction}
          statusHistory={statusHistory}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedReport(null);
            setWorkflowAction(null);
          }}
          onPreliminaryReview={(result, note) => handlePreliminaryReview(selectedReport.id, result, note)}
          onFieldVerify={(result, note) => handleFieldVerify(selectedReport.id, result, note)}
          onOfficialConfirm={(classification, note) => handleOfficialConfirm(selectedReport.id, classification, note)}
          onCloseReport={(action, note) => handleCloseReport(selectedReport.id, action, note)}
        />
      )}
    </div>
  );
}

// ============================
// Review Modal Component
// ============================
function ReviewModal({ 
  report,
  initialAction,
  statusHistory,
  onClose, 
  onPreliminaryReview,
  onFieldVerify,
  onOfficialConfirm,
  onCloseReport,
}: { 
  report: Report;
  initialAction: string | null;
  statusHistory: ReportStatusHistory[];
  onClose: () => void; 
  onPreliminaryReview: (result: PreliminaryResult, note?: string) => void;
  onFieldVerify: (result: FieldVerificationResult, note?: string) => void;
  onOfficialConfirm: (classification: OfficialClassification, note?: string) => void;
  onCloseReport: (action: ClosureAction, note?: string) => void;
}) {
  const [activeAction, setActiveAction] = useState<string | null>(initialAction);
  const [note, setNote] = useState('');
  
  // Preliminary review
  const [preliminaryResult, setPreliminaryResult] = useState<PreliminaryResult>('valid');
  // Field verification
  const [fieldResult, setFieldResult] = useState<FieldVerificationResult>('confirmed_suspected');
  // Official confirmation
  const [classification, setClassification] = useState<OfficialClassification>('suspected');
  // Close
  const [closureAction, setClosureAction] = useState<ClosureAction>('monitoring');

  const coords = getReportCoords(report);
  const statusConfig = getReportStatusConfig(report.status);
  const reporterName = report.reporterName || report.user?.name || 'Ẩn danh';
  const reporterPhone = report.reporterPhone || report.user?.phone || '';
  const actions = getWorkflowActions(report.status);

  const priorityOptions: Record<string, { color: string; label: string; icon: string }> = {
    urgent: { color: '#ef4444', label: 'Khẩn cấp', icon: '🔴' },
    high: { color: '#f97316', label: 'Cao', icon: '🟠' },
    medium: { color: '#eab308', label: 'Trung bình', icon: '🟡' },
    low: { color: '#22c55e', label: 'Thấp', icon: '🟢' },
  };
  const priorityConfig = priorityOptions[report.priority || 'medium'] || { color: '#94a3b8', label: 'N/A', icon: '⚪' };
  const parsedContactHistory = parseContactHistory(report.patientInfo?.contactHistory);

  const getTimeAgo = (dateStr: string) => getTimeAgoLabel(dateStr);

  const handleSubmit = () => {
    switch (activeAction) {
      case 'preliminary-review':
        onPreliminaryReview(preliminaryResult, note || undefined);
        break;
      case 'field-verify':
        onFieldVerify(fieldResult, note || undefined);
        break;
      case 'official-confirm':
        onOfficialConfirm(classification, note || undefined);
        break;
      case 'close':
        onCloseReport(closureAction, note || undefined);
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl">
              📋
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Chi tiết báo cáo #{report.id}</h2>
              <p className="text-sm text-slate-500">{getTimeAgo(report.createdAt)}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Status & Type Badges */}
          <div className="flex flex-wrap gap-3 mb-6">
            <span className={`badge ${
              report.status === 'submitted' || report.status === 'pending' ? 'bg-gray-100 text-gray-700' :
              report.status === 'under_review' ? 'badge-info' :
              report.status === 'field_verification' ? 'bg-orange-100 text-orange-700' :
              report.status === 'confirmed' || report.status === 'verified' ? 'badge-success' :
              report.status === 'rejected' ? 'badge-error' :
              'bg-slate-100 text-slate-700'
            }`}>
              {statusConfig.icon} {statusConfig.labelVi}
            </span>
            <span className="badge" style={{ background: priorityConfig.color + '20', color: priorityConfig.color }}>
              {priorityConfig.icon} {priorityConfig.label}
            </span>
            <span className="badge bg-blue-100 text-blue-700">
              {report.reportType === 'outbreak_alert' ? '🚨 Cảnh báo ổ dịch' : '📋 Ca bệnh'}
            </span>
            <span className={`badge ${
              report.severityLevel === 'critical' ? 'bg-red-100 text-red-700' :
              report.severityLevel === 'high' ? 'bg-orange-100 text-orange-700' :
              report.severityLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              Mức độ: {report.severityLevel === 'critical' ? 'Nghiêm trọng' : 
                       report.severityLevel === 'high' ? 'Cao' : 
                       report.severityLevel === 'medium' ? 'Trung bình' : 'Thấp'}
            </span>
          </div>

          {/* Reporter Info */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-slate-800 mb-3">👤 Thông tin người báo cáo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Họ tên</div>
                <div className="font-medium">{reporterName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Số điện thoại</div>
                <div className="font-medium">{reporterPhone}</div>
              </div>
              {report.isSelfReport && (
                <div className="col-span-2">
                  <span className="badge bg-purple-100 text-purple-700">Tự báo cáo (bệnh nhân)</span>
                </div>
              )}
            </div>
          </div>

          {/* Disease Info */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-slate-800 mb-3">🦠 Thông tin dịch bệnh</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Loại bệnh</div>
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ background: getDiseaseColor(report.diseaseType) }}
                  />
                  <span className="font-medium">{getBilingualDiseaseLabel(report.diseaseType)}</span>
                </div>
              </div>
              {report.affectedCount && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Số người ảnh hưởng</div>
                  <div className="font-medium">{report.affectedCount} người</div>
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Mô tả</div>
              <p className="text-slate-700">{report.description}</p>
            </div>
            {report.symptoms && report.symptoms.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-slate-500 mb-2">Triệu chứng</div>
                <div className="flex flex-wrap gap-2">
                  {report.symptoms.map((symptom, idx) => (
                    <span key={idx} className="badge bg-slate-100 text-slate-700">{symptom}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Epidemiological Info */}
          {(report.hasContactWithPatient || report.hasVisitedEpidemicArea || report.hasSimilarCasesNearby) && (
            <div className="card p-4 mb-4 border-2 border-yellow-200 bg-yellow-50">
              <h3 className="font-semibold text-slate-800 mb-3">🔬 Thông tin dịch tễ</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Tiếp xúc người bệnh</div>
                  <span className={`badge ${report.hasContactWithPatient ? 'badge-error' : 'bg-slate-100 text-slate-600'}`}>
                    {report.hasContactWithPatient ? 'Có' : 'Không'}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Đến vùng dịch</div>
                  <span className={`badge ${report.hasVisitedEpidemicArea ? 'badge-error' : 'bg-slate-100 text-slate-600'}`}>
                    {report.hasVisitedEpidemicArea ? 'Có' : 'Không'}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Ca tương tự gần đây</div>
                  <span className={`badge ${report.hasSimilarCasesNearby ? 'badge-error' : 'bg-slate-100 text-slate-600'}`}>
                    {report.hasSimilarCasesNearby ? `Có (~${report.estimatedNearbyCount || '?'})` : 'Không'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Location Info */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-slate-800 mb-3">📍 Thông tin vị trí</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Khu vực</div>
                <div className="font-medium">{report.address || 'Không xác định'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Tọa độ</div>
                <div className="font-mono text-sm">{coords.lat?.toFixed(6)}, {coords.lon?.toFixed(6)}</div>
              </div>
            </div>
          </div>

          {/* Detailed Patient Info */}
          {report.isDetailedReport && report.patientInfo && (
            <div className="card p-4 mb-4 border-2 border-orange-200 bg-orange-50">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏥</span>
                <div>
                  <h3 className="font-semibold text-slate-800">Thông tin chi tiết bệnh nhân</h3>
                  <span className="badge badge-warning text-xs">Báo cáo chi tiết</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {report.patientInfo.fullName && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Họ và tên</div>
                    <div className="font-medium">{report.patientInfo.fullName}</div>
                  </div>
                )}
                {report.patientInfo.age && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Tuổi</div>
                    <div className="font-medium">{report.patientInfo.age}</div>
                  </div>
                )}
                {report.patientInfo.gender && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Giới tính</div>
                    <div className="font-medium">
                      {report.patientInfo.gender === 'male' ? 'Nam' : 
                       report.patientInfo.gender === 'female' ? 'Nữ' : 'Khác'}
                    </div>
                  </div>
                )}
                {report.patientInfo.idNumber && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">CCCD/CMND</div>
                    <div className="font-mono text-sm">{report.patientInfo.idNumber}</div>
                  </div>
                )}
                {report.patientInfo.phone && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">SĐT Bệnh nhân</div>
                    <div className="font-medium">{report.patientInfo.phone}</div>
                  </div>
                )}
                {report.patientInfo.occupation && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Nghề nghiệp</div>
                    <div className="font-medium">{report.patientInfo.occupation}</div>
                  </div>
                )}
              </div>
              {report.patientInfo.address && (
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-1">Địa chỉ thường trú</div>
                  <div className="font-medium">{report.patientInfo.address}</div>
                </div>
              )}
              {report.patientInfo.workplace && (
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-1">Nơi làm việc/học tập</div>
                  <div className="font-medium">{report.patientInfo.workplace}</div>
                </div>
              )}
              {/* Medical Info */}
              <div className="border-t border-orange-200 pt-4 mt-4">
                <h4 className="font-medium text-slate-700 mb-3">📋 Thông tin y tế</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {report.patientInfo.symptomOnsetDate && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Ngày khởi phát</div>
                      <div className="font-medium">
                        {new Date(report.patientInfo.symptomOnsetDate).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  )}
                  {report.patientInfo.healthFacility && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Cơ sở y tế</div>
                      <div className="font-medium">{report.patientInfo.healthFacility}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Nhập viện</div>
                    <div className="font-medium">
                      {report.patientInfo.isHospitalized ? (
                        <span className="badge badge-error">Đang nhập viện</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600">Không</span>
                      )}
                    </div>
                  </div>
                </div>
                {report.patientInfo.underlyingConditions && report.patientInfo.underlyingConditions.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 mb-2">Bệnh nền</div>
                    <div className="flex flex-wrap gap-2">
                      {report.patientInfo.underlyingConditions.map((c, i) => (
                        <span key={i} className="badge bg-red-100 text-red-700">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Travel & Contact History */}
              {(report.patientInfo.travelHistory || report.patientInfo.contactHistory) && (
                <div className="border-t border-orange-200 pt-4 mt-4">
                  <h4 className="font-medium text-slate-700 mb-3">🔍 Lịch sử dịch tễ</h4>
                  {report.patientInfo.travelHistory && (
                    <div className="mb-3">
                      <div className="text-xs text-slate-500 mb-1">Lịch sử di chuyển (14 ngày)</div>
                      <div className="p-3 bg-white rounded-lg text-sm">{report.patientInfo.travelHistory}</div>
                    </div>
                  )}
                  {report.patientInfo.contactHistory && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Lịch sử tiếp xúc</div>
                      {parsedContactHistory.length > 0 ? (
                        <div className="space-y-2">
                          {parsedContactHistory.map((contact, idx) => (
                            <div key={`${contact.name}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                              <div className="font-semibold text-slate-800">{contact.name}</div>
                              <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                                <div>SĐT: {contact.phone || 'Không có'}</div>
                                <div>Quan hệ: {contact.relationship || 'Không rõ'}</div>
                                <div>Địa chỉ: {contact.address || 'Không có'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-white rounded-lg text-sm whitespace-pre-wrap">{report.patientInfo.contactHistory}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Verification Trail */}
          {(report.autoVerifiedAt || report.preliminaryReviewAt || report.fieldVerifiedAt || report.officialConfirmAt) && (
            <div className="card p-4 mb-4">
              <h3 className="font-semibold text-slate-800 mb-3">📜 Quá trình xác minh</h3>
              <div className="space-y-3">
                {report.autoVerifiedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-sm">🤖</div>
                    <div>
                      <div className="text-sm font-medium">Xác nhận tự động</div>
                      <div className="text-xs text-slate-500">{getTimeAgo(report.autoVerifiedAt)}</div>
                    </div>
                  </div>
                )}
                {report.preliminaryReviewAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">🔍</div>
                    <div>
                      <div className="text-sm font-medium">Xem xét sơ bộ: {report.preliminaryReviewResult}</div>
                      <div className="text-xs text-slate-500">{getTimeAgo(report.preliminaryReviewAt)}</div>
                      {report.preliminaryReviewNote && <div className="text-xs text-slate-600 mt-1">{report.preliminaryReviewNote}</div>}
                    </div>
                  </div>
                )}
                {report.fieldVerifiedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm">🏥</div>
                    <div>
                      <div className="text-sm font-medium">Xác minh thực địa: {report.fieldVerificationResult}</div>
                      <div className="text-xs text-slate-500">{getTimeAgo(report.fieldVerifiedAt)}</div>
                      {report.fieldVerificationNote && <div className="text-xs text-slate-600 mt-1">{report.fieldVerificationNote}</div>}
                    </div>
                  </div>
                )}
                {report.officialConfirmAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm">✅</div>
                    <div>
                      <div className="text-sm font-medium">Xác nhận chính thức: {report.officialClassification}</div>
                      <div className="text-xs text-slate-500">{getTimeAgo(report.officialConfirmAt)}</div>
                      {report.officialConfirmNote && <div className="text-xs text-slate-600 mt-1">{report.officialConfirmNote}</div>}
                    </div>
                  </div>
                )}
                {report.closedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">📁</div>
                    <div>
                      <div className="text-sm font-medium">Đóng: {report.closureAction}</div>
                      <div className="text-xs text-slate-500">{getTimeAgo(report.closedAt)}</div>
                      {report.closureNote && <div className="text-xs text-slate-600 mt-1">{report.closureNote}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div className="card p-4 mb-4">
              <h3 className="font-semibold text-slate-800 mb-3">📋 Lịch sử trạng thái</h3>
              <div className="space-y-2">
                {statusHistory.map((entry) => {
                  const newConfig = getReportStatusConfig(entry.newStatus);
                  return (
                    <div key={entry.id} className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-slate-400 min-w-[100px]">{getTimeAgo(entry.createdAt)}</span>
                      {entry.previousStatus && (
                        <>
                          <span className="badge bg-slate-100 text-slate-600 text-xs">{getReportStatusConfig(entry.previousStatus).labelVi}</span>
                          <span className="text-slate-400">→</span>
                        </>
                      )}
                      <span className="badge bg-emerald-100 text-emerald-700 text-xs">{newConfig.icon} {newConfig.labelVi}</span>
                      {entry.note && <span className="text-slate-500 text-xs italic">- {entry.note}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workflow Action Section */}
          {actions.length > 0 && (
            <div className="card p-4 border-2 border-emerald-200 bg-emerald-50">
              <h3 className="font-semibold text-slate-800 mb-4">✍️ Hành động tiếp theo</h3>
              
              {/* Action tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {actions.map(a => (
                  <button
                    key={a.key}
                    onClick={() => { setActiveAction(a.key); setNote(''); }}
                    className={`btn text-sm ${activeAction === a.key ? `${a.color} text-white` : 'bg-white border border-slate-200 text-slate-700'}`}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>

              {/* Action form */}
              {activeAction === 'preliminary-review' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Kết quả xem xét sơ bộ</label>
                    <select value={preliminaryResult} onChange={e => setPreliminaryResult(e.target.value as PreliminaryResult)} className="input w-full">
                      <option value="valid">✅ Hợp lệ - Chuyển xác nhận</option>
                      <option value="need_field_check">🏥 Cần kiểm tra thực địa</option>
                      <option value="invalid">❌ Không hợp lệ - Từ chối</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="input w-full min-h-[80px] resize-none" placeholder="Nhập ghi chú xem xét..." />
                  </div>
                </div>
              )}

              {activeAction === 'field-verify' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Kết quả xác minh thực địa</label>
                    <select value={fieldResult} onChange={e => setFieldResult(e.target.value as FieldVerificationResult)} className="input w-full">
                      <option value="confirmed_suspected">✅ Xác nhận nghi ngờ - Phù hợp</option>
                      <option value="not_disease">❌ Không phải bệnh</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú thực địa</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="input w-full min-h-[80px] resize-none" placeholder="Nhập ghi chú từ thực địa..." />
                  </div>
                </div>
              )}

              {activeAction === 'official-confirm' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phân loại chính thức</label>
                    <select value={classification} onChange={e => setClassification(e.target.value as OfficialClassification)} className="input w-full">
                      <option value="suspected">🟡 Nghi ngờ (Suspected)</option>
                      <option value="probable">🟠 Có thể (Probable)</option>
                      <option value="confirmed">🔴 Xác nhận (Confirmed)</option>
                      <option value="false_alarm">⚪ Báo động giả (False alarm)</option>
                    </select>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Sau khi duyệt thành công, báo cáo sẽ chuyển vào hàng chờ công bố chính thức. Hệ thống không tự tạo ca bệnh ngay.
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="input w-full min-h-[80px] resize-none" placeholder="Nhập ghi chú xác nhận..." />
                  </div>
                </div>
              )}

              {activeAction === 'close' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Hành động đóng</label>
                    <select value={closureAction} onChange={e => setClosureAction(e.target.value as ClosureAction)} className="input w-full">
                      <option value="monitoring">👁️ Theo dõi (Monitoring)</option>
                      <option value="isolation">🔒 Cách ly (Isolation)</option>
                      <option value="area_warning">⚠️ Cảnh báo khu vực (Area Warning)</option>
                      <option value="no_action">❌ Không hành động</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú đóng</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="input w-full min-h-[80px] resize-none" placeholder="Nhập ghi chú khi đóng báo cáo..." />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
            Đóng
          </button>
          {activeAction && (
            <button 
              onClick={handleSubmit}
              className="btn bg-emerald-500 text-white hover:bg-emerald-600"
            >
              💾 Xác nhận
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
