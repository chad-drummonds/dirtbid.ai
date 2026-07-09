import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DirtBid AI — Bid Like a Pro. Win More Work." },
      {
        name: "description",
        content:
          "DirtBid AI automates soil mechanics, structural math, and dynamic cost indexing so excavation contractors can generate accurate, professional bids in minutes.",
      },
      {
        name: "keywords",
        content:
          "excavation bidding, construction estimating, soil mechanics, contractor software, bid calculator",
      },
      // Open Graph
      { property: "og:title", content: "DirtBid AI — Bid Like a Pro. Win More Work." },
      {
        property: "og:description",
        content:
          "Generate accurate excavation bids in minutes — from the cab of your truck, with or without internet.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-600">The page you're looking for doesn't exist.</p>
        <a href="/" className="mt-4 inline-block text-amber-600 underline">
          Go home
        </a>
      </div>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <HeadContent />
      </head>
      <body className="font-['Inter',system-ui,sans-serif]">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
