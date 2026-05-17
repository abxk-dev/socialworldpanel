import React, { useEffect } from "react";
import { useSettings } from "../App";

function ensureMetaTag(selector, create) {
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = create();
    document.head.appendChild(tag);
  }
  return tag;
}

/**
 * Lightweight SEO injection (no react-helmet required).
 * Used by `HomePage` to ensure title + meta tags exist on first render.
 */
export default function SEO({ title, description, keywords, ogImage, ogTitle }) {
  const { settings } = useSettings();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const fallbackSeo = settings?.seo_meta || {};
    const finalTitle = title || fallbackSeo?.title || document.title;
    const finalDescription = description || fallbackSeo?.description || "";
    const finalKeywords = keywords || fallbackSeo?.keywords || "";
    const finalOgImage = ogImage || fallbackSeo?.og_image || "";
    const finalOgTitle = ogTitle || finalTitle;

    if (finalTitle) document.title = finalTitle;

    if (finalDescription) {
      const tag = ensureMetaTag("meta[name='description']", () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        return m;
      });
      tag.setAttribute("content", finalDescription);
    }

    if (finalKeywords) {
      const tag = ensureMetaTag("meta[name='keywords']", () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "keywords");
        return m;
      });
      tag.setAttribute("content", finalKeywords);
    }

    if (finalOgTitle) {
      const tag = ensureMetaTag("meta[property='og:title']", () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:title");
        return m;
      });
      tag.setAttribute("content", finalOgTitle);
    }

    if (finalDescription) {
      const tag = ensureMetaTag("meta[property='og:description']", () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:description");
        return m;
      });
      tag.setAttribute("content", finalDescription);
    }

    if (finalOgImage) {
      const tag = ensureMetaTag("meta[property='og:image']", () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:image");
        return m;
      });
      tag.setAttribute("content", finalOgImage);
    }
  }, [title, description, keywords, ogImage, ogTitle, settings]);

  return null;
}

