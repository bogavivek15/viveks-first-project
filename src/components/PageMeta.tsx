import { Helmet } from 'react-helmet-async';

interface PageMetaProps {
  title: string;
  description?: string;
  path?: string;
}

const BASE_URL = 'https://studentdesk.vercel.app';
const SITE_NAME = 'STUDENT DESK';

/**
 * Sets per-page <title>, meta description, and canonical URL.
 * Wrap every page with this for proper SEO.
 */
export const PageMeta = ({ title, description, path }: PageMetaProps) => {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonicalUrl = path ? `${BASE_URL}${path}` : undefined;
  const desc = description || 'Access quality B-Tech notes for all branches, years, and subjects.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
    </Helmet>
  );
};
