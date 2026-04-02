import type { PatientInfo } from '@/types';

const DETAILS_START = '[SAFEZONE_PATIENT_INFO_JSON_START]';
const DETAILS_END = '[SAFEZONE_PATIENT_INFO_JSON_END]';

export interface ParsedPatientDetails {
  baseNotes: string;
  patientInfo?: PatientInfo;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hasDetailedPatientInfo(patientInfo?: PatientInfo | null): boolean {
  if (!patientInfo) return false;

  return Boolean(
    isNonEmptyString(patientInfo.fullName) ||
      typeof patientInfo.age === 'number' ||
      typeof patientInfo.yearOfBirth === 'number' ||
      isNonEmptyString(patientInfo.gender) ||
      isNonEmptyString(patientInfo.idNumber) ||
      isNonEmptyString(patientInfo.phone) ||
      isNonEmptyString(patientInfo.address) ||
      isNonEmptyString(patientInfo.occupation) ||
      isNonEmptyString(patientInfo.workplace) ||
      isNonEmptyString(patientInfo.symptomOnsetDate) ||
      isNonEmptyString(patientInfo.healthFacility) ||
      typeof patientInfo.isHospitalized === 'boolean' ||
      isNonEmptyString(patientInfo.travelHistory) ||
      isNonEmptyString(patientInfo.contactHistory) ||
      (Array.isArray(patientInfo.underlyingConditions) && patientInfo.underlyingConditions.length > 0),
  );
}

export function normalizePatientInfo(patientInfo?: PatientInfo | null): PatientInfo | undefined {
  if (!patientInfo) return undefined;

  const normalized: PatientInfo = {
    fullName: patientInfo.fullName?.trim() || undefined,
    age: typeof patientInfo.age === 'number' ? patientInfo.age : undefined,
    yearOfBirth: typeof patientInfo.yearOfBirth === 'number' ? patientInfo.yearOfBirth : undefined,
    gender: patientInfo.gender,
    idNumber: patientInfo.idNumber?.trim() || undefined,
    phone: patientInfo.phone?.trim() || undefined,
    address: patientInfo.address?.trim() || undefined,
    occupation: patientInfo.occupation?.trim() || undefined,
    workplace: patientInfo.workplace?.trim() || undefined,
    symptomOnsetDate: patientInfo.symptomOnsetDate || undefined,
    healthFacility: patientInfo.healthFacility?.trim() || undefined,
    isHospitalized: typeof patientInfo.isHospitalized === 'boolean' ? patientInfo.isHospitalized : undefined,
    travelHistory: patientInfo.travelHistory?.trim() || undefined,
    contactHistory: patientInfo.contactHistory?.trim() || undefined,
    underlyingConditions: Array.isArray(patientInfo.underlyingConditions)
      ? patientInfo.underlyingConditions.map((c) => c.trim()).filter(Boolean)
      : undefined,
  };

  return hasDetailedPatientInfo(normalized) ? normalized : undefined;
}

export function encodePatientDetailsInNotes(baseNotes?: string | null, patientInfo?: PatientInfo | null): string {
  const cleanBase = (baseNotes || '').trim();
  const normalizedPatientInfo = normalizePatientInfo(patientInfo);

  if (!normalizedPatientInfo) {
    return cleanBase;
  }

  const serialized = JSON.stringify(normalizedPatientInfo);
  if (!cleanBase) {
    return `${DETAILS_START}${serialized}${DETAILS_END}`;
  }

  return `${cleanBase}\n\n${DETAILS_START}${serialized}${DETAILS_END}`;
}

export function parsePatientDetailsFromNotes(rawNotes?: string | null): ParsedPatientDetails {
  const notes = rawNotes || '';
  const startIndex = notes.indexOf(DETAILS_START);
  const endIndex = notes.indexOf(DETAILS_END);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return { baseNotes: notes, patientInfo: undefined };
  }

  const jsonStart = startIndex + DETAILS_START.length;
  const serialized = notes.slice(jsonStart, endIndex).trim();
  const before = notes.slice(0, startIndex).trimEnd();
  const after = notes.slice(endIndex + DETAILS_END.length).trimStart();
  const baseNotes = [before, after].filter(Boolean).join('\n').trim();

  try {
    const parsed = JSON.parse(serialized) as PatientInfo;
    return {
      baseNotes,
      patientInfo: normalizePatientInfo(parsed),
    };
  } catch {
    return { baseNotes: notes, patientInfo: undefined };
  }
}
