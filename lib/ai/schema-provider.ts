/**
 * AI Query Schema Provider
 *
 * Zod validation schema for AI-generated MongoDB pipelines,
 * plus date utility functions.
 */

import { z } from 'zod';
import { QUERYABLE_COLLECTIONS } from './generated/schema-catalog';

export const MongoPipelineSchema = z.object({
    pipeline: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe(
            'Array de etapas de agregación MongoDB. Solo permitido: $match, $lookup, $unwind, $group, $sort, $project, $limit, $skip, $addFields, $filter. PROHIBIDO: $out, $merge.'
        ),
    collection: z
        .enum(QUERYABLE_COLLECTIONS as unknown as readonly [string, ...string[]])
        .describe('La colección principal sobre la que ejecutar la query.'),
    explanation: z
        .string()
        .describe(
            'Explicación clara y concisa en español de qué hace la query y qué resultados espera el usuario.'
        ),
    suggestedVisualization: z
        .enum(['table', 'bar-chart', 'line-chart', 'pie-chart', 'metric-card'])
        .describe(
            'El tipo de visualización más apropiada para los resultados.'
        ),
});

export type MongoPipelineResult = z.infer<typeof MongoPipelineSchema>;

export function getCurrentDateIso(): string {
    return new Date().toISOString().split('T')[0];
}

export function getDaysAgoIso(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
