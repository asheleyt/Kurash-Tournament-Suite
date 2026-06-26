/**
 * Kurash Tournament Suite
 *
 * File: refereeMatchLabelHelpers.ts
 * Description: Shared helper functions for resolving match label text
 * (age category, weight category, ring number) from match objects.
 *
 * Extracted from useRefereeBracketInference.ts and
 * useRefereeControllerQueueHelpers.ts to eliminate duplication.
 *
 * Part of the Kurash Tournament Suite desktop application.
 *
 * Copyright (c) 2026 Kurash Tournament Suite.
 * All rights reserved.
 */

export function getAgeCategoryLabel(m: any) {
    const v =
        m?.age_category ??
        m?.ageCategory ??
        m?.age ??
        m?.division ??
        m?.classification ??
        m?.bracket?.age_category ??
        '';
    return (v || '').toString().trim();
}

export function getWeightCategoryLabel(m: any) {
    const wc = m?.weight_category;
    if (typeof wc === 'string' && wc.trim()) return wc.trim();

    const cat = m?.category;
    if (typeof cat === 'string' && cat.trim()) return cat.trim();

    const nested = m?.bracket?.weight_category;
    return typeof nested === 'string' ? nested : '';
}

export function getMatchRingText(m: any): string {
    const raw =
        m?.ring_number ??
        m?.ring ??
        m?.mat ??
        m?.mat_number ??
        m?.matNumber ??
        m?.ringNumber ??
        m?.ring_no ??
        m?.ringNo ??
        null;

    if (raw === null || raw === undefined) return '';
    const text = String(raw).trim();
    if (!text) return '';

    const asNumber = Number(text);
    if (Number.isFinite(asNumber) && Math.floor(asNumber) === asNumber)
        return String(asNumber);
    return text;
}
