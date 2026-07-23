import { Page, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  async waitForHydration() {
    // Wait for the app shell to be fully visible, implying hydration is likely complete
    await this.page.locator('main').waitFor({ state: 'visible' });
  }

  async checkA11y() {
    // This will be called from the test suite with axe-core
  }

  async captureVisualBaseline(name: string) {
    await expect(this.page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  }
}
