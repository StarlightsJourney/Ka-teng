import { expect, test } from '@playwright/test'

test('family tree loads and a person card opens the details panel', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.top-bar')).toBeVisible()
  await expect(page.locator('.family-chart-host')).toBeVisible()
  const firstCard = page.locator('.kt-card').first()
  await expect(firstCard).toBeVisible({ timeout: 10000 })
  await firstCard.click()
  await expect(page.locator('.details-panel')).toBeVisible()
})

test('search focuses with keyboard shortcut and suggests results', async ({ page }) => {
  await page.goto('/')
  await page.locator('.search-box input').waitFor()
  await page.keyboard.press('Control+KeyK')
  await expect(page.locator('.search-box input')).toBeFocused()
  await page.keyboard.type('Churchill')
  await expect(page.locator('.search-suggestions')).toBeVisible()
})

test('theme toggle switches data-theme attribute', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('adds a new person through the top-bar button', async ({ page }) => {
  await page.goto('/')
  await page.locator('.add-person-button').click()
  await expect(page.locator('.modal[role="dialog"]')).toBeVisible()
  await page.locator('.modal input[placeholder="First name"]').fill('Test')
  await page.locator('.modal input[placeholder="Last name"]').fill('Person')
  await page.locator('.modal .btn-primary').click()
  await expect(page.locator('.modal[role="dialog"]')).not.toBeVisible()
  await expect(page.locator('.details-panel')).toBeVisible()
  await expect(page.locator('.details-panel')).toContainText('Test Person')
})
