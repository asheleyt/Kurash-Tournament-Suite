/**
 * Kurash Tournament Suite
 *
 * File: useRefereeControllerQueuePreview.ts
 * Description: Builds queue preview state and local ring-match-order projection payloads
 * for the referee controller.
 *
 * Part of the Kurash Tournament Suite desktop application.
 *
 * Copyright (c) 2026 Kurash Tournament Suite.
 * All rights reserved.
 */
import { computed, type Ref } from 'vue';
import {
    buildDisplaySlots,
    type RingDisplayMatchSlot,
    type RingDisplayRole,
    type RingDisplaySlot,
    type RingQueueSource,
} from '@/composables/useRingDisplayQueue';

type ProjectionBranding = {
    teamName?: string;
    clubLogo?: string;
    clubCode?: string;
};

type UseRefereeControllerQueuePreviewOptions = {
    matchesList: Ref<any[]>;
    localStatusOverrides: Ref<Record<string, string>>;
    getRemoteMatchId: (match: any) => number | string | null;
    isLoadingMatches: Ref<boolean>;
    queueSourceMode: Ref<RingQueueSource | null>;
    isOnline: Ref<boolean>;
    controllerSnapshotVersion: Ref<string | null>;
    upstreamQueueVersion: Ref<string | null>;
    controllerGeneratedAt: Ref<string | null>;
    upstreamGeneratedAt: Ref<string | null>;
    selectedTournamentId: Ref<number | null>;
    selectedRing: Ref<string>;
    activeAssignmentSnapshotId: Ref<number | string | null>;
    getBracketGroupKey: (match: any) => string;
    getAgeCategoryLabel: (match: any) => string;
    getWeightCategoryLabel: (match: any) => string;
    syncHasServer: Ref<boolean>;
    syncHasTournament: Ref<boolean>;
    syncHasRing: Ref<boolean>;
    queueIsDegraded: Ref<boolean>;
    currentMatchId: Ref<number | string | null>;
    teamLogoMap: Ref<Record<string, string>>;
    teamCodeMap: Ref<Record<string, string>>;
    extractMatchSideBranding: (
        match: any,
        side: 'player1' | 'player2',
    ) => ProjectionBranding;
};

function firstNonEmptyString(...values: unknown[]) {
    for (const value of values) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }

    return '';
}

function getRingMatchOrderProjectionSlotLabel(
    role: RingDisplayRole,
    index: number,
) {
    if (role === 'ON_MAT') return 'On Mat';
    if (role === 'ON_DECK') return 'Next';
    return `Queue ${Math.max(1, index - 1)}`;
}

function buildLocalRingMatchOrderProjectionParticipant(
    match: any,
    side: 'player1' | 'player2',
    options: Pick<
        UseRefereeControllerQueuePreviewOptions,
        'teamLogoMap' | 'teamCodeMap' | 'extractMatchSideBranding'
    >,
) {
    const isPlayerOne = side === 'player1';
    const participant = isPlayerOne
        ? (match?.player_one ?? match?.player_green ?? match?.player_left ?? {})
        : (match?.player_two ??
          match?.player_blue ??
          match?.player_right ??
          {});
    const candidate =
        participant && typeof participant === 'object'
            ? { ...(participant as Record<string, unknown>) }
            : ({} as Record<string, unknown>);

    const branding = options.extractMatchSideBranding(match, side);
    const teamName = firstNonEmptyString(
        branding.teamName,
        candidate.club,
        candidate.team_name,
        candidate.teamName,
        candidate.club_name,
        candidate.clubName,
    );
    const clubLogo = firstNonEmptyString(
        branding.clubLogo,
        teamName ? options.teamLogoMap.value[teamName] : '',
        candidate.club_logo_url,
        candidate.clubLogoUrl,
        candidate.logo_url,
        candidate.logoUrl,
        candidate.club_logo_path,
        candidate.clubLogoPath,
    );
    const clubCode = firstNonEmptyString(
        branding.clubCode,
        teamName ? options.teamCodeMap.value[teamName] : '',
        candidate.club_code,
        candidate.clubCode,
        candidate.code,
    )
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 4);
    const countryCode = firstNonEmptyString(
        candidate.country_code,
        candidate.countryCode,
        isPlayerOne
            ? (match?.player_one_country_code ??
                  match?.player1_country_code ??
                  match?.player_green_country_code ??
                  match?.player_left_country_code ??
                  match?.player_red_country_code)
            : (match?.player_two_country_code ??
                  match?.player2_country_code ??
                  match?.player_blue_country_code ??
                  match?.player_right_country_code),
    );

    return {
        ...candidate,
        club: teamName || firstNonEmptyString(candidate.club) || null,
        club_code:
            clubCode ||
            firstNonEmptyString(
                candidate.club_code,
                candidate.clubCode,
                candidate.code,
            ) ||
            null,
        club_logo_url: clubLogo || null,
        country_code: countryCode || null,
    };
}

export function useRefereeControllerQueuePreview(
    options: UseRefereeControllerQueuePreviewOptions,
) {
    const matchesListForSlots = computed(() => {
        const overrides = options.localStatusOverrides.value || {};
        const keys = Object.keys(overrides);
        if (!keys.length) return options.matchesList.value;

        return (options.matchesList.value || []).map((match: any) => {
            const id = options.getRemoteMatchId(match);
            if (id == null) return match;

            const status = overrides[String(id)];
            if (!status) return match;
            return { ...match, status };
        });
    });

    const displaySlots = computed<RingDisplaySlot[]>(() =>
        buildDisplaySlots(matchesListForSlots.value, {
            limit: 5,
            isLoading: options.isLoadingMatches.value,
            source: options.queueSourceMode.value,
            isOnline: options.isOnline.value,
        }),
    );

    function isRingDisplayMatchSlot(
        slot: RingDisplaySlot,
    ): slot is RingDisplayMatchSlot {
        return slot.type === 'match';
    }

    const previewMatchSlots = computed<RingDisplayMatchSlot[]>(() =>
        displaySlots.value.filter(isRingDisplayMatchSlot),
    );

    function buildLocalRingMatchOrderProjectionPayload() {
        const items = displaySlots.value.reduce<Record<string, unknown>[]>(
            (list, slot, index) => {
                if (
                    slot.type !== 'match' ||
                    !slot.row ||
                    typeof slot.row !== 'object'
                ) {
                    return list;
                }

                const label = getRingMatchOrderProjectionSlotLabel(
                    slot.role,
                    index,
                );
                const row = slot.row as Record<string, unknown>;
                const playerOne = buildLocalRingMatchOrderProjectionParticipant(
                    row,
                    'player1',
                    options,
                );
                const playerTwo = buildLocalRingMatchOrderProjectionParticipant(
                    row,
                    'player2',
                    options,
                );

                list.push({
                    ...row,
                    player_one: playerOne,
                    player_two: playerTwo,
                    player_one_club_logo_url: playerOne.club_logo_url ?? null,
                    player_two_club_logo_url: playerTwo.club_logo_url ?? null,
                    player_one_club_code: playerOne.club_code ?? null,
                    player_two_club_code: playerTwo.club_code ?? null,
                    player_one_country_code: playerOne.country_code ?? null,
                    player_two_country_code: playerTwo.country_code ?? null,
                    player_one_club: playerOne.club ?? null,
                    player_two_club: playerTwo.club ?? null,
                    role: label,
                    slot_role: slot.role,
                    slotRole: slot.role,
                    slot_label: label,
                    slotLabel: label,
                    position_label: label,
                    positionLabel: label,
                    slot_index: index,
                    source: 'controller_local_queue_snapshot',
                    source_mode: options.queueSourceMode.value ?? null,
                    queue_version:
                        options.controllerSnapshotVersion.value ??
                        options.upstreamQueueVersion.value ??
                        null,
                    generated_at:
                        options.controllerGeneratedAt.value ??
                        options.upstreamGeneratedAt.value ??
                        null,
                });
                return list;
            },
            [],
        );

        if (!items.length) return null;

        return {
            success: true,
            items,
            source: 'controller_local_queue_snapshot',
            source_mode: options.queueSourceMode.value ?? null,
            queue_version:
                options.controllerSnapshotVersion.value ??
                options.upstreamQueueVersion.value ??
                null,
            generated_at:
                options.controllerGeneratedAt.value ??
                options.upstreamGeneratedAt.value ??
                null,
            tournament_id: options.selectedTournamentId.value ?? null,
            ring: (options.selectedRing.value || '').toString().trim() || null,
            snapshot_id: options.activeAssignmentSnapshotId.value ?? null,
        } satisfies Record<string, unknown>;
    }

    const selectedRingBracketLabels = computed(() => {
        const seen = new Set<string>();
        const list: { key: string; label: string }[] = [];

        for (const match of options.matchesList.value || []) {
            const key = options.getBracketGroupKey(match);
            if (seen.has(key)) continue;
            seen.add(key);

            const label =
                [
                    options.getAgeCategoryLabel(match),
                    options.getWeightCategoryLabel(match),
                ]
                    .map((value) => (value || '').toString().trim())
                    .filter(Boolean)
                    .join(' ') || 'Bracket';
            list.push({ key, label });
        }

        list.sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { numeric: true }),
        );
        return list;
    });

    const syncQueueEmptyState = computed(() => {
        if (options.isLoadingMatches.value) {
            return {
                title: 'Checking this gilam queue snapshot.',
                message:
                    'Matches will appear here as soon as the latest queue is ready.',
            };
        }

        if (!options.syncHasServer.value) {
            return {
                title: 'Add the Event Host address to begin.',
                message:
                    'The queue snapshot will appear after the Event Host source is set.',
            };
        }

        if (!options.syncHasTournament.value || !options.syncHasRing.value) {
            return {
                title: 'Choose tournament to continue recovery.',
                message:
                    'This preview stays empty until the controller has temporary recovery values for tournament and gilam.',
            };
        }

        if (options.queueIsDegraded.value) {
            return {
                title: 'No queue items are ready right now.',
                message:
                    options.currentMatchId.value == null
                        ? 'The last bout is complete. Waiting for the next usable match from the saved queue snapshot.'
                        : 'The controller is waiting for the next usable match from the selected source.',
            };
        }

        return {
            title: 'No matches are waiting for this gilam.',
            message:
                'The preview will update automatically when the next match is available.',
        };
    });

    return {
        matchesListForSlots,
        displaySlots,
        previewMatchSlots,
        buildLocalRingMatchOrderProjectionPayload,
        selectedRingBracketLabels,
        syncQueueEmptyState,
    };
}
