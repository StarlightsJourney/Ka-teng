import { test, expect } from '@playwright/test'

test('Ka-teng loads without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/')
  await expect(page.locator('.top-bar')).toBeVisible()
  await expect(page.locator('.kt-card').first()).toBeVisible({ timeout: 10000 })
  expect(errors).toEqual([])
})

test('adding a person does not log errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/')
  const firstCard = page.locator('.kt-card').first()
  await expect(firstCard).toBeVisible({ timeout: 10000 })
  await firstCard.click()
  await expect(page.locator('.details-panel')).toBeVisible()
  await page.locator('button:has-text("+ Add child")').click()
  await expect(page.locator('.modal[role="dialog"]')).toBeVisible()
  await page.locator('.modal input[placeholder="Full name"]').fill('Console Test')
  await page.locator('.modal .btn-primary').click()
  await expect(page.locator('.details-panel')).toContainText('Console Test')
  expect(errors).toEqual([])
})
