/**
 * voiceParser.ts — Semantic parser for natural-language excavation descriptions.
 *
 * Takes raw transcribed speech and extracts structured estimate inputs:
 *   - Project type (driveway, culvert, septic, basement, pond)
 *   - Dimensions (length, width, depth in feet)
 *   - Soil type (sand, loam, clay, rock, mixed)
 *   - Project name / other context
 */

import type { ProjectType, SoilType } from "~/components/BallparkEstimator";

// ── Parsed Result ────────────────────────────────────────────────────

export interface ParsedVoiceInput {
  /** Confidence 0-1 */
  confidence: number;
  /** Extracted project type (or null if unclear) */
  projectType: ProjectType | null;
  /** Extracted length in feet */
  length: number | null;
  /** Extracted width in feet */
  width: number | null;
  /** Extracted depth in feet */
  depth: number | null;
  /** Extracted soil type */
  soilType: SoilType | null;
  /** Detected project name or location mention */
  projectName: string | null;
  /** Any other numbers found that might be dimensions */
  rawNumbers: number[];
  /** The raw transcribed text */
  rawText: string;
  /** User-friendly description of what was parsed */
  summary: string;
}

// ── Pattern Matchers ─────────────────────────────────────────────────

/** Map of keywords to project types */
const PROJECT_KEYWORDS: Record<string, ProjectType> = {
  driveway: "driveway",
  drive: "driveway",
  "drive way": "driveway",
  parking: "driveway",
  culvert: "culvert",
  drainage: "culvert",
  ditch: "culvert",
  drain: "culvert",
  septic: "septic",
  "septic tank": "septic",
  "septic system": "septic",
  basement: "basement",
  foundation: "basement",
  "walk out": "basement",
  cellar: "basement",
  pond: "pond",
  "retention pond": "pond",
  lake: "pond",
  "water feature": "pond",
  pool: "pond",
};

const SOIL_KEYWORDS: Record<string, SoilType> = {
  sand: "sand",
  sandy: "sand",
  loam: "loam",
  topsoil: "loam",
  dirt: "loam",
  clay: "clay",
  "heavy clay": "clay",
  rocky: "rock",
  rock: "rock",
  limestone: "rock",
  bedrock: "rock",
  mixed: "mixed",
  fill: "mixed",
  gravel: "mixed",
};

// ── Main Parse Function ──────────────────────────────────────────────

export function parseVoiceInput(rawText: string): ParsedVoiceInput {
  const text = rawText.toLowerCase().trim();
  const words = text.split(/\s+/);

  // ── Extract project type ──
  let projectType: ProjectType | null = null;
  for (const [keyword, type] of Object.entries(PROJECT_KEYWORDS)) {
    if (text.includes(keyword)) {
      projectType = type;
      break;
    }
  }

  // ── Extract soil type ──
  let soilType: SoilType | null = null;
  for (const [keyword, type] of Object.entries(SOIL_KEYWORDS)) {
    if (text.includes(keyword)) {
      soilType = type;
      break;
    }
  }

  // ── Extract numbers ──
  // Match patterns like: "50 by 30 by 2", "50x30x2", "50 feet by 30 feet", "50 ft x 30 ft x 2 ft"
  // Also standalone numbers
  const allNumbers: number[] = [];
  const numberPattern = /(\d+\.?\d*)/g;
  let match;
  while ((match = numberPattern.exec(text)) !== null) {
    const num = parseFloat(match[1]);
    if (num >= 0.5 && num <= 10000) {
      allNumbers.push(num);
    }
  }

  // Try to detect dimension patterns
  let length: number | null = null;
  let width: number | null = null;
  let depth: number | null = null;

  // Pattern 1: "X by Y by Z" or "X x Y x Z"
  const dimensionByPattern = text.match(
    /(\d+\.?\d*)\s*(?:by|x|×)\s*(\d+\.?\d*)\s*(?:by|x|×)?\s*(\d+\.?\d*)?/i,
  );
  if (dimensionByPattern) {
    length = parseFloat(dimensionByPattern[1]);
    width = parseFloat(dimensionByPattern[2]);
    if (dimensionByPattern[3]) {
      depth = parseFloat(dimensionByPattern[3]);
    }
  }

  // Pattern 2: "X feet long Y feet wide Z feet deep"
  if (!length) {
    const longMatch = text.match(/(\d+\.?\d*)\s*(?:feet|foot|ft)\s*(?:long|length)/i);
    if (longMatch) length = parseFloat(longMatch[1]);
  }
  if (!width) {
    const wideMatch = text.match(/(\d+\.?\d*)\s*(?:feet|foot|ft)\s*(?:wide|width)/i);
    if (wideMatch) width = parseFloat(wideMatch[1]);
  }
  if (!depth) {
    const deepMatch = text.match(/(\d+\.?\d*)\s*(?:feet|foot|ft)\s*(?:deep|depth)/i);
    if (deepMatch) depth = parseFloat(deepMatch[1]);
  }

  // Fallback: if we have 3 numbers and no pattern matched, assume LxWxD by position
  if (!length && allNumbers.length >= 3) {
    // Try to figure out which is which - largest is usually length, middle is width, smallest is depth
    const sorted = [...allNumbers].sort((a, b) => b - a);
    // But if we have a clear depth (small number like 0.5-5), it's the smallest
    const min = Math.min(...allNumbers);
    const max = Math.max(...allNumbers);
    if (max > 5 && min <= 5) {
      // length is largest, depth is smallest
      length = max;
      depth = min;
      // width is the middle one
      width = allNumbers.find((n) => n !== max && n !== min) || null;
    }
  }

  // Default depth if only 2 dimensions found (common in driveway: "50 by 12")
  if (length && width && !depth) {
    depth = 1; // Assume 1 foot depth
  }

  // ── Extract project name (text before or after keywords) ──
  let projectName: string | null = null;

  // Look for possessive patterns: "Smith's driveway", "Johnson basement"
  const possessiveMatch = text.match(
    /(\w+(?:'s)?)\s+(driveway|drive|culvert|septic|basement|pond|foundation)/i,
  );
  if (possessiveMatch && !["the", "a", "an", "my", "our", "their", "this", "that"].includes(possessiveMatch[1].toLowerCase())) {
    projectName = possessiveMatch[1];
    // Capitalize
    projectName = projectName.charAt(0).toUpperCase() + projectName.slice(1);
  }

  // Look for "for [name]" pattern
  if (!projectName) {
    const forMatch = text.match(/(?:for|at)\s+(\w+(?:\s+\w+)?)(?:\s+(?:driveway|drive|culvert|septic|basement|pond|foundation))?/i);
    if (forMatch) {
      const name = forMatch[1];
      if (!["the", "a", "an", "my", "our", "their", "this", "that", "a new", "a small", "a large", "a big"].includes(name.toLowerCase())) {
        projectName = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }

  // ── Calculate confidence ──
  let foundCount = 0;
  if (projectType) foundCount++;
  if (length) foundCount++;
  if (width) foundCount++;
  if (depth) foundCount++;
  if (soilType) foundCount++;

  const confidence = Math.min(1, foundCount / 5);

  // ── Build summary ──
  const parts: string[] = [];
  if (projectType) parts.push(projectType.charAt(0).toUpperCase() + projectType.slice(1));
  if (length && width) {
    parts.push(`${length}' × ${width}'${depth ? ` × ${depth}'` : ""}`);
  }
  if (soilType) {
    const labels: Record<SoilType, string> = {
      sand: "Sand",
      loam: "Loam",
      clay: "Clay",
      rock: "Rock",
      mixed: "Mixed",
    };
    parts.push(labels[soilType]);
  }
  const summary = parts.length > 0
    ? `Detected: ${parts.join(" · ")}`
    : "Could not detect project details. Please try again or enter manually.";

  return {
    confidence,
    projectType,
    length,
    width,
    depth,
    soilType,
    projectName,
    rawNumbers: allNumbers,
    rawText,
    summary,
  };
}