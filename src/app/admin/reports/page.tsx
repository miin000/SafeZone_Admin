'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { 
  Report, 
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

// Transform API response (camelCase) to frontend format (snake_case)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformApiReport(apiReport: any): Report {
  // Extract coordinates from location GeoJSON
  let lat = apiReport.lat;
  let lon = apiReport.lon;
  
  if (apiReport.location?.coordinates) {
    // GeoJSON Point: [longitude, latitude]
    lon = apiReport.location.coordinates[0];
    lat = apiReport.location.coordinates[1];
  }

  // Get user info if available
  const user = apiReport.user || {};

  return {
    id: apiReport.id,
    case_id: apiReport.caseId,
    reporter_id: apiReport.userId || user.id,
    reporter_name: user.name || apiReport.reporterName || 'Ẩn danh',
    reporter_phone: user.phone || apiReport.reporterPhone || '',
    reporter_email: user.email || apiReport.reporterEmail || '',
    
    // Case location
    lat: lat || 0,
    lon: lon || 0,
    address: apiReport.address || '',
    region_id: apiReport.regionId,
    region_name: apiReport.regionName,
    
    // Reporter location
    reporter_lat: apiReport.reporterLocation?.coordinates?.[1],
    reporter_lon: apiReport.reporterLocation?.coordinates?.[0],
    
    // Report content
    disease_type: apiReport.diseaseType || '',
    description: apiReport.description || '',
    symptoms: apiReport.symptoms || [],
    affected_count: apiReport.affectedCount || 1,
    images: apiReport.imageUrls || apiReport.images || [],
    
    // Detailed report fields
    is_detailed_report: apiReport.isDetailedReport || false,
    patient_info: apiReport.patientInfo,
    
    // Timestamps
    created_at: apiReport.createdAt || new Date().toISOString(),
    updated_at: apiReport.updatedAt || new Date().toISOString(),
    
    // Workflow - map 'pending'/'verified'/'rejected' to report workflow statuses
    report_status: mapApiStatus(apiReport.status),
    verification_status: mapVerificationStatus(apiReport.status),
    
    // Review info
    reviewed_by: apiReport.verifiedBy,
    reviewed_at: apiReport.verifiedAt,
    review_notes: apiReport.adminNote,
    
    // Priority (default to medium if not specified)
    priority: apiReport.priority || 'medium',
  };
}

// Map API status to report_status
function mapApiStatus(status: string): ReportStatus {
  const statusMap: Record<string, ReportStatus> = {
    'pending': 'pending',
    'verified': 'approved',
    'rejected': 'rejected',
    'resolved': 'approved',
  };
  return statusMap[status] || 'pending';
}

// Map API status to verification_status
function mapVerificationStatus(status: string): VerificationStatus {
  const statusMap: Record<string, VerificationStatus> = {
    'pending': 'unverified',
    'verified': 'verified',
    'rejected': 'invalid',
    'resolved': 'verified',
  };
  return statusMap[status] || 'unverified';
}

// Address Cell Component - Fetches address if not available
function AddressCell({ address, regionName, lat, lon }: { 
  address?: string; 
  regionName?: string;
  lat: number; 
  lon: number; 
}) {
  const [displayAddress, setDisplayAddress] = useState<string>(
    regionName || address || `${lat?.toFixed(4)}, ${lon?.toFixed(4)}`
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we already have a valid address, don't fetch
    if (regionName || address) {
      setDisplayAddress(regionName || address || '');
      return;
    }

    // Only fetch if we have valid coordinates
    if (lat && lon && !regionName && !address) {
      setLoading(true);
      fetchAddressFromCoords(lat, lon)
        .then(addr => {
          setDisplayAddress(addr);
        })
        .finally(() => setLoading(false));
    }
  }, [address, regionName, lat, lon]);

  return (
    <div className="text-sm">
      {loading ? (
        <span className="text-slate-400">Đang tải...</span>
      ) : (
        <span title={`${lat?.toFixed(6)}, ${lon?.toFixed(6)}`}>
          {displayAddress}
        </span>
      )}
    </div>
  );
}

// Navigation items
const navItems = [
  { href: '/', icon: '🗺️', label: 'Dashboard' },
  { href: '/stats', icon: '📊', label: 'Statistics' },
  { href: '/admin/reports', icon: '📋', label: 'Reports' },
  { href: '/admin', icon: '🏥', label: 'Cases' },
  { href: '/admin/zones', icon: '🚨', label: 'Zones' },
  { href: '/admin/posts', icon: '💬', label: 'Posts' },
  { href: '/admin/health-info', icon: '📚', label: 'Health Info' },
  { href: '/admin/notifications', icon: '🔔', label: 'Notifications' },
];

export default function ReportsPage() {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus | 'ALL'>('ALL');
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
      if (verificationFilter !== 'ALL') params.set('verification', verificationFilter);
      if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API}/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const rawReports = data.data || data || [];
        // Transform API response to frontend format
        const transformedReports = rawReports.map(transformApiReport);
        setReports(transformedReports);
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

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle review action
  const handleReview = async (report: Report, payload: ReportReviewPayload) => {
    try {
      // Map frontend status to API status
      const apiStatus = payload.report_status === 'approved' ? 'verified' : 
                        payload.report_status === 'rejected' ? 'rejected' : 
                        payload.report_status === 'pending' ? 'pending' : 'pending';
      
      const res = await fetch(`${API}/reports/${report.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: apiStatus,
          adminNote: payload.review_notes || payload.verification_notes,
          // Include flag to create case if approving detailed report
          createCase: payload.report_status === 'approved' && report.is_detailed_report,
        }),
      });
      
      if (res.ok) {
        loadReports();
      } else {
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

  const handleQuickApprove = (report: Report) => {
    handleReview(report, { report_status: 'approved', verification_status: 'verified' });
  };

  const handleQuickReject = (report: Report) => {
    handleReview(report, { report_status: 'rejected' });
  };

  const handleStartReview = (report: Report) => {
    handleReview(report, { report_status: 'in_review' });
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Không xác định';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Không xác định';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 0) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 shadow-sm z-50 transition-all duration-300 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            SZ
          </div>
          {!sidebarCollapsed && (
            <span className="ml-3 font-bold text-slate-800 text-lg">SafeZone</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute bottom-4 right-4 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'}`}>
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-bold text-slate-800">📋 Quản lý báo cáo</h1>
            <p className="text-sm text-slate-500">Duyệt và xác thực báo cáo từ người dùng</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
              🔔
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
              onClick={() => setStatusFilter('pending')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'pending' ? 'ring-2 ring-amber-500 bg-amber-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">⏳</div>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-xs text-slate-500">Chờ duyệt</div>
            </div>
            <div 
              onClick={() => setStatusFilter('in_review')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'in_review' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-2xl font-bold text-blue-600">{stats.in_review}</div>
              <div className="text-xs text-slate-500">Đang duyệt</div>
            </div>
            <div 
              onClick={() => setStatusFilter('approved')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'approved' ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">✅</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.approved}</div>
              <div className="text-xs text-slate-500">Đã duyệt</div>
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
              onClick={() => setStatusFilter('needs_info')}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'needs_info' ? 'ring-2 ring-purple-500 bg-purple-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">❓</div>
              <div className="text-2xl font-bold text-purple-600">{stats.needs_info}</div>
              <div className="text-xs text-slate-500">Cần thêm TT</div>
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
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value as VerificationStatus | 'ALL')}
                className="input min-w-[160px]"
              >
                <option value="ALL">Tất cả xác thực</option>
                {Object.entries(VERIFICATION_STATUS_CONFIG).map(([status, config]) => (
                  <option key={status} value={status}>{config.icon} {config.labelVi}</option>
                ))}
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
                  setVerificationFilter('ALL');
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
                        const statusConfig = getReportStatusConfig(report.report_status);
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

                        return (
                          <tr key={report.id} className="hover:bg-slate-50">
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                                  {report.is_detailed_report ? '🏥' : '👤'}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800 flex items-center gap-2">
                                    {report.reporter_name}
                                    {report.is_detailed_report && (
                                      <span className="badge badge-warning text-xs">Chi tiết</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500">{report.reporter_phone}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-3 h-3 rounded-full"
                                  style={{ background: getDiseaseColor(report.disease_type) }}
                                />
                                <span className="font-medium">{getBilingualDiseaseLabel(report.disease_type)}</span>
                              </div>
                            </td>
                            <td>
                              <AddressCell 
                                address={report.address} 
                                regionName={report.region_name}
                                lat={report.lat} 
                                lon={report.lon} 
                              />
                            </td>
                            <td>
                              <div className="max-w-[200px] truncate text-sm text-slate-600">
                                {report.description}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${
                                report.report_status === 'pending' ? 'badge-warning' :
                                report.report_status === 'in_review' ? 'badge-info' :
                                report.report_status === 'approved' ? 'badge-success' :
                                report.report_status === 'rejected' ? 'badge-error' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {statusConfig.icon} {statusConfig.labelVi}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${priorityColors[report.priority] || 'bg-slate-100 text-slate-700'}`}>
                                {priorityLabels[report.priority] || report.priority}
                              </span>
                            </td>
                            <td className="text-sm text-slate-500">
                              {getTimeAgo(report.created_at)}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setReviewModalOpen(true);
                                  }}
                                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                  title="Xem chi tiết"
                                >
                                  👁️
                                </button>
                                {(report.report_status === 'pending' || report.report_status === 'in_review') && (
                                  <>
                                    <button 
                                      onClick={() => handleQuickApprove(report)}
                                      className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
                                      title="Duyệt"
                                    >
                                      ✅
                                    </button>
                                    <button 
                                      onClick={() => handleQuickReject(report)}
                                      className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                      title="Từ chối"
                                    >
                                      ❌
                                    </button>
                                  </>
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

// Review Modal Component
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

  const statusConfig = getReportStatusConfig(report.report_status);
  const verificationConfig = getVerificationStatusConfig(report.verification_status);

  const priorityOptions: Record<string, { color: string; label: string; icon: string }> = {
    urgent: { color: '#ef4444', label: 'Khẩn cấp', icon: '🔴' },
    high: { color: '#f97316', label: 'Cao', icon: '🟠' },
    medium: { color: '#eab308', label: 'Trung bình', icon: '🟡' },
    low: { color: '#22c55e', label: 'Thấp', icon: '🟢' },
  };
  const priorityConfig = priorityOptions[report.priority] || { color: '#94a3b8', label: 'N/A', icon: '⚪' };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Không xác định';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Không xác định';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 0) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl">
              📋
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Chi tiết báo cáo #{report.id}</h2>
              <p className="text-sm text-slate-500">{getTimeAgo(report.created_at)}</p>
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
          {/* Status Badges */}
          <div className="flex flex-wrap gap-3 mb-6">
            <span className={`badge ${
              report.report_status === 'pending' ? 'badge-warning' :
              report.report_status === 'in_review' ? 'badge-info' :
              report.report_status === 'approved' ? 'badge-success' :
              report.report_status === 'rejected' ? 'badge-error' :
              'bg-purple-100 text-purple-700'
            }`}>
              {statusConfig.icon} {statusConfig.labelVi}
            </span>
            <span className="badge bg-slate-100 text-slate-700">
              {verificationConfig.icon} {verificationConfig.labelVi}
            </span>
            <span className="badge" style={{ background: priorityConfig.color + '20', color: priorityConfig.color }}>
              {priorityConfig.icon} {priorityConfig.label}
            </span>
          </div>

          {/* Reporter Info */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-slate-800 mb-3">👤 Thông tin người báo cáo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Họ tên</div>
                <div className="font-medium">{report.reporter_name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Số điện thoại</div>
                <div className="font-medium">{report.reporter_phone}</div>
              </div>
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
                    style={{ background: getDiseaseColor(report.disease_type) }}
                  />
                  <span className="font-medium">{getBilingualDiseaseLabel(report.disease_type)}</span>
                </div>
              </div>
              {report.affected_count && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Số người ảnh hưởng</div>
                  <div className="font-medium">{report.affected_count} người</div>
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

          {/* Location Info */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-slate-800 mb-3">📍 Thông tin vị trí</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Khu vực</div>
                <div className="font-medium">{report.region_name || report.address || 'Không xác định'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Tọa độ</div>
                <div className="font-mono text-sm">{report.lat?.toFixed(6)}, {report.lon?.toFixed(6)}</div>
              </div>
            </div>
          </div>

          {/* Detailed Patient Info - Only show if is_detailed_report */}
          {report.is_detailed_report && report.patient_info && (
            <div className="card p-4 mb-4 border-2 border-orange-200 bg-orange-50">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏥</span>
                <div>
                  <h3 className="font-semibold text-slate-800">Thông tin chi tiết bệnh nhân</h3>
                  <span className="badge badge-warning text-xs">Báo cáo chi tiết</span>
                </div>
              </div>
              
              {/* Personal Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {report.patient_info.fullName && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Họ và tên</div>
                    <div className="font-medium">{report.patient_info.fullName}</div>
                  </div>
                )}
                {report.patient_info.age && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Tuổi</div>
                    <div className="font-medium">{report.patient_info.age}</div>
                  </div>
                )}
                {report.patient_info.gender && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Giới tính</div>
                    <div className="font-medium">
                      {report.patient_info.gender === 'male' ? 'Nam' : 
                       report.patient_info.gender === 'female' ? 'Nữ' : 'Khác'}
                    </div>
                  </div>
                )}
                {report.patient_info.idNumber && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">CCCD/CMND</div>
                    <div className="font-mono text-sm">{report.patient_info.idNumber}</div>
                  </div>
                )}
                {report.patient_info.phone && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Số điện thoại BN</div>
                    <div className="font-medium">{report.patient_info.phone}</div>
                  </div>
                )}
                {report.patient_info.occupation && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Nghề nghiệp</div>
                    <div className="font-medium">{report.patient_info.occupation}</div>
                  </div>
                )}
              </div>

              {/* Address */}
              {report.patient_info.address && (
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-1">Địa chỉ thường trú</div>
                  <div className="font-medium">{report.patient_info.address}</div>
                </div>
              )}

              {/* Workplace */}
              {report.patient_info.workplace && (
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-1">Nơi làm việc/học tập</div>
                  <div className="font-medium">{report.patient_info.workplace}</div>
                </div>
              )}

              {/* Medical Info */}
              <div className="border-t border-orange-200 pt-4 mt-4">
                <h4 className="font-medium text-slate-700 mb-3">📋 Thông tin y tế</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {report.patient_info.symptomOnsetDate && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Ngày khởi phát</div>
                      <div className="font-medium">
                        {new Date(report.patient_info.symptomOnsetDate).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  )}
                  {report.patient_info.healthFacility && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Cơ sở y tế</div>
                      <div className="font-medium">{report.patient_info.healthFacility}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Nhập viện</div>
                    <div className="font-medium">
                      {report.patient_info.isHospitalized ? (
                        <span className="badge badge-error">Đang nhập viện</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600">Không</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Underlying conditions */}
                {report.patient_info.underlyingConditions && report.patient_info.underlyingConditions.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 mb-2">Bệnh nền</div>
                    <div className="flex flex-wrap gap-2">
                      {report.patient_info.underlyingConditions.map((condition, idx) => (
                        <span key={idx} className="badge bg-red-100 text-red-700">{condition}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact & Travel History */}
              {(report.patient_info.travelHistory || report.patient_info.contactHistory) && (
                <div className="border-t border-orange-200 pt-4 mt-4">
                  <h4 className="font-medium text-slate-700 mb-3">🔍 Lịch sử dịch tễ</h4>
                  {report.patient_info.travelHistory && (
                    <div className="mb-3">
                      <div className="text-xs text-slate-500 mb-1">Lịch sử di chuyển (14 ngày)</div>
                      <div className="p-3 bg-white rounded-lg text-sm">{report.patient_info.travelHistory}</div>
                    </div>
                  )}
                  {report.patient_info.contactHistory && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Lịch sử tiếp xúc</div>
                      <div className="p-3 bg-white rounded-lg text-sm">{report.patient_info.contactHistory}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Review Section */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-800 mb-4">✍️ Đánh giá báo cáo</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Trạng thái duyệt</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReportStatus)}
                  className="input w-full"
                >
                  {Object.entries(REPORT_STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.icon} {config.labelVi}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Xác thực</label>
                <select 
                  value={verification}
                  onChange={(e) => setVerification(e.target.value as VerificationStatus)}
                  className="input w-full"
                >
                  {Object.entries(VERIFICATION_STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.icon} {config.labelVi}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú duyệt</label>
              <textarea 
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="input w-full min-h-[80px] resize-none"
                placeholder="Nhập ghi chú về quyết định duyệt..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú xác thực</label>
              <textarea 
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="input w-full min-h-[80px] resize-none"
                placeholder="Nhập ghi chú về xác thực..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
            Hủy
          </button>
          <button 
            onClick={() => onSubmit({
              report_status: status,
              verification_status: verification,
              review_notes: reviewNotes,
              verification_notes: verificationNotes,
            })}
            className="btn bg-emerald-500 text-white hover:bg-emerald-600"
          >
            💾 Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
