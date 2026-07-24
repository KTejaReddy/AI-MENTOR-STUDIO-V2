# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive.spec.ts >> Responsive Layout Tests >> Dashboard Layout at 1920x1080 (Desktop L)
- Location: e2e\tests\responsive.spec.ts:14:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.waitFor: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('main') to be visible

```

# Page snapshot

```yaml
- generic [ref=e7]:
  - generic [ref=e8]:
    - img [ref=e10]
    - heading "Mentor AI Studio" [level=1] [ref=e12]
    - paragraph [ref=e13]: Sign in to continue your learning journey
  - generic [ref=e14]:
    - generic [ref=e15]:
      - generic [ref=e16]: Email
      - generic [ref=e17]:
        - img
        - textbox "you@example.com" [ref=e18]
    - generic [ref=e19]:
      - generic [ref=e20]: Password
      - generic [ref=e21]:
        - img
        - textbox "Enter your password" [ref=e22]
        - button [ref=e23] [cursor=pointer]:
          - img [ref=e24]
    - generic [ref=e28] [cursor=pointer]:
      - checkbox "Remember me" [checked] [ref=e29]
      - generic [ref=e30]: Remember me
    - button "Sign In" [ref=e31] [cursor=pointer]:
      - text: Sign In
      - img [ref=e32]
  - generic [ref=e36]: Or continue with
  - button "Continue with Google" [ref=e39] [cursor=pointer]:
    - img [ref=e40]
    - text: Continue with Google
  - paragraph [ref=e45]:
    - text: Don't have an account?
    - link "Create one" [ref=e46] [cursor=pointer]:
      - /url: /register
```

# Test source

```ts
  1  | import { Page, expect } from '@playwright/test';
  2  | 
  3  | export class BasePage {
  4  |   readonly page: Page;
  5  | 
  6  |   constructor(page: Page) {
  7  |     this.page = page;
  8  |   }
  9  | 
  10 |   async goto(path: string = '/') {
  11 |     await this.page.goto(path);
  12 |   }
  13 | 
  14 |   async waitForHydration() {
  15 |     // Wait for the app shell to be fully visible, implying hydration is likely complete
> 16 |     await this.page.locator('main').waitFor({ state: 'visible' });
     |                                     ^ Error: locator.waitFor: Test timeout of 30000ms exceeded.
  17 |   }
  18 | 
  19 |   async checkA11y() {
  20 |     // This will be called from the test suite with axe-core
  21 |   }
  22 | 
  23 |   async captureVisualBaseline(name: string) {
  24 |     await expect(this.page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  25 |   }
  26 | }
  27 | 
```