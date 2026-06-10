import type { Metadata } from "next";

const BASE_URL = "https://instra.app";
const SITE_NAME = "Instra";

/**
 * Builds a full Metadata object with opinionated defaults.
 * @param overrides - Partial metadata fields to merge on top of defaults.
 * @returns Next.js Metadata object ready for `export const metadata`.
 * @example
 * export const metadata = buildMetadata(pageMetadata.about);
 */
export function buildMetadata(overrides: Partial<Metadata> & { slug?: string }): Metadata {
  const { slug, ...rest } = overrides;
  const canonical = slug ? `${BASE_URL}/${slug}` : BASE_URL;

  return {
    metadataBase: new URL(BASE_URL),
    applicationName: SITE_NAME,
    authors: [{ name: "Instra Team", url: BASE_URL }],
    creator: "Instra",
    publisher: "Instra",
    formatDetection: { email: false, telephone: false },
    alternates: {
      canonical,
      languages: {
        "en": `${canonical}?lang=en`,
        "pl": `${canonical}?lang=pl`,
      },
    },
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      url: canonical,
      ...(rest.openGraph ?? {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(rest.twitter ?? {}),
    },
    ...rest,
  };
}

/**
 * Per-page metadata definitions. Import the one you need:
 * @example
 * import { pageMetadata } from "@/lib/seo/metadata";
 * export const metadata = buildMetadata(pageMetadata.about);
 */
export const pageMetadata = {
  home: {
    slug: "",
    title: `${SITE_NAME} — Your Marketing Companion`,
    description:
      "Instra is an AI-powered marketing intelligence platform for founders and growth teams. Launch smarter campaigns, measure real impact, and scale faster.",
    openGraph: {
      title: `${SITE_NAME} — Your Marketing Companion`,
      description:
        "AI-powered marketing intelligence platform for founders and growth teams.",
    },
    twitter: {
      title: `${SITE_NAME} — Your Marketing Companion`,
      description:
        "AI-powered marketing intelligence platform for founders and growth teams.",
    },
  },

  about: {
    slug: "about",
    title: `About Instra — Marketing Intelligence Built for Operators`,
    description:
      "Learn who we are, what drives us, and why 500K+ businesses trust Instra to power their marketing operations at scale.",
    openGraph: {
      title: "About Instra — Marketing Intelligence Built for Operators",
      description:
        "500K+ businesses trust Instra. Learn our story, philosophy, and the team behind the platform.",
    },
    twitter: {
      title: "About Instra — Marketing Intelligence Built for Operators",
      description:
        "500K+ businesses trust Instra. Learn our story, philosophy, and the team behind the platform.",
    },
  },

  features: {
    slug: "features",
    title: `Instra Features — AI Marketing Tools That Work`,
    description:
      "Explore Instra's full feature set: AI campaign builder, analytics, audience intelligence, automation, and integrations — all in one platform.",
    openGraph: {
      title: "Instra Features — AI Marketing Tools That Work",
      description:
        "AI campaign builder, analytics, audience intelligence, automation, and integrations — all in one platform.",
    },
    twitter: {
      title: "Instra Features — AI Marketing Tools That Work",
      description:
        "AI campaign builder, analytics, audience intelligence, automation, and integrations.",
    },
  },

  usecases: {
    slug: "usecases",
    title: `Instra Use Cases — How Teams Use Instra to Grow`,
    description:
      "See how founders, growth operators, and marketing teams use Instra to launch campaigns, track performance, and scale their brands.",
    openGraph: {
      title: "Instra Use Cases — How Teams Use Instra to Grow",
      description:
        "How founders, growth operators, and marketing teams use Instra to scale their brands.",
    },
    twitter: {
      title: "Instra Use Cases — How Teams Use Instra to Grow",
      description:
        "How founders, growth operators, and marketing teams use Instra to scale.",
    },
  },

  docs: {
    slug: "docs",
    title: `Instra Documentation — Technical Reference`,
    description:
      "Instra technical documentation: auth, database, i18n, architecture, plugin system, and API reference.",
    robots: { index: true, follow: true },
    openGraph: {
      title: "Instra Documentation — Technical Reference",
      description:
        "Auth, database, i18n, architecture, plugin system, and API reference.",
    },
    twitter: {
      title: "Instra Documentation — Technical Reference",
      description: "Auth, database, i18n, architecture, plugin system, and API reference.",
    },
  },

  /** Auth pages — excluded from search engine indexing */
  signin: {
    slug: "signin",
    title: `Sign In — Instra`,
    description: "Sign in to your Instra account.",
    robots: { index: false, follow: false },
  },

  signup: {
    slug: "signup",
    title: `Sign Up — Instra`,
    description: "Create your Instra account and start for free.",
    robots: { index: false, follow: false },
  },

  forgotPassword: {
    slug: "forgot-password",
    title: `Reset Password — Instra`,
    description: "Reset your Instra account password.",
    robots: { index: false, follow: false },
  },

  resetPassword: {
    slug: "reset-password",
    title: `Set New Password — Instra`,
    description: "Set a new password for your Instra account.",
    robots: { index: false, follow: false },
  },

  verifyEmail: {
    slug: "verify-email",
    title: `Verify Your Email — Instra`,
    description: "Enter the 6-digit code we sent to your email address to complete your Instra registration.",
    robots: { index: false, follow: false },
  },
} as const;
