/**
 * Product analytics — privacy-first by construction.
 *
 * Events carry counts and categories only: never NIFs, names, amounts per
 * donor, file names or entity data. In this build there is NO network sink:
 * events are kept in memory (and exposed for tests / local inspection on
 * `window.__cuadraEvents`). See ANALYTICS.md for the event definitions and
 * for how a cookieless sink would be connected.
 */

export type EventName =
  | 'landing_viewed'
  | 'tool_opened'
  | 'demo_loaded'
  | 'file_added'
  | 'file_rejected'
  | 'mapping_changed'
  | 'declaration_computed'
  | 'file_downloaded'
  | 'report_downloaded'
  | 'history_downloaded';

export type EventProps = Record<string, string | number | boolean>;

export interface TrackedEvent {
  name: EventName;
  props: EventProps;
  at: number;
}

type Sink = (e: TrackedEvent) => void;

const buffer: TrackedEvent[] = [];
let sink: Sink | null = null;

/** Connect a sink (e.g. a cookieless, self-hosted endpoint). Not used in this build. */
export function setAnalyticsSink(s: Sink | null): void {
  sink = s;
}

/** Bucket counts so that events cannot fingerprint a specific entity. */
export function bucket(n: number): string {
  if (n === 0) return '0';
  if (n < 10) return '1-9';
  if (n < 50) return '10-49';
  if (n < 200) return '50-199';
  if (n < 1000) return '200-999';
  return '1000+';
}

export function track(name: EventName, props: EventProps = {}): void {
  const e: TrackedEvent = { name, props, at: Date.now() };
  buffer.push(e);
  if (buffer.length > 500) buffer.shift();
  try {
    sink?.(e);
  } catch {
    /* analytics must never break the product */
  }
  if (typeof window !== 'undefined') {
    (window as unknown as { __cuadraEvents?: TrackedEvent[] }).__cuadraEvents = buffer;
  }
}
