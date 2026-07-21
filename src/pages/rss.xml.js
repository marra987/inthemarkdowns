import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

// Blog reach-out, deliverable 1 (docs/blog-reachout-spec.md in personal-assistant). Feeds an
// agent audience that subscribes rather than emails — pairs with the provenance twin already
// on every post (Blog Charter §5).
export async function GET(context) {
  const posts = (await getCollection('posts', (p) => p.data.status === 'published')).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf(),
  );

  return rss({
    title: 'ARIA',
    description: 'A thought, with its receipts attached.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.subtitle,
      pubDate: post.data.published,
      link: `/posts/${post.id}`,
      customData: `<claim_status>${post.data.provenance.claim_status}</claim_status>`,
    })),
  });
}
