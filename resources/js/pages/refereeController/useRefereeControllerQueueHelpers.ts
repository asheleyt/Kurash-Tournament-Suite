/**
 * Kurash Tournament Suite
 *
 * File: useRefereeControllerQueueHelpers.ts
 * Description: Provides queue and match helper utilities used by the referee controller.
 * Normalizes labels, IDs, and bracket key helpers.
 *
 * Part of the Kurash Tournament Suite desktop application.
 *
 * Copyright (c) 2026 Kurash Tournament Suite.
 * All rights reserved.
 */
type UseRefereeControllerQueueHelpersOptions = {
    getInferredBracketFormat: (
        match: any,
    ) => 'round_robin' | 'single_elimination' | null;
    getInferredElimStageLabel: (match: any) => string | null;
    getNumericRoundNumber: (match: any) => number | null;
    getRemoteMatchId: (match: any) => number | string | null;
    buildLocalAutoLoadCandidateRows: () => any[];
    getEffectiveStatus: (match: any) => string;
};

export function useRefereeControllerQueueHelpers(
    options: UseRefereeControllerQueueHelpersOptions,
) {
    function getRoundDisplayText(m: any) {
        const empty = '\u2014';

        const normalizeStage = (s: string): string | null => {
            const t = (s || '').toString().trim();
            if (!t) return null;
            if (/\bbronze\b/i.test(t)) return 'Bronze';
            if (
                /\bfinals?\b/i.test(t) &&
                !/\bsemi\b/i.test(t) &&
                !/\bquarter\b/i.test(t)
            )
                return 'Finals';
            if (/\bsemi[- ]?finals?\b/i.test(t)) return 'Semi Finals';
            if (/\bquarter[- ]?finals?\b/i.test(t)) return 'Quarterfinals';
            if (/\bround of 16\b/i.test(t)) return 'Round of 16';
            if (/\bround of 32\b/i.test(t)) return 'Round of 32';
            if (/\bround of 64\b/i.test(t)) return 'Round of 64';
            if (/\bround of 128\b/i.test(t)) return 'Round of 128';
            return t;
        };

        const explicitFormat = (m?.bracket_format ?? m?.bracketFormat ?? '')
            .toString()
            .trim();
        const inferredFormat = options.getInferredBracketFormat(m);
        const format =
            explicitFormat === 'single_elimination' ||
            explicitFormat === 'round_robin'
                ? (explicitFormat as 'single_elimination' | 'round_robin')
                : inferredFormat;

        if (format === 'single_elimination') {
            const directStage = normalizeStage(
                (m?.stage_label ??
                    m?.stageLabel ??
                    m?._stageLabel ??
                    m?.round_name ??
                    m?.roundName ??
                    '') as string,
            );
            if (directStage) return directStage;

            const inferredStage = options.getInferredElimStageLabel(m);
            if (inferredStage) return inferredStage;

            const fromRoundText = normalizeStage(
                (m?.round_display ?? m?.roundDisplay ?? m?.round ?? '') as string,
            );
            if (fromRoundText) return fromRoundText;

            return empty;
        }

        if (format === 'round_robin') {
            const roundNum = options.getNumericRoundNumber(m);
            if (roundNum != null) return `Round ${roundNum}`;

            const rd = m?.round_display;
            if (typeof rd === 'string' && rd.trim()) return rd.trim();

            const rr = m?.round;
            if (typeof rr === 'string' && rr.trim()) return rr.trim();

            return empty;
        }

        const inferredStage = options.getInferredElimStageLabel(m);
        if (inferredStage) return inferredStage;

        const rd = m?.round_display;
        if (typeof rd === 'string' && rd.trim()) return rd.trim();

        const rr = m?.round;
        if (typeof rr === 'string' && rr.trim()) return rr.trim();

        return empty;
    }

    function getAgeCategoryLabel(m: any) {
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

    function getWeightCategoryLabel(m: any) {
        const wc = m?.weight_category;
        if (typeof wc === 'string' && wc.trim()) return wc.trim();

        const cat = m?.category;
        if (typeof cat === 'string' && cat.trim()) return cat.trim();

        const nested = m?.bracket?.weight_category;
        return typeof nested === 'string' ? nested : '';
    }

    function parseDivisionAndGenderFromLabel(label: string) {
        const s = (label || '').trim();
        if (!s) return { division: '', gender: 'N/A' };
        const parts = s.split(/\s+/);
        const last = parts[parts.length - 1];
        if (/^M$/i.test(last) || /^Male$/i.test(last)) {
            parts.pop();
            return { division: parts.join(' ').trim(), gender: 'Mens' };
        }
        if (/^F$/i.test(last) || /^Female$/i.test(last)) {
            parts.pop();
            return { division: parts.join(' ').trim(), gender: 'Women' };
        }
        return { division: s, gender: 'N/A' };
    }

    function getMatchRingText(m: any): string {
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

    function getFallbackRingText(m: any, idx: number, ringCount: number): string {
        if (!ringCount || ringCount <= 0) return '';
        const n = Number(
            m?.global_match_order ?? m?.match_number ?? m?.match_order ?? NaN,
        );
        const base = Number.isFinite(n) && n > 0 ? Math.floor(n) - 1 : idx;
        return String((base % ringCount) + 1);
    }

    function isMatchIdEqual(m: any, id: number | string | null) {
        if (id == null) return false;
        const mid = options.getRemoteMatchId(m);
        if (mid == null) return false;
        return String(mid) === String(id);
    }

    function getNextQueuedMatchId(
        rows: any[] = options.buildLocalAutoLoadCandidateRows(),
        excludeMatchId: number | string | null = null,
    ) {
        const next = (Array.isArray(rows) ? rows : []).find((m: any) => {
            if (excludeMatchId != null && isMatchIdEqual(m, excludeMatchId))
                return false;
            return options.getEffectiveStatus(m).toLowerCase() !== 'completed';
        });
        return next ? options.getRemoteMatchId(next) : null;
    }

    return {
        getRoundDisplayText,
        getAgeCategoryLabel,
        getWeightCategoryLabel,
        parseDivisionAndGenderFromLabel,
        getMatchRingText,
        getFallbackRingText,
        isMatchIdEqual,
        getNextQueuedMatchId,
    };
}
