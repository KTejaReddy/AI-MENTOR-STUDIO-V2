import { test, expect } from '@playwright/test';
import { BasePage } from '../pages/BasePage';

test.describe('Responsive Layout Tests', () => {
  const viewports = [
    { width: 320, height: 568, name: 'Mobile S' },
    { width: 480, height: 800, name: 'Mobile L' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1024, height: 768, name: 'Desktop S' },
    { width: 1920, height: 1080, name: 'Desktop L' }
  ];

  for (const vp of viewports) {
    test(`Dashboard Layout at ${vp.width}x${vp.height} (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const basePage = new BasePage(page);
      
      // Navigate and wait for render
      await basePage.goto('/');
      await basePage.waitForHydration();
      
      // Basic assertions to ensure no horizontal overflow
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(isOverflowing).toBe(false);
      
      // Capture screenshot for visual regression tracking
      await basePage.captureVisualBaseline(`dashboard-${vp.name}`);
    });
  }
});
