import { useEffect } from 'react';

interface SEOOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogImage?: string;
}

/**
 * Hook to dynamically update document <head> meta tags for SEO.
 * Updates title, description, canonical, and Open Graph tags.
 */
export function useSEO(options: SEOOptions) {
  useEffect(() => {
    // Update document title
    document.title = options.title;

    // Helper to update or create a meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Update description
    if (options.description) {
      setMeta('name', 'description', options.description);
    }

    // Update canonical link
    if (options.canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', options.canonical);
    }

    // Update Open Graph tags
    if (options.ogTitle) {
      setMeta('property', 'og:title', options.ogTitle);
    }
    if (options.ogDescription) {
      setMeta('property', 'og:description', options.ogDescription);
    }
    if (options.ogType) {
      setMeta('property', 'og:type', options.ogType);
    }
    if (options.ogImage) {
      setMeta('property', 'og:image', options.ogImage);
    }

    // Update Twitter Card tags
    if (options.ogTitle) {
      setMeta('name', 'twitter:title', options.ogTitle);
    }
    if (options.ogDescription) {
      setMeta('name', 'twitter:description', options.ogDescription);
    }
  }, [options.title, options.description, options.canonical, options.ogTitle, options.ogDescription, options.ogType, options.ogImage]);
}
