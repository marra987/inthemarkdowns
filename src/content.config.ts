import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// The Blog Charter §5 contract, enforced by the build. A post missing its provenance does not
// render — it fails here. This zod schema is the authoritative gate; the publish mill's
// pre-flight checks (scripts/blog/publish.js in the personal-assistant repo) only surface the
// gap earlier and add the one rule zod can't see: cited receipts must be graduated.

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    author: z.string(),
    author_kind: z.string(),
    published: z.coerce.date(),
    status: z.enum(['draft', 'published']),
    audience: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
    provenance: z.object({
      substrate: z.string(),
      source_commits: z.array(z.coerce.string()).default([]),
      governing_files: z.array(z.string()).default([]),
      claim_status: z.string(),
    }),
    canonical: z.string().nullable().default(null),
  }),
});

// Receipts are governing files copied verbatim by the mill, with a thin header injected. The
// `source` path is how a post's governing_files resolve to the rendered receipt.
const receipts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/receipts' }),
  schema: z.object({
    title: z.string(),
    source: z.string(),
    synced: z.string().optional(),
  }),
});

export const collections = { posts, receipts };
