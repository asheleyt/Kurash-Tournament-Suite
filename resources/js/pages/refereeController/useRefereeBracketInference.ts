/**
 * Kurash Tournament Suite
 *
 * File: useRefereeBracketInference.ts
 * Description: Infers bracket formats, round numbers, and stage labels used by
 * the referee controller queue and match displays.
 *
 * Part of the Kurash Tournament Suite desktop application.
 *
 * Copyright (c) 2026 Kurash Tournament Suite.
 * All rights reserved.
 */
import { computed, type Ref } from 'vue';

type UseRefereeBracketInferenceOptions = {
    allMatchesList: Ref<any[]>;
    getRemoteMatchId: (match: any) => number | string | null;
};

export function useRefereeBracketInference(
    options: UseRefereeBracketInferenceOptions,
) {
    const loggedBracketRingConflicts = new Set<string>();

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

    function getBracketKeyForMatch(m: any): string {
        if (!m || typeof m !== 'object') return '||';
        const age = (m?.age_category ?? m?.ageCategory ?? m?.age ?? '')
            .toString()
            .trim();
        const genderRaw = (
            m?.gender ??
            m?.gender_category ??
            m?.genderCategory ??
            ''
        )
            .toString()
            .trim();
        const g = genderRaw.toLowerCase();
        const gender =
            g === 'male' || g === 'm' || g === 'men' || g === 'mens'
                ? 'MEN'
                : g === 'female' ||
                    g === 'f' ||
                    g === 'women' ||
                    g === 'womens'
                  ? 'WOMEN'
                  : genderRaw.toUpperCase();
        const cat = (
            m?.category ??
            m?.weight_category ??
            m?.weightCategory ??
            m?.bracket_name ??
            ''
        )
            .toString()
            .trim();
        return `${age}|${gender}|${cat}`;
    }

    function getBracketIdText(m: any): string {
        const raw =
            m?.bracket_id ??
            m?.bracketId ??
            m?.category_id ??
            m?.categoryId ??
            m?.category?.id ??
            m?.bracket?.id ??
            null;

        if (raw === null || raw === undefined) return '';
        const text =
            typeof raw === 'object' && raw && 'id' in raw ? (raw as any).id : raw;
        return String(text).trim();
    }

    function getBracketGroupKey(m: any): string {
        const bid = getBracketIdText(m);
        if (bid) return `id:${bid}`;
        return `key:${getBracketKeyForMatch(m)}`;
    }

    function warnBracketRingConflicts(
        matches: any[],
        tournamentId: number | null,
    ) {
        try {
            const bracketRings = new Map<
                string,
                { rings: Set<string>; bracketId: string; bracketLabel: string }
            >();
            for (const m of matches || []) {
                if (!m || typeof m !== 'object') continue;
                const key = getBracketGroupKey(m);
                const ringText = getMatchRingText(m);
                if (!ringText) continue;
                const meta = bracketRings.get(key) || {
                    rings: new Set<string>(),
                    bracketId: getBracketIdText(m),
                    bracketLabel:
                        [
                            getAgeCategoryLabel(m),
                            getWeightCategoryLabel(m),
                        ]
                            .map((x) => (x || '').toString().trim())
                            .filter(Boolean)
                            .join(' ') || getBracketKeyForMatch(m),
                };
                meta.rings.add(ringText);
                bracketRings.set(key, meta);
            }

            for (const [key, meta] of bracketRings) {
                const rings = Array.from(meta.rings);
                if (rings.length <= 1) continue;
                const conflictKey = `${tournamentId || ''}|${meta.bracketId || key}`;
                if (loggedBracketRingConflicts.has(conflictKey)) continue;
                loggedBracketRingConflicts.add(conflictKey);
                console.warn(
                    'Bracket appears in multiple rings (admin contract violation):',
                    {
                        tournament_id: tournamentId,
                        bracket_id: meta.bracketId || null,
                        bracket_label: meta.bracketLabel || null,
                        rings,
                    },
                );
            }
        } catch {}
    }

    function getNextMatchIdText(m: any): string | null {
        const raw =
            m?.next_match_id ??
            m?.nextMatchId ??
            m?.next_match_remote_id ??
            m?.winner_to_match_id ??
            m?.winnerToMatchId ??
            null;
        if (raw === null || raw === undefined) return null;
        const s = String(raw).trim();
        return s ? s : null;
    }

    function getNumericRoundNumber(m: any): number | null {
        const rn = m?.round_number ?? m?.roundNumber ?? null;
        const asNum =
            rn != null && rn !== '' && !Number.isNaN(Number(rn))
                ? Number(rn)
                : null;
        if (asNum != null && Number.isFinite(asNum)) return Math.floor(asNum);

        const rr = (
            m?.round_display ??
            m?.roundDisplay ??
            m?.round_name ??
            m?.roundName ??
            m?.round ??
            ''
        )
            .toString()
            .trim();
        const m2 = rr.match(/round\s*(\d+)/i);
        if (m2) return Number(m2[1]);
        return null;
    }

    function stageLabelFromDistanceToFinal(distance: number): string {
        if (distance <= 0) return 'Finals';
        if (distance === 1) return 'Semi Finals';
        if (distance === 2) return 'Quarterfinals';
        const ro = 2 ** (distance + 1);
        if (ro === 16) return 'Round of 16';
        if (ro === 32) return 'Round of 32';
        if (ro === 64) return 'Round of 64';
        if (ro === 128) return 'Round of 128';
        return `Round of ${ro}`;
    }

    const inferredRoundMeta = computed(() => {
        const formatByBracketKey = new Map<
            string,
            'round_robin' | 'single_elimination'
        >();
        const stageByMatchId = new Map<string, string>();

        const groups = new Map<string, any[]>();
        for (const m of options.allMatchesList.value || []) {
            const key = getBracketGroupKey(m);
            const arr = groups.get(key);
            if (arr) arr.push(m);
            else groups.set(key, [m]);
        }

        for (const [key, group] of groups) {
            const hasAdvancement = group.some(
                (m: any) => !!getNextMatchIdText(m),
            );

            const roundCounts = new Map<number, number>();
            let maxRound = 0;
            for (const m of group) {
                const rn = getNumericRoundNumber(m);
                if (rn == null) continue;
                roundCounts.set(rn, (roundCounts.get(rn) || 0) + 1);
                if (rn > maxRound) maxRound = rn;
            }
            const rounds = Array.from(roundCounts.keys()).sort((a, b) => a - b);
            let decreases = 0;
            let increases = 0;
            for (let i = 0; i < rounds.length - 1; i++) {
                const a = roundCounts.get(rounds[i]) || 0;
                const b = roundCounts.get(rounds[i + 1]) || 0;
                if (b < a) decreases++;
                else if (b > a) increases++;
            }
            const lastRoundCount =
                maxRound > 0 ? roundCounts.get(maxRound) || 0 : 0;

            const looksElimByRounds =
                rounds.length >= 2 &&
                maxRound > 0 &&
                lastRoundCount > 0 &&
                lastRoundCount <= 2 &&
                increases === 0 &&
                decreases >= 1;

            const looksElimSmallBye =
                !looksElimByRounds &&
                rounds.length === 2 &&
                maxRound > 0 &&
                lastRoundCount === 1 &&
                increases === 0 &&
                group.length === 2;
            const looksElimSmallBronze =
                !looksElimByRounds &&
                rounds.length === 2 &&
                maxRound > 0 &&
                lastRoundCount === 2 &&
                increases === 0 &&
                group.length === 4;
            const looksElimSmallBracket =
                looksElimSmallBye || looksElimSmallBronze;

            const looksElimSingleMatch =
                !looksElimByRounds &&
                !looksElimSmallBracket &&
                rounds.length === 1 &&
                group.length === 1 &&
                lastRoundCount === 1;

            const inferredFormat: 'round_robin' | 'single_elimination' =
                hasAdvancement ||
                looksElimByRounds ||
                looksElimSmallBracket ||
                looksElimSingleMatch
                    ? 'single_elimination'
                    : 'round_robin';

            formatByBracketKey.set(key, inferredFormat);
            if (inferredFormat !== 'single_elimination') continue;

            if (!hasAdvancement) {
                for (const m of group) {
                    const id = options.getRemoteMatchId(m);
                    if (id == null) continue;
                    const idText = String(id).trim();
                    if (!idText) continue;

                    const rawRound = (
                        m?.round_name ??
                        m?.roundName ??
                        m?.round_display ??
                        m?.roundDisplay ??
                        m?.round ??
                        ''
                    )
                        .toString()
                        .trim();
                    if (/\bbronze\b/i.test(rawRound)) {
                        stageByMatchId.set(idText, 'Bronze');
                        continue;
                    }

                    const rnum = getNumericRoundNumber(m);
                    if (maxRound > 0 && rnum != null) {
                        stageByMatchId.set(
                            idText,
                            stageLabelFromDistanceToFinal(
                                Math.max(0, maxRound - rnum),
                            ),
                        );
                    } else {
                        stageByMatchId.set(
                            idText,
                            rawRound || (rnum != null ? `Round ${rnum}` : 'Round'),
                        );
                    }
                }
                continue;
            }

            const idToMatch = new Map<string, any>();
            const nextById = new Map<string, string>();
            const indegree = new Map<string, number>();

            for (const m of group) {
                const id = options.getRemoteMatchId(m);
                if (id == null) continue;
                const idText = String(id).trim();
                if (!idText) continue;
                idToMatch.set(idText, m);
                const nextText = getNextMatchIdText(m);
                if (nextText) {
                    nextById.set(idText, nextText);
                    indegree.set(nextText, (indegree.get(nextText) || 0) + 1);
                }
            }

            const terminalIds: string[] = [];
            for (const idText of idToMatch.keys()) {
                if (!nextById.has(idText)) terminalIds.push(idText);
            }

            const looksLikeFinal = (m: any) => {
                const raw = (
                    m?.round_name ??
                    m?.roundName ??
                    m?.round_display ??
                    m?.roundDisplay ??
                    m?.round ??
                    ''
                ).toString();
                return (
                    /\bfinals?\b/i.test(raw) &&
                    !/\bsemi\b/i.test(raw) &&
                    !/\bquarter\b/i.test(raw) &&
                    !/\bbronze\b/i.test(raw)
                );
            };

            let finalId: string | null = null;
            for (const tid of terminalIds) {
                const tm = idToMatch.get(tid);
                if (tm && looksLikeFinal(tm)) {
                    finalId = tid;
                    break;
                }
            }
            if (!finalId && terminalIds.length > 0) {
                let best = terminalIds[0];
                let bestIn = indegree.get(best) || 0;
                let bestOrder = Number(
                    idToMatch.get(best)?.match_number ??
                        idToMatch.get(best)?.global_match_order ??
                        NaN,
                );
                if (!Number.isFinite(bestOrder)) bestOrder = -1;
                for (const tid of terminalIds) {
                    const inD = indegree.get(tid) || 0;
                    let order = Number(
                        idToMatch.get(tid)?.match_number ??
                            idToMatch.get(tid)?.global_match_order ??
                            NaN,
                    );
                    if (!Number.isFinite(order)) order = -1;
                    if (inD > bestIn || (inD === bestIn && order > bestOrder)) {
                        best = tid;
                        bestIn = inD;
                        bestOrder = order;
                    }
                }
                finalId = best;
            }

            const distanceCache = new Map<string, number | null>();
            const distanceToFinal = (startId: string): number | null => {
                if (distanceCache.has(startId))
                    return distanceCache.get(startId) ?? null;
                if (!finalId) return null;
                let cur = startId;
                const visited = new Set<string>();
                let steps = 0;
                while (cur && !visited.has(cur)) {
                    visited.add(cur);
                    if (cur === finalId) {
                        distanceCache.set(startId, steps);
                        return steps;
                    }
                    const nxt = nextById.get(cur);
                    if (!nxt) break;
                    cur = nxt;
                    steps++;
                }
                distanceCache.set(startId, null);
                return null;
            };

            for (const [idText, m] of idToMatch) {
                const rawRound = (
                    m?.round_name ??
                    m?.roundName ??
                    m?.round_display ??
                    m?.roundDisplay ??
                    m?.round ??
                    ''
                )
                    .toString()
                    .trim();
                if (/\bbronze\b/i.test(rawRound)) {
                    stageByMatchId.set(idText, 'Bronze');
                    continue;
                }

                const d = distanceToFinal(idText);
                if (d != null) {
                    stageByMatchId.set(idText, stageLabelFromDistanceToFinal(d));
                    continue;
                }

                const rnum = getNumericRoundNumber(m);
                if (maxRound > 0 && rnum != null) {
                    stageByMatchId.set(
                        idText,
                        stageLabelFromDistanceToFinal(Math.max(0, maxRound - rnum)),
                    );
                } else {
                    stageByMatchId.set(
                        idText,
                        rnum != null ? `Round ${rnum}` : rawRound || 'Round',
                    );
                }
            }
        }

        return { formatByBracketKey, stageByMatchId };
    });

    function getInferredBracketFormat(
        m: any,
    ): 'round_robin' | 'single_elimination' | null {
        const key = getBracketGroupKey(m);
        return inferredRoundMeta.value.formatByBracketKey.get(key) ?? null;
    }

    function getInferredElimStageLabel(m: any): string | null {
        const id = options.getRemoteMatchId(m);
        if (id == null) return null;
        return inferredRoundMeta.value.stageByMatchId.get(String(id)) ?? null;
    }

    return {
        loggedBracketRingConflicts,
        getBracketKeyForMatch,
        getBracketIdText,
        getBracketGroupKey,
        warnBracketRingConflicts,
        getNumericRoundNumber,
        getInferredBracketFormat,
        getInferredElimStageLabel,
    };
}
