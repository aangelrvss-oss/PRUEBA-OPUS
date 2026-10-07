import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true } as const;

export const IconUpload = (p: P) => (<svg {...base} {...p}><path d="M12 15V4m0 0-4 4m4-4 4 4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>);
export const IconDownload = (p: P) => (<svg {...base} {...p}><path d="M12 4v11m0 0-4-4m4 4 4-4" /><path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" /></svg>);
export const IconLock = (p: P) => (<svg {...base} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
export const IconCheck = (p: P) => (<svg {...base} {...p}><path d="m5 12.5 4.2 4.2L19 7" /></svg>);
export const IconX = (p: P) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconAlert = (p: P) => (<svg {...base} {...p}><path d="M12 9v4m0 3.5v.01" /><path d="M10.3 4.3 2.6 17.6A2 2 0 0 0 4.3 20.6h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /></svg>);
export const IconInfo = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8.5v.01" /></svg>);
export const IconError = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5m0 3.5v.01" /></svg>);
export const IconChevron = (p: P) => (<svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>);
export const IconArrowLeft = (p: P) => (<svg {...base} {...p}><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></svg>);
export const IconArrowRight = (p: P) => (<svg {...base} {...p}><path d="M5 12h14m0 0-6-6m6 6-6 6" /></svg>);
export const IconFile = (p: P) => (<svg {...base} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>);
export const IconTrash = (p: P) => (<svg {...base} {...p}><path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>);
export const IconSearch = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>);
export const IconSpark = (p: P) => (<svg {...base} {...p}><path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>);

/** Brand mark: a ledger column whose two lines meet — "cuadra". */
export const BrandMark = (p: P) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" {...p}>
    <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--accent)" />
    <path d="M9 11h14M9 16h14" stroke="var(--accent-ink)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M9 22.5h14" stroke="var(--accent-ink)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M9 19.6h14" stroke="var(--accent-ink)" strokeWidth="1.2" strokeLinecap="round" opacity=".75" />
  </svg>
);
