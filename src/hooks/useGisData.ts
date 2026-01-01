'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Case, CaseFormData, CasesListResponse, Stats, DisplayMode } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL!;

export function useStats(filters: { diseaseType?: string; status?: string; from?: string; to?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (filters.diseaseType && filters.diseaseType !== 'ALL') sp.set('diseaseType', filters.diseaseType);
    if (filters.status && filters.status !== 'ALL') sp.set('status', filters.status);
    if (filters.from) sp.set('from', filters.from);
    if (filters.to) sp.set('to', filters.to);

    setLoading(true);
    fetch(`${API}/gis/stats?${sp.toString()}`)
      .then(r => r.json())
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters.diseaseType, filters.status, filters.from, filters.to]);

  return { stats, loading, error };
}

export function useCases(filters: { diseaseType?: string; status?: string; from?: string; to?: string }) {
  const [cases, setCases] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    const sp = new URLSearchParams();
    if (filters.diseaseType && filters.diseaseType !== 'ALL') sp.set('diseaseType', filters.diseaseType);
    if (filters.status && filters.status !== 'ALL') sp.set('status', filters.status);
    if (filters.from) sp.set('from', filters.from);
    if (filters.to) sp.set('to', filters.to);

    setLoading(true);
    fetch(`${API}/gis/cases?${sp.toString()}`)
      .then(r => r.json())
      .then(setCases)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters.diseaseType, filters.status, filters.from, filters.to]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { cases, loading, error, refetch };
}

export function useCasesList(filters: {
  diseaseType?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const [data, setData] = useState<CasesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    const sp = new URLSearchParams();
    if (filters.diseaseType && filters.diseaseType !== 'ALL') sp.set('diseaseType', filters.diseaseType);
    if (filters.status && filters.status !== 'ALL') sp.set('status', filters.status);
    if (filters.from) sp.set('from', filters.from);
    if (filters.to) sp.set('to', filters.to);
    if (filters.page) sp.set('page', String(filters.page));
    if (filters.limit) sp.set('limit', String(filters.limit));
    if (filters.search) sp.set('search', filters.search);

    setLoading(true);
    fetch(`${API}/gis/cases/list?${sp.toString()}`)
      .then(r => r.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters.diseaseType, filters.status, filters.from, filters.to, filters.page, filters.limit, filters.search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useRegions() {
  const [regions, setRegions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/gis/regions`)
      .then(r => r.json())
      .then(setRegions)
      .catch(err => console.error('Error loading regions:', err))
      .finally(() => setLoading(false));
  }, []);

  return { regions, loading };
}

export async function getCaseById(id: string): Promise<Case> {
  const res = await fetch(`${API}/gis/cases/${id}`);
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch case: ${res.status} ${errorText}`);
  }
  return res.json();
}

export async function createCase(data: CaseFormData): Promise<Case> {
  const res = await fetch(`${API}/gis/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to create case: ${res.status} ${errorText}`);
  }
  return res.json();
}

export async function updateCase(id: string, data: Partial<CaseFormData>): Promise<Case> {
  const res = await fetch(`${API}/gis/cases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to update case: ${res.status} ${errorText}`);
  }
  return res.json();
}

export async function deleteCase(id: string): Promise<void> {
  const res = await fetch(`${API}/gis/cases/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to delete case: ${res.status} ${errorText}`);
  }
}
