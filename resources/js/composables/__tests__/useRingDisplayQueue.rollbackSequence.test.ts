import { describe, expect, it } from 'vitest';
import { normalizeQueueRows } from '../useRingDisplayQueue';

describe('normalizeQueueRows rollback sequence', () => {
    it('preserves rollback_sequence and defaults missing legacy rows to 0', () => {
        const rows = normalizeQueueRows(
            [
                {
                    id: 1001,
                    player_one_name: 'Ali Green',
                    player_two_name: 'Bek Blue',
                    display_class: 'READY',
                    rollback_sequence: 4,
                },
                {
                    id: 1002,
                    player_one_name: 'Chen Green',
                    player_two_name: 'Dia Blue',
                    display_class: 'READY',
                    rollbackSequence: '7',
                },
                {
                    id: 1003,
                    player_one_name: 'Legacy Green',
                    player_two_name: 'Legacy Blue',
                    display_class: 'READY',
                },
            ],
            {
                queueVersion: 'queue-v7',
                generatedAt: '2026-05-20T10:00:00Z',
                source: 'queue_api',
            },
        );

        expect(rows.map((row) => row.rollback_sequence)).toEqual([4, 7, 0]);
        expect(rows.map((row) => row.rollbackSequence)).toEqual([4, 7, 0]);
        expect(rows[0].queue_version).toBe('queue-v7');
        expect(rows[1].generated_at).toBe('2026-05-20T10:00:00Z');
    });
});
