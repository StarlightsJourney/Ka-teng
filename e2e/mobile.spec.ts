import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

async function settledBox(locator: Locator) {
  let previous = await locator.boundingBox()
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await locator.page().waitForTimeout(100)
    const next = await locator.boundingBox()
    if (previous && next && Math.abs(previous.x - next.x) < 0.5 && Math.abs(previous.y - next.y) < 0.5) return next
    previous = next
  }
  return previous
}

async function createPerson(page: Page, name: string) {
  await page.locator('.people-tray-new, .canvas-empty .btn-primary').first().click()
  await page.locator('.modal input[placeholder="Full name"]').fill(name)
  await page.locator('.modal .btn-primary').click()
  await expect(page.locator('.modal')).toHaveCount(0)
}

async function expectNoHorizontalOverflow(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(390)
}

test('phone: blank canvas, first person, and controls fit on screen', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.canvas-empty-card')).toBeVisible()
  const empty = await page.locator('.canvas-empty-card').boundingBox()
  expect((empty?.x ?? -1)).toBeGreaterThanOrEqual(0)
  expect((empty?.x ?? 0) + (empty?.width ?? 999)).toBeLessThanOrEqual(390)
  await createPerson(page, 'Phone Person')
  const card = await settledBox(page.locator('.kt-card', { hasText: 'Phone Person' }))
  const topBar = await page.locator('.top-bar').boundingBox()
  expect(card && topBar && card.y > topBar.y + topBar.height).toBe(true)
  expect((card?.x ?? -1)).toBeGreaterThanOrEqual(0)
  expect((card?.x ?? 0) + (card?.width ?? 999)).toBeLessThanOrEqual(390)
  await expect(page.locator('.view-controls')).toBeVisible()
  await expect(page.locator('.people-inventory')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('phone: the People drawer opens, lists people and can be dragged from', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Root Person')
  await page.locator('.inventory-expand').click()
  const tray = page.locator('.people-tray')
  await expect(tray).toBeVisible()
  const box = await tray.boundingBox()
  expect((box?.x ?? 0) + (box?.width ?? 999)).toBeLessThanOrEqual(390)
  await createPerson(page, 'Drawer Person')
  const source = await settledBox(page.locator('.tray-card-main', { hasText: 'Drawer Person' }))
  const target = await settledBox(page.locator('.kt-card', { hasText: 'Root Person' }))
  if (!source || !target) throw new Error('missing drag endpoints')
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(source.x + source.width / 2 + 10, source.y + source.height / 2 + 10, { steps: 3 })
  await expect(tray).toHaveCount(0)
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 })
  await page.mouse.up()
  await page.locator('.drop-picker-option', { hasText: 'Spouse' }).click()
  await expect(page.locator('.kt-card', { hasText: 'Drawer Person' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('phone: selecting a person keeps their card visible above the details sheet', async ({ page }) => {
  await page.goto('/?sample')
  const card = page.locator('.kt-card').first()
  await expect(card).toBeVisible({ timeout: 10000 })
  const name = (await card.locator('.kt-name').textContent()) ?? ''
  await card.click()
  const sheet = page.locator('.details-panel')
  await expect(sheet).toBeVisible()
  const sheetBox = await sheet.boundingBox()
  expect(sheetBox?.height ?? 999).toBeLessThanOrEqual(520)
  const cardBox = await settledBox(page.locator('.kt-card', { hasText: name }).first())
  expect((cardBox?.y ?? 999) + (cardBox?.height ?? 0)).toBeLessThanOrEqual((sheetBox?.y ?? 0) + 1)
  expect((cardBox?.y ?? -1)).toBeGreaterThanOrEqual(0)
  await expectNoHorizontalOverflow(page)
})

test('tablet: sample tree loads with readable cards and no overflow', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/?sample')
  const card = page.locator('.kt-card').first()
  await expect(card).toBeVisible({ timeout: 10000 })
  const box = await settledBox(page.locator('.kt-card.is-main'))
  expect(box?.width ?? 0).toBeGreaterThan(150)
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(768)
})

test('phone: people sit in a bottom inventory and can be dragged up onto the tree', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Root Person')
  await page.locator('.inventory-new').click()
  await page.locator('.modal input[placeholder="Full name"]').fill('Strip Person')
  await page.locator('.modal .btn-primary').click()
  const chip = page.locator('.inventory-chip', { hasText: 'Strip Person' })
  await expect(chip).toBeVisible()
  const source = await settledBox(chip)
  const target = await settledBox(page.locator('.kt-card', { hasText: 'Root Person' }))
  if (!source || !target) throw new Error('missing drag endpoints')
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(source.x + source.width / 2, source.y - 40, { steps: 4 })
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 })
  await page.mouse.up()
  await page.locator('.drop-picker-option', { hasText: 'Child' }).click()
  await expect(page.locator('.kt-card', { hasText: 'Strip Person' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('phone: the empty state, top bar and inventory fit a small 360px screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  for (const selector of ['.canvas-empty-card', '.top-bar', '.people-inventory']) {
    const box = await settledBox(page.locator(selector))
    expect((box?.x ?? -1)).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 999)).toBeLessThanOrEqual(360)
  }
  await expectNoHorizontalOverflow(page)
})

test('phone: the details sheet slides down when closed', async ({ page }) => {
  await page.goto('/?sample')
  await page.locator('.kt-card').first().click()
  const sheet = page.locator('.details-panel')
  await expect(sheet).toHaveCSS('animation-name', 'kt-slide-in-up')
  await sheet.locator('.panel-close').click()
  await expect(page.locator('.details-panel.is-closing')).toHaveCSS('animation-name', 'kt-slide-out-down')
  await expect(sheet).toHaveCount(0)
})

test('tablet: opening details tucks the People sheet away so the card stays visible', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')
  await createPerson(page, 'Tablet Person')
  await page.locator('.kt-card', { hasText: 'Tablet Person' }).click()
  await expect(page.locator('.people-rail')).toBeVisible()
  await page.waitForTimeout(900)
  const card = await settledBox(page.locator('.kt-card', { hasText: 'Tablet Person' }))
  const panel = await settledBox(page.locator('.details-panel'))
  expect((card?.x ?? 0) + (card?.width ?? 0)).toBeLessThanOrEqual(panel?.x ?? 0)
})

test('phone: the collapsed search never draws its placeholder over the wordmark', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('.search-box input')
  await expect(input).toHaveCSS('color', 'rgba(0, 0, 0, 0)')
  const placeholder = await input.evaluate((element) => getComputedStyle(element, '::placeholder').color)
  expect(placeholder).toBe('rgba(0, 0, 0, 0)')
  const brand = await settledBox(page.locator('.brand'))
  const search = await settledBox(page.locator('.search-box'))
  expect((search?.x ?? 0)).toBeGreaterThanOrEqual((brand?.x ?? 0) + (brand?.width ?? 0))
  await input.click()
  await page.keyboard.type('Ada')
  await expect(input).toHaveValue('Ada')
  await expect(input).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)')
})
