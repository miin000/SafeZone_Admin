// ============================================
// CORE INTERFACES
// ============================================

export interface Case {
  id: string;
  external_id?: string;
  disease_type: string;
  status: string;
  severity: number;
  reported_time: string;
  region_id?: number;
  region_name?: string;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  notes?: string;
  lat: number;
  lon: number;
  // Report workflow fields
  report_status?: ReportStatus;
  reporter_id?: string;
  reporter_name?: string;
  reporter_phone?: string;
  reported_via?: 'mobile' | 'web' | 'api';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  verification_status?: VerificationStatus;
  verified_by?: string;
  verified_at?: string;
  images?: string[];
}

export interface CaseFormData {
  disease_type: string;
  status: string;
  severity: number;
  reported_time: string;
  lat: number;
  lon: number;
  region_id?: number;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  notes?: string;
}

export interface CasesListResponse {
  data: Case[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// REPORT WORKFLOW TYPES
// ============================================

/** Report status from mobile users */
export type ReportStatus = 
  | 'pending'       // Chờ duyệt - Awaiting review
  | 'in_review'     // Đang xem xét - Under review
  | 'approved'      // Đã duyệt - Approved
  | 'rejected'      // Từ chối - Rejected
  | 'needs_info';   // Cần thêm thông tin - Needs more info

/** Verification status by field team */
export type VerificationStatus = 
  | 'unverified'    // Chưa xác thực - Not verified
  | 'verifying'     // Đang xác thực - Being verified
  | 'verified'      // Đã xác thực - Verified
  | 'invalid';      // Không hợp lệ - Invalid

export const REPORT_STATUS_CONFIG: Record<ReportStatus, { 
  label: string; 
  labelVi: string; 
  color: string; 
  icon: string;
  bgColor: string;
}> = {
  pending: { 
    label: 'Pending', 
    labelVi: 'Chờ duyệt', 
    color: '#ff9800', 
    icon: '⏳',
    bgColor: '#ff980020',
  },
  in_review: { 
    label: 'In Review', 
    labelVi: 'Đang xem xét', 
    color: '#2196f3', 
    icon: '🔍',
    bgColor: '#2196f320',
  },
  approved: { 
    label: 'Approved', 
    labelVi: 'Đã duyệt', 
    color: '#4caf50', 
    icon: '✅',
    bgColor: '#4caf5020',
  },
  rejected: { 
    label: 'Rejected', 
    labelVi: 'Từ chối', 
    color: '#f44336', 
    icon: '❌',
    bgColor: '#f4433620',
  },
  needs_info: { 
    label: 'Needs Info', 
    labelVi: 'Cần thêm thông tin', 
    color: '#9c27b0', 
    icon: '❓',
    bgColor: '#9c27b020',
  },
};

export const VERIFICATION_STATUS_CONFIG: Record<VerificationStatus, {
  label: string;
  labelVi: string;
  color: string;
  icon: string;
}> = {
  unverified: { label: 'Unverified', labelVi: 'Chưa xác thực', color: '#9e9e9e', icon: '⬜' },
  verifying: { label: 'Verifying', labelVi: 'Đang xác thực', color: '#ff9800', icon: '🔄' },
  verified: { label: 'Verified', labelVi: 'Đã xác thực', color: '#4caf50', icon: '✓' },
  invalid: { label: 'Invalid', labelVi: 'Không hợp lệ', color: '#f44336', icon: '✗' },
};

/** Patient information for detailed case reports */
export interface PatientInfo {
  fullName?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  idNumber?: string;
  phone?: string;
  address?: string;
  occupation?: string;
  workplace?: string;
  symptomOnsetDate?: string;
  healthFacility?: string;
  isHospitalized?: boolean;
  travelHistory?: string;
  contactHistory?: string;
  underlyingConditions?: string[];
}

/** Report from mobile app */
export interface Report {
  id: string;
  case_id?: string;
  reporter_id: string;
  reporter_name: string;
  reporter_phone?: string;
  reporter_email?: string;
  
  // Case/incident location (where the case occurred)
  lat: number;
  lon: number;
  address?: string;
  region_id?: number;
  region_name?: string;
  
  // Reporter's location when submitting (where the reporter is)
  reporter_lat?: number;
  reporter_lon?: number;
  
  // Report content
  disease_type: string;
  description: string;
  symptoms?: string[];
  affected_count?: number;
  images?: string[];
  
  // Detailed report fields
  is_detailed_report?: boolean;
  patient_info?: PatientInfo;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Workflow
  report_status: ReportStatus;
  verification_status: VerificationStatus;
  
  // Review info
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  
  // Verification info
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  
  // Priority
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ReportListResponse {
  data: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    pending: number;
    in_review: number;
    approved: number;
    rejected: number;
    needs_info: number;
  };
}

export interface ReportReviewPayload {
  report_status: ReportStatus;
  review_notes?: string;
  verification_status?: VerificationStatus;
  verification_notes?: string;
  create_case?: boolean; // Auto-create case on approval
  case_severity?: number;
  case_status?: string;
}

// Helper functions for reports
export function getReportStatusConfig(status: ReportStatus) {
  return REPORT_STATUS_CONFIG[status] || REPORT_STATUS_CONFIG.pending;
}

export function getVerificationStatusConfig(status: VerificationStatus) {
  return VERIFICATION_STATUS_CONFIG[status] || VERIFICATION_STATUS_CONFIG.unverified;
}

export function getBilingualReportStatus(status: ReportStatus): string {
  const config = REPORT_STATUS_CONFIG[status];
  return config ? `${config.labelVi} / ${config.label}` : status;
}

export function getBilingualVerificationStatus(status: VerificationStatus): string {
  const config = VERIFICATION_STATUS_CONFIG[status];
  return config ? `${config.labelVi} / ${config.label}` : status;
}

// ============================================
// POST TYPES (Community Posts)
// ============================================

export type PostStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'user' | 'healthWorker' | 'admin';
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

export interface Post {
  id: string;
  content: string;
  imageUrls?: string[];
  status: PostStatus;
  helpfulCount: number;
  notHelpfulCount: number;
  location?: string;
  diseaseType?: string;
  adminNote?: string;
  user?: User;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostListResponse {
  data: Post[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PostStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const POST_STATUS_CONFIG: Record<PostStatus, {
  label: string;
  labelVi: string;
  color: string;
  icon: string;
  bgColor: string;
}> = {
  pending: {
    label: 'Pending',
    labelVi: 'Chờ duyệt',
    color: '#ff9800',
    icon: '⏳',
    bgColor: '#ff980020',
  },
  approved: {
    label: 'Approved',
    labelVi: 'Đã duyệt',
    color: '#4caf50',
    icon: '✅',
    bgColor: '#4caf5020',
  },
  rejected: {
    label: 'Rejected',
    labelVi: 'Từ chối',
    color: '#f44336',
    icon: '❌',
    bgColor: '#f4433620',
  },
};

// ============================================
// NOTIFICATION TYPES (for mobile push)
// ============================================

export interface EpidemicZone {
  id: string;
  name: string;
  center: { lat: number; lon: number };
  radius: number; // in meters
  region_id?: number;
  disease_types: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  active: boolean;
  created_at: string;
  updated_at: string;
  case_count: number;
  notification_message?: string;
  notification_message_vi?: string;
}

export interface PushNotificationPayload {
  title: string;
  title_vi?: string;
  body: string;
  body_vi?: string;
  data?: {
    type: 'epidemic_alert' | 'report_update' | 'general';
    zone_id?: string;
    report_id?: string;
    action?: string;
  };
  target_users?: string[]; // Specific user IDs, or empty for all
  target_regions?: number[]; // Target by region
}

// ============================================
// STATISTICS INTERFACES
// ============================================

export interface StatsSummary {
  total_cases: number;
  matched_region: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  min_time: string;
  max_time: string;
  active_cases?: number;
  avg_severity?: number;
  // Report stats
  pending_reports?: number;
  reports_today?: number;
}

export interface RegionStat {
  id: number;
  name: string;
  total: number;
  severity_score?: number;
  lat?: number;
  lon?: number;
}

export interface DayStat {
  day: string;
  total: number;
}

export interface DiseaseStat {
  disease_type: string;
  total: number;
}

export interface StatusStat {
  status: string;
  total: number;
}

export interface MonthStat {
  month: string;
  total: number;
}

export interface WeekStat {
  week: string;
  total: number;
}

export interface ComparisonStat {
  current_period: number;
  previous_period: number;
}

export interface Stats {
  summary: StatsSummary;
  topRegions: RegionStat[];
  byDay: DayStat[];
  byDisease: DiseaseStat[];
  byStatus: StatusStat[];
  byMonth: MonthStat[];
  byWeek: WeekStat[];
  comparison: ComparisonStat;
}

// ============================================
// MAP & GIS TYPES
// ============================================

export type DisplayMode = 
  | 'points_disease' 
  | 'points_status'
  | 'points_severity'
  | 'heatmap' 
  | 'grid_density' 
  | 'clusters';

export type BaseMapStyle = 'osm' | 'dark' | 'light' | 'satellite';

export interface MapLayerConfig {
  showRegions: boolean;
  showCases: boolean;
  showZones: boolean;
  showDensity: boolean;
  showClusters: boolean;
  baseMap: BaseMapStyle;
}

export interface GridCell {
  id: string;
  bounds: [[number, number], [number, number]]; // [[swLat, swLon], [neLat, neLon]]
  center: [number, number];
  count: number;
  severity_sum: number;
  severity_avg: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  diseases: Record<string, number>;
}

export interface GridDensityData {
  cells: GridCell[];
  grid_size: number; // in degrees
  total_cases: number;
  max_count: number;
  max_severity: number;
}

// ============================================
// DISEASE CONFIGURATION (BILINGUAL)
// ============================================

export const DISEASE_TYPES = [
  'Dengue',
  'HFMD',
  'COVID-19',
  'Influenza',
  'Cholera',
  'Measles',
  'Malaria',
  'Typhoid',
  'Hepatitis',
  'Tuberculosis',
  'Other'
] as const;

export type DiseaseType = typeof DISEASE_TYPES[number];

/** Disease colors - following GIS conventions */
export const DISEASE_COLORS: Record<string, string> = {
  'Dengue': '#d62728',        // Red - Dengue fever
  'HFMD': '#ff7f0e',          // Orange - Hand foot mouth
  'Influenza': '#1f77b4',     // Blue - Flu
  'COVID-19': '#9467bd',      // Purple - COVID-19
  'Cholera': '#17becf',       // Cyan - Cholera
  'Measles': '#e377c2',       // Pink - Measles
  'Malaria': '#2ca02c',       // Green - Malaria
  'Typhoid': '#bcbd22',       // Yellow olive - Typhoid
  'Hepatitis': '#8c564b',     // Brown - Hepatitis
  'Tuberculosis': '#e7969c',  // Light red - TB
  'Other': '#7f7f7f',         // Gray - Other
  'Unknown': '#7f7f7f',       // Gray - Unknown
};

/** Disease names in Vietnamese */
export const DISEASE_LABELS_VI: Record<string, string> = {
  'Dengue': 'Sốt xuất huyết',
  'HFMD': 'Tay chân miệng',
  'Influenza': 'Cúm',
  'COVID-19': 'COVID-19',
  'Cholera': 'Dịch tả',
  'Measles': 'Sởi',
  'Malaria': 'Sốt rét',
  'Typhoid': 'Thương hàn',
  'Hepatitis': 'Viêm gan',
  'Tuberculosis': 'Lao phổi',
  'Other': 'Khác',
  'Unknown': 'Chưa xác định',
};

/** Disease names in English */
export const DISEASE_LABELS_EN: Record<string, string> = {
  'Dengue': 'Dengue Fever',
  'HFMD': 'Hand, Foot & Mouth Disease',
  'Influenza': 'Influenza',
  'COVID-19': 'COVID-19',
  'Cholera': 'Cholera',
  'Measles': 'Measles',
  'Malaria': 'Malaria',
  'Typhoid': 'Typhoid Fever',
  'Hepatitis': 'Hepatitis',
  'Tuberculosis': 'Tuberculosis',
  'Other': 'Other',
  'Unknown': 'Unknown',
};

// ============================================
// STATUS CONFIGURATION (BILINGUAL)
// ============================================

export const STATUS_OPTIONS = [
  'suspected',
  'probable', 
  'confirmed',
  'under observation',
  'under treatment',
  'recovered',
  'deceased'
] as const;

export type StatusType = typeof STATUS_OPTIONS[number];

/** Status colors - following epidemic tracking conventions */
export const STATUS_COLORS: Record<string, string> = {
  'suspected': '#ffd700',         // Yellow - Suspected
  'probable': '#ff7f0e',          // Orange - Probable
  'confirmed': '#d62728',         // Red - Confirmed (CRITICAL)
  'under treatment': '#9467bd',   // Purple - Under treatment
  'under observation': '#17becf', // Light blue - Under observation
  'recovered': '#2ca02c',         // Green - Recovered
  'deceased': '#1a1a1a',          // Black - Deceased
  'unknown': '#7f7f7f',           // Gray - Unknown
};

/** Status labels Vietnamese */
export const STATUS_LABELS_VI: Record<string, string> = {
  'suspected': 'Nghi ngờ',
  'probable': 'Có khả năng',
  'confirmed': 'Xác nhận',
  'under treatment': 'Đang điều trị',
  'under observation': 'Đang theo dõi',
  'recovered': 'Đã khỏi',
  'deceased': 'Tử vong',
  'unknown': 'Không rõ',
};

/** Status labels English */
export const STATUS_LABELS_EN: Record<string, string> = {
  'suspected': 'Suspected',
  'probable': 'Probable',
  'confirmed': 'Confirmed',
  'under treatment': 'Under Treatment',
  'under observation': 'Under Observation',
  'recovered': 'Recovered',
  'deceased': 'Deceased',
  'unknown': 'Unknown',
};

// ============================================
// SEVERITY CONFIGURATION (BILINGUAL)
// ============================================

export const SEVERITY_LEVELS = [
  { value: 1, label: 'Low', labelVi: 'Nhẹ', color: '#2ca02c', emoji: '🟢' },
  { value: 2, label: 'Medium', labelVi: 'Trung bình', color: '#ff7f0e', emoji: '🟠' },
  { value: 3, label: 'High', labelVi: 'Nặng', color: '#d62728', emoji: '🔴' },
] as const;

export const SEVERITY_COLORS: Record<number, string> = {
  1: '#2ca02c',  // Low - Green
  2: '#ff7f0e',  // Medium - Orange
  3: '#d62728',  // High - Red
};

export const SEVERITY_LABELS_VI: Record<number, string> = {
  1: 'Nhẹ',
  2: 'Trung bình',
  3: 'Nặng',
};

export const SEVERITY_LABELS_EN: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

// ============================================
// RISK LEVEL CONFIGURATION (For Grid Density)
// ============================================

export const RISK_LEVELS = [
  { level: 'low', threshold: 0, color: '#2ca02c', labelVi: 'Nguy cơ thấp', labelEn: 'Low Risk' },
  { level: 'medium', threshold: 0.3, color: '#ffff00', labelVi: 'Nguy cơ trung bình', labelEn: 'Medium Risk' },
  { level: 'high', threshold: 0.6, color: '#ff7f0e', labelVi: 'Nguy cơ cao', labelEn: 'High Risk' },
  { level: 'critical', threshold: 0.85, color: '#d62728', labelVi: 'Nguy cơ rất cao', labelEn: 'Critical Risk' },
] as const;

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get disease color
 */
export function getDiseaseColor(diseaseType: string): string {
  return DISEASE_COLORS[diseaseType] || DISEASE_COLORS['Other'];
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS['unknown'];
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: number): string {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS[1];
}

/**
 * Get severity label with language support
 */
export function getSeverityLabel(severity: number, lang: 'vi' | 'en' = 'en'): string {
  if (lang === 'vi') {
    return SEVERITY_LABELS_VI[severity] || 'Không rõ';
  }
  return SEVERITY_LABELS_EN[severity] || 'Unknown';
}

/**
 * Get disease label with language support
 */
export function getDiseaseLabel(diseaseType: string, lang: 'vi' | 'en' = 'en'): string {
  if (lang === 'vi') {
    return DISEASE_LABELS_VI[diseaseType] || diseaseType;
  }
  return DISEASE_LABELS_EN[diseaseType] || diseaseType;
}

/**
 * Get status label with language support
 */
export function getStatusLabel(status: string, lang: 'vi' | 'en' = 'en'): string {
  if (lang === 'vi') {
    return STATUS_LABELS_VI[status] || status;
  }
  return STATUS_LABELS_EN[status] || status;
}

/**
 * Get bilingual label (combines English and Vietnamese)
 */
export function getBilingualDiseaseLabel(diseaseType: string): string {
  const en = DISEASE_LABELS_EN[diseaseType] || diseaseType;
  const vi = DISEASE_LABELS_VI[diseaseType];
  return vi && vi !== en ? `${en} (${vi})` : en;
}

export function getBilingualStatusLabel(status: string): string {
  const en = STATUS_LABELS_EN[status] || status;
  const vi = STATUS_LABELS_VI[status];
  return vi && vi !== en ? `${en} (${vi})` : en;
}

export function getBilingualSeverityLabel(severity: number): string {
  const level = SEVERITY_LEVELS.find(s => s.value === severity);
  if (!level) return 'Unknown';
  return `${level.label} (${level.labelVi})`;
}

/**
 * Check if a case is active (for statistics)
 */
export function isActiveCase(status: string): boolean {
  return ['suspected', 'probable', 'confirmed', 'under treatment', 'under observation'].includes(status);
}

/**
 * Get severity display with emoji
 */
export function getSeverityDisplay(severity: number): { 
  label: string; 
  labelVi: string;
  emoji: string; 
  color: string;
} {
  const level = SEVERITY_LEVELS.find(s => s.value === severity);
  if (!level) {
    return { label: 'Unknown', labelVi: 'Không rõ', emoji: '⚪', color: '#7f7f7f' };
  }
  return {
    label: level.label,
    labelVi: level.labelVi,
    emoji: level.emoji,
    color: level.color,
  };
}

/**
 * Get risk level based on normalized score (0-1)
 */
export function getRiskLevel(normalizedScore: number): RiskLevel {
  if (normalizedScore >= 0.85) return 'critical';
  if (normalizedScore >= 0.6) return 'high';
  if (normalizedScore >= 0.3) return 'medium';
  return 'low';
}

/**
 * Get risk level color
 */
export function getRiskColor(level: RiskLevel): string {
  const config = RISK_LEVELS.find(r => r.level === level);
  return config?.color || '#7f7f7f';
}

/**
 * Calculate cluster severity based on aggregated cases
 * This provides proper severity calculation when cases are clustered
 */
export function calculateClusterSeverity(cases: { severity: number }[]): number {
  if (cases.length === 0) return 1;
  
  // Calculate weighted severity based on case count and individual severities
  const totalSeverity = cases.reduce((sum, c) => sum + c.severity, 0);
  const avgSeverity = totalSeverity / cases.length;
  
  // Factor in case count - more cases = higher risk
  const countFactor = Math.min(cases.length / 10, 1); // caps at 10 cases
  
  // Combined score: base severity + count bonus
  const combinedScore = avgSeverity + (countFactor * 1.5);
  
  // Return severity level (1-3)
  if (combinedScore >= 3.5) return 3; // High
  if (combinedScore >= 2) return 2;   // Medium
  return 1;                            // Low
}

/**
 * Format date range for display
 */
export function formatDateRange(from?: string, to?: string): string {
  if (!from && !to) return 'Tất cả thời gian';
  if (from && to) {
    return `${new Date(from).toLocaleDateString('vi-VN')} - ${new Date(to).toLocaleDateString('vi-VN')}`;
  }
  if (from) return `Từ ${new Date(from).toLocaleDateString('vi-VN')}`;
  return `Đến ${new Date(to!).toLocaleDateString('vi-VN')}`;
}

// ============================================
// HEALTH INFO TYPES
// ============================================

export type HealthInfoCategory = 
  | 'disease_prevention'
  | 'vaccination'
  | 'community_health'
  | 'medical_guidance'
  | 'news';

export type HealthInfoStatus = 'draft' | 'published' | 'archived';

export const HEALTH_INFO_CATEGORY_CONFIG: Record<HealthInfoCategory, {
  label: string;
  labelVi: string;
  icon: string;
  color: string;
}> = {
  disease_prevention: {
    label: 'Disease Prevention',
    labelVi: 'Phòng chống dịch bệnh',
    icon: '🦠',
    color: '#e53935',
  },
  vaccination: {
    label: 'Vaccination',
    labelVi: 'Tiêm chủng',
    icon: '💉',
    color: '#1e88e5',
  },
  community_health: {
    label: 'Community Health',
    labelVi: 'Sức khỏe cộng đồng',
    icon: '👨‍👩‍👧‍👦',
    color: '#43a047',
  },
  medical_guidance: {
    label: 'Medical Guidance',
    labelVi: 'Hướng dẫn y tế',
    icon: '📋',
    color: '#fb8c00',
  },
  news: {
    label: 'News',
    labelVi: 'Tin tức',
    icon: '📰',
    color: '#8e24aa',
  },
};

export const HEALTH_INFO_STATUS_CONFIG: Record<HealthInfoStatus, {
  label: string;
  labelVi: string;
  color: string;
  bgColor: string;
}> = {
  draft: {
    label: 'Draft',
    labelVi: 'Bản nháp',
    color: '#757575',
    bgColor: '#75757520',
  },
  published: {
    label: 'Published',
    labelVi: 'Đã xuất bản',
    color: '#4caf50',
    bgColor: '#4caf5020',
  },
  archived: {
    label: 'Archived',
    labelVi: 'Đã lưu trữ',
    color: '#ff9800',
    bgColor: '#ff980020',
  },
};

export interface HealthInfo {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: HealthInfoCategory;
  status: HealthInfoStatus;
  thumbnailUrl?: string;
  imageUrls?: string[];
  tags?: string[];
  viewCount: number;
  isFeatured: boolean;
  sourceUrl?: string;
  sourceName?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
  };
}

export interface HealthInfoFormData {
  title: string;
  content: string;
  summary?: string;
  category: HealthInfoCategory;
  thumbnailUrl?: string;
  imageUrls?: string[];
  tags?: string[];
  isFeatured?: boolean;
  sourceUrl?: string;
  sourceName?: string;
}

export interface HealthInfoListResponse {
  items: HealthInfo[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface HealthInfoStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  byCategory: Array<{
    category: HealthInfoCategory;
    count: number;
  }>;
}

// ============================================
// BASE MAP CONFIGURATIONS
// ============================================

export const BASE_MAP_CONFIGS: Record<BaseMapStyle, {
  url: string;
  attribution: string;
  name: string;
  nameVi: string;
}> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    name: 'OpenStreetMap',
    nameVi: 'Bản đồ mặc định',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: 'Dark Mode',
    nameVi: 'Chế độ tối',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: 'Light Mode',
    nameVi: 'Chế độ sáng',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    name: 'Satellite',
    nameVi: 'Vệ tinh',
  },
};

