import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Automated WCAG 2.1 A/AA checks on the main screens (axe-core). Manual checks are in TESTING.md. */
for (const scheme of ['light', 'dark'] as const)
for (const [name, url, ready] of [
  ['landing', '/#inicio', 'h1'],
  ['tool (empty)', '/#app', '[data-testid="file-input"]'],
  ['tool (demo results)', '/#demo', '[data-testid="donor-table"]'],
] as const) {
  test(`no serious accessibility violations: ${name} (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(url);
    await page.waitForSelector(ready, { state: 'attached' });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const summary = serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(' ')}`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
