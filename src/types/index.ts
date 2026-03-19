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
// REPORT WORKFLOW TYPES (6-stage verification)
// ============================================

/** Report status - multi-step verification workflow */
export type ReportStatus = 
  | 'submitted'           // Đã gửi - Just submitted
  | 'under_review'        // Đang xem xét - Preliminary review
  | 'field_verification'  // Kiểm tra thực địa - Needs field check
  | 'confirmed'           // Đã xác nhận - Officially confirmed
  | 'rejected'            // Từ chối - Rejected
  | 'closed'              // Đã đóng - Closed/processed
  // Backward compat
  | 'pending'
  | 'verified'
  | 'resolved';

export type ReportType = 'case_report' | 'outbreak_alert';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type PreliminaryResult = 'valid' | 'need_field_check' | 'invalid';
export type FieldVerificationResult = 'confirmed_suspected' | 'not_disease';
export type OfficialClassification = 'suspected' | 'probable' | 'confirmed' | 'false_alarm';
export type ClosureAction = 'monitoring' | 'isolation' | 'area_warning' | 'no_action';

/** Verification status by field team */
export type VerificationStatus = 
  | 'unverified'    // Chưa xác thực - Not verified
  | 'verifying'     // Đang xác thực - Being verified
  | 'verified'      // Đã xác thực - Verified
  | 'invalid';      // Không hợp lệ - Invalid

export const REPORT_STATUS_CONFIG: Record<string, { 
  label: string; 
  labelVi: string; 
  color: string; 
  icon: string;
  bgColor: string;
}> = {
  submitted: { label: 'Submitted', labelVi: 'Đã gửi', color: '#9e9e9e', icon: '📝', bgColor: '#9e9e9e20' },
  under_review: { label: 'Under Review', labelVi: 'Đang xem xét', color: '#2196f3', icon: '🔍', bgColor: '#2196f320' },
  field_verification: { label: 'Field Check', labelVi: 'Kiểm tra thực địa', color: '#ff9800', icon: '🏥', bgColor: '#ff980020' },
  confirmed: { label: 'Confirmed', labelVi: 'Đã xác nhận', color: '#4caf50', icon: '✅', bgColor: '#4caf5020' },
  rejected: { label: 'Rejected', labelVi: 'Từ chối', color: '#f44336', icon: '❌', bgColor: '#f4433620' },
  closed: { label: 'Closed', labelVi: 'Đã đóng', color: '#607d8b', icon: '📁', bgColor: '#607d8b20' },
  // Backward compat
  pending: { label: 'Pending', labelVi: 'Chờ duyệt', color: '#ff9800', icon: '⏳', bgColor: '#ff980020' },
  verified: { label: 'Verified', labelVi: 'Đã xác minh', color: '#4caf50', icon: '✓', bgColor: '#4caf5020' },
  resolved: { label: 'Resolved', labelVi: 'Đã giải quyết', color: '#607d8b', icon: '✔', bgColor: '#607d8b20' },
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
  yearOfBirth?: number;
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

/** Report from mobile app - 6-stage workflow */
export interface Report {
  id: string;
  userId: string;
  user?: User;
  
  // Report type
  reportType: ReportType;
  severityLevel: SeverityLevel;
  isDetailedReport: boolean;
  isSelfReport: boolean;
  reporterName?: string;
  reporterPhone?: string;
  
  // Location (GeoJSON)
  location?: { type: string; coordinates: [number, number] };
  reporterLocation?: { type: string; coordinates: [number, number] };
  address?: string;
  
  // Report content
  diseaseType: string;
  description: string;
  symptoms?: string[];
  affectedCount?: number;
  imageUrls?: string[];
  patientInfo?: PatientInfo;
  
  // Epidemiological info
  hasContactWithPatient?: boolean;
  hasVisitedEpidemicArea?: boolean;
  hasSimilarCasesNearby?: boolean;
  estimatedNearbyCount?: number;
  
  // Medical info
  hasVisitedDoctor?: boolean;
  hasTestResult?: boolean;
  testResultDescription?: string;
  testResultImageUrls?: string[];
  medicalCertImageUrls?: string[];
  
  // Outbreak fields
  locationDescription?: string;
  locationType?: string;
  suspectedDisease?: string;
  outbreakDescription?: string;
  discoveryTime?: string;
  
  // Status
  status: ReportStatus;
  adminNote?: string;
  
  // Submission tracking
  userSubmissionCount?: number; // Number of times user submitted reports for this disease
  
  // Multi-step verification tracking
  autoVerifiedAt?: string;
  autoVerificationResult?: Record<string, unknown>;
  
  preliminaryReviewBy?: string;
  preliminaryReviewAt?: string;
  preliminaryReviewResult?: PreliminaryResult;
  preliminaryReviewNote?: string;
  
  fieldVerifierId?: string;
  fieldVerifiedAt?: string;
  fieldVerificationResult?: FieldVerificationResult;
  fieldVerificationNote?: string;
  
  officialConfirmBy?: string;
  officialConfirmAt?: string;
  officialClassification?: OfficialClassification;
  officialConfirmNote?: string;
  
  closedAt?: string;
  closedBy?: string;
  closureAction?: ClosureAction;
  closureNote?: string;
  
  // Legacy
  verifiedAt?: string;
  verifiedBy?: string;
  
  reporterConsent?: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ReportListResponse {
  data: Report[];
  total: number;
  page: number;
  limit: number;
}

/** Status history entry */
export interface ReportStatusHistory {
  id: string;
  reportId: string;
  previousStatus: string | null;
  newStatus: string;
  changedBy?: string;
  changedByRole?: string;
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** Preliminary review by local health authority */
export interface PreliminaryReviewPayload {
  result: PreliminaryResult;
  note?: string;
}

/** Field verification payload */
export interface FieldVerificationPayload {
  result: FieldVerificationResult;
  note?: string;
}

/** Official confirmation payload */
export interface OfficialConfirmationPayload {
  classification: OfficialClassification;
  note?: string;
  createCase?: boolean;
}

/** Close report payload */
export interface CloseReportPayload {
  action: ClosureAction;
  note?: string;
}

/** Legacy review payload (backward compat) */
export interface ReportReviewPayload {
  status: ReportStatus;
  adminNote?: string;
  createCase?: boolean;
}

// Helper functions for reports
export function getReportStatusConfig(status: string) {
  return REPORT_STATUS_CONFIG[status] || REPORT_STATUS_CONFIG.submitted;
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
  role: 'user' | 'health_authority' | 'admin';
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  gender?: string;
  dateOfBirth?: string;
  citizenId?: string;
  fullAddress?: string;
  province?: string;
  district?: string;
  ward?: string;
  organizationName?: string;
  organizationLevel?: string;
  organizationAddress?: string;
  reputationScore?: number;
  isBlacklisted?: boolean;
  consentGiven?: boolean;
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
  | 'heatmap';

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
  if (DISEASE_COLORS[diseaseType]) {
    return DISEASE_COLORS[diseaseType];
  }

  const key = (diseaseType || 'Other').trim();
  if (!key) {
    return DISEASE_COLORS['Other'];
  }

  const fallbackPalette = [
    '#0ea5e9',
    '#22c55e',
    '#f97316',
    '#ef4444',
    '#06b6d4',
    '#eab308',
    '#14b8a6',
    '#ec4899',
    '#6366f1',
  ];

  const hash = key
    .toLowerCase()
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  return fallbackPalette[hash % fallbackPalette.length];
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

export type HealthInfoDiseaseType = 'dengue' | 'covid' | 'flu' | 'general';
export type HealthInfoTarget = 'general' | 'children' | 'elderly' | 'pregnant';
export type HealthInfoSeverity = 'low' | 'medium' | 'high' | 'emergency';

export type HealthInfoStatus = 'draft' | 'reviewed' | 'published' | 'archived';

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
  reviewed: {
    label: 'Reviewed',
    labelVi: 'Đã duyệt',
    color: '#1e88e5',
    bgColor: '#1e88e520',
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
  diseaseType?: HealthInfoDiseaseType;
  target?: HealthInfoTarget;
  severityLevel?: HealthInfoSeverity;
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
  diseaseType?: HealthInfoDiseaseType;
  target?: HealthInfoTarget;
  severityLevel?: HealthInfoSeverity;
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

