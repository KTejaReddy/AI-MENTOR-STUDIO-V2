import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { BasePage } from '../pages/BasePage';

test.describe('Accessibility Testing (a11y)', () => {
  test('Dashboard should not have automatically detectable accessibility violations', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');
    await basePage.waitForHydration();
    
    // Analyze the page with axe-core
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    // There should be no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
