import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Listen for console logs
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))
        
        print("Navigating to http://localhost:5174/learn")
        await page.goto("http://localhost:5174/learn")
        
        print("Waiting for page load...")
        await page.wait_for_timeout(2000)
        
        print("Clicking New Lesson button...")
        new_lesson_btn = page.locator("button:has-text('New Lesson')").first
        await new_lesson_btn.click()
        
        print("Waiting for modal...")
        await page.wait_for_timeout(1000)
        
        # Select Branch
        print("Selecting Branch...")
        branch_select = page.locator("button:has-text('Select a branch...')").first
        await branch_select.click()
        await page.wait_for_timeout(500)
        branch_option = page.locator("button:has-text('Computer Science')").first
        if await branch_option.count() == 0:
            branch_option = page.locator(".absolute.z-50 button").first
        await branch_option.click()
        
        print("Waiting for Subjects to load...")
        await page.wait_for_timeout(1000)
        
        # Select Subject
        print("Selecting Subject...")
        subject_select = page.locator("button:has-text('Select a subject...')").first
        await subject_select.click()
        await page.wait_for_timeout(500)
        subject_option = page.locator(".absolute.z-50 button").first
        
        await subject_option.click()
        
        print("Waiting for Topic input to enable...")
        await page.wait_for_timeout(1000)
        
        print("Typing into Topic input...")
        topic_input = page.locator("input[placeholder*='Binary Search Trees']")
        await topic_input.click()
        await topic_input.type("Test Topic", delay=100)
        
        print("Checking value of Topic input...")
        val = await topic_input.input_value()
        print(f"INPUT VALUE AFTER TYPING: '{val}'")
        
        print("Waiting 1 second...")
        await page.wait_for_timeout(1000)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
