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
  await page.locator('.add-person-button').click()
  await page.locator('.modal input[placeholder="First name"]').fill('Console')
  await page.locator('.modal input[placeholder="Last name"]').fill('Test')
  await page.locator('.modal .btn-primary').click()
  await expect(page.locator('.details-panel')).toContainText('Console Test')
  expect(errors).toEqual([])
})
