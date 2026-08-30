import { useState, useEffect, useCallback } from 'react';
import { StrategyCanvas } from '../types';

export interface ContextPackage {
  id: string;
  tenantId: string;
  version: string;
  meta: {
    version: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    authorId: string;
    status: string;
  };
  strategy: {
    objective: string;
    objectivesList: any[];
    priorities: any[];
  };
  indicators: {
    metrics: any[];
  };
  risks: any[];
  confidence?: {
    overall?: number | null;
    dimensions?: Record<string, number>;
  } | null;
  createdAt: string;
}

export function usePersistence(tenantId: string) {
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getStorageKey = (type: 'canvas' | 'package') => `e3i_${type}_${tenantId}`;

  // Atomic load StrategyCanvas
  const loadStrategyCanvas = useCallback((): StrategyCanvas | null => {
    try {
      const data = localStorage.getItem(getStorageKey('canvas'));
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Erro ao carregar StrategyCanvas do localStorage:", e);
      return null;
    }
  }, [tenantId]);

  // Atomic save StrategyCanvas with timestamp & auto-save trigger
  const saveStrategyCanvas = useCallback((canvas: StrategyCanvas): boolean => {
    setIsSaving(true);
    try {
      const payload = {
        ...canvas,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(getStorageKey('canvas'), JSON.stringify(payload));
      setLastSaved(new Date().toLocaleTimeString('pt-BR'));
      setIsSaving(false);
      return true;
    } catch (e) {
      console.error("Erro ao salvar StrategyCanvas no localStorage:", e);
      setIsSaving(false);
      return false;
    }
  }, [tenantId]);

  // Atomic load ContextPackage
  const loadContextPackage = useCallback((): ContextPackage | null => {
    try {
      const data = localStorage.getItem(getStorageKey('package'));
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Erro ao carregar ContextPackage do localStorage:", e);
      return null;
    }
  }, [tenantId]);

  // Atomic save ContextPackage
  const saveContextPackage = useCallback((pkg: ContextPackage): boolean => {
    setIsSaving(true);
    try {
      const payload = {
        ...pkg,
        meta: {
          ...pkg.meta,
          updatedAt: new Date().toISOString()
        }
      };
      localStorage.setItem(getStorageKey('package'), JSON.stringify(payload));
      setLastSaved(new Date().toLocaleTimeString('pt-BR'));
      setIsSaving(false);
      return true;
    } catch (e) {
      console.error("Erro ao salvar ContextPackage no localStorage:", e);
      setIsSaving(false);
      return false;
    }
  }, [tenantId]);

  return {
    loadStrategyCanvas,
    saveStrategyCanvas,
    loadContextPackage,
    saveContextPackage,
    lastSaved,
    isSaving
  };
}
