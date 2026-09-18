export interface ThemeTokens {
  bg: string;          // page/screen background
  surface: string;     // card/input background
  surfaceAlt: string;  // slightly different surface (pay summary bg, header bg)
  border: string;      // card/input borders
  text: string;        // primary text
  textMuted: string;   // secondary/label text
  textFaint: string;   // very muted (placeholders, empty states)
  accent: string;      // primary action colour (buttons, links, active tab)
  accentText: string;  // text on top of accent background
  inclusion: string;   // green for inclusions
  deduction: string;   // red for deductions
  badgeActiveBg: string;
  badgeActiveText: string;
  badgeDraftBg: string;
  badgeDraftText: string;
  badgeCommittedBg: string;
  badgeCommittedText: string;
  tabBar: string;
  navBar: string;
  statusBar: 'light' | 'dark'; // for StatusBar component
}

export const darkTheme: ThemeTokens = {
  bg: '#111827',
  surface: '#1e293b',
  surfaceAlt: '#0f172a',
  border: '#1e293b',
  text: '#f1f5f9',
  textMuted: '#64748b',
  textFaint: '#334155',
  accent: '#38bdf8',
  accentText: '#0f172a',
  inclusion: '#34d399',
  deduction: '#f87171',
  badgeActiveBg: '#064e3b',
  badgeActiveText: '#34d399',
  badgeDraftBg: '#312e81',
  badgeDraftText: '#a5b4fc',
  badgeCommittedBg: '#1e3a5f',
  badgeCommittedText: '#60a5fa',
  tabBar: '#0f172a',
  navBar: '#111827',
  statusBar: 'light',
};

export const lightTheme: ThemeTokens = {
  bg: '#f2f4f6',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  border: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  textFaint: '#d1d5db',
  accent: '#0284c7',
  accentText: '#ffffff',
  inclusion: '#16a34a',
  deduction: '#dc2626',
  badgeActiveBg: '#dcfce7',
  badgeActiveText: '#166534',
  badgeDraftBg: '#ede9fe',
  badgeDraftText: '#5b21b6',
  badgeCommittedBg: '#dbeafe',
  badgeCommittedText: '#1d4ed8',
  tabBar: '#ffffff',
  navBar: '#f2f4f6',
  statusBar: 'dark',
};
