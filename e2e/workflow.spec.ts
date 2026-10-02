import { readFile } from 'node:fs/promises'
import { expect, test, type Locator, type Page } from '@playwright/test'

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

async function dragTo(page: Page, source: Locator, target: Locator) {
  await settledBox(target)
  const from = await settledBox(source)
  const to = await settledBox(target)
  if (!from || !to) throw new Error('drag source or target is not visible')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 3 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
}

const trayCard = (page: Page, name: string) => page.locator('.tray-card-main', { hasText: name })
const treeCard = (page: Page, name: string) => page.locator('.kt-card', { hasText: name })
const section = (page: Page, title: string) => page.locator('.details-panel .relationship-section', { hasText: title })
const followUp = (page: Page) => page.locator('.modal.followup')

async function createPerson(page: Page, name: string) {
  await page.locator('.people-tray-new, .canvas-empty .btn-primary').first().click()
  const modal = page.locator('.modal[role="dialog"]')
  await expect(modal).toBeVisible()
  await modal.locator('input[placeholder="Full name"]').fill(name)
  await modal.locator('.btn-primary').click()
  await expect(modal).not.toBeVisible()
}

async function createInTray(page: Page, name: string) {
  await createPerson(page, name)
  await expect(trayCard(page, name)).toBeVisible()
}

async function hoverGrip(page: Page, name: string) {
  const card = treeCard(page, name)
  await card.hover()
  const grip = card.locator('.kt-grip')
  await expect(grip).toBeVisible()
  return grip
}

async function pickKin(page: Page, kin: string) {
  const picker = page.locator('.drop-picker')
  await picker.locator('.drop-picker-option', { hasText: kin }).click()
  await expect(picker).toHaveCount(0)
}

async function answerFollowUp(page: Page, accept: string[] = []) {
  const prompt = followUp(page)
  await expect(prompt).toBeVisible()
  for (const text of accept) await prompt.locator('.followup-row', { hasText: text }).click()
  if (accept.length) await prompt.locator('.btn-primary').click()
  else await prompt.locator('.modal-actions .btn-secondary').click()
  await expect(prompt).toHaveCount(0)
}

async function buildFamily(page: Page, caraParents: 'both' | 'ada' = 'both') {
  await page.goto('/')
  await expect(page.locator('.canvas-empty')).toBeVisible()
  await createPerson(page, 'Ada Tan')
  await expect(treeCard(page, 'Ada Tan')).toBeVisible()
  await expect(page.locator('.canvas-empty')).toHaveCount(0)
  for (const name of ['Ben Tan', 'Cara Tan']) await createInTray(page, name)
  await dragTo(page, trayCard(page, 'Ben Tan'), treeCard(page, 'Ada Tan'))
  await pickKin(page, 'Spouse')
  await expect(treeCard(page, 'Ben Tan')).toBeVisible()
  await dragTo(page, trayCard(page, 'Cara Tan'), treeCard(page, 'Ada Tan'))
  await pickKin(page, 'Child')
  await answerFollowUp(page, caraParents === 'both' ? ['Ben Tan'] : [])
  await expect(treeCard(page, 'Cara Tan')).toBeVisible()
  await expect(page.locator('.tray-card')).toHaveCount(0)
}

test('the first person added appears on the tree immediately, centred', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await createPerson(page, 'Centre Person')
  const box = await settledBox(treeCard(page, 'Centre Person'))
  expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - 720)).toBeLessThan(16)
  await expect(page.locator('.tray-card')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('blank canvas: build a family by dragging people onto cards', async ({ page }) => {
  await buildFamily(page)
  await treeCard(page, 'Cara Tan').click()
  await expect(section(page, 'Parents')).toContainText('Ada Tan')
  await expect(section(page, 'Parents')).toContainText('Ben Tan')
})

test('spouse links never guess shared children — the user is asked', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Me Wong')
  for (const name of ['Mum Wong', 'Dad Wong']) await createInTray(page, name)
  await dragTo(page, trayCard(page, 'Mum Wong'), treeCard(page, 'Me Wong'))
  await pickKin(page, 'Parent')
  await expect(followUp(page).locator('.followup-row')).toHaveCount(0)
  await answerFollowUp(page)
  await dragTo(page, trayCard(page, 'Dad Wong'), treeCard(page, 'Mum Wong'))
  await pickKin(page, 'Spouse')
  const prompt = followUp(page)
  await expect(prompt).toContainText('Me Wong is also Dad Wong’s child')
  await expect(prompt.locator('input[type="checkbox"]')).not.toBeChecked()
  await answerFollowUp(page, [])
  await treeCard(page, 'Me Wong').click()
  await expect(section(page, 'Parents')).not.toContainText('Dad Wong')
})

test('confirming a follow-up connects the shared child', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Me Wong')
  for (const name of ['Mum Wong', 'Dad Wong']) await createInTray(page, name)
  await dragTo(page, trayCard(page, 'Mum Wong'), treeCard(page, 'Me Wong'))
  await pickKin(page, 'Parent')
  await answerFollowUp(page)
  await dragTo(page, trayCard(page, 'Dad Wong'), treeCard(page, 'Mum Wong'))
  await pickKin(page, 'Spouse')
  await answerFollowUp(page, ['Me Wong'])
  await treeCard(page, 'Me Wong').click()
  await expect(section(page, 'Parents')).toContainText('Dad Wong')
})

test('adding a second parent links them to the existing parent', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Me Wong')
  for (const name of ['Mum Wong', 'Dad Wong']) await createInTray(page, name)
  await dragTo(page, trayCard(page, 'Mum Wong'), treeCard(page, 'Me Wong'))
  await pickKin(page, 'Parent')
  await answerFollowUp(page)
  await dragTo(page, trayCard(page, 'Dad Wong'), treeCard(page, 'Me Wong'))
  await pickKin(page, 'Parent')
  await treeCard(page, 'Dad Wong').click()
  await expect(section(page, 'Spouses')).toContainText('Mum Wong')
  await expect(section(page, 'Children')).toContainText('Me Wong')
})

test('the drop picker fits its options and offers Sibling', async ({ page }) => {
  await buildFamily(page)
  await dragTo(page, await hoverGrip(page, 'Cara Tan'), treeCard(page, 'Ben Tan'))
  const picker = page.locator('.drop-picker')
  await expect(picker.locator('.drop-picker-option')).toHaveText([/Parent/, /Spouse/, /Child/, /Sibling/])
  const box = await picker.boundingBox()
  const last = await picker.locator('.drop-picker-option').last().boundingBox()
  expect((box?.x ?? 0) + (box?.width ?? 0) - ((last?.x ?? 0) + (last?.width ?? 0))).toBeLessThan(24)
  await expect(picker.locator('.drop-picker-option', { hasText: 'Sibling' })).toBeDisabled()
  await picker.locator('.drop-picker-cancel').click()
})

test('a sibling with the same parents joins those parents — no spouse line, not listed as a sibling', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Madrid Tan')
  for (const name of ['Mum Tan', 'Joyce Tan']) await createInTray(page, name)
  await dragTo(page, trayCard(page, 'Mum Tan'), treeCard(page, 'Madrid Tan'))
  await pickKin(page, 'Parent')
  await answerFollowUp(page)
  await dragTo(page, trayCard(page, 'Joyce Tan'), treeCard(page, 'Madrid Tan'))
  await page.locator('.drop-picker-option', { hasText: 'Sibling' }).click()
  await expect(page.locator('.drop-picker')).toContainText('Do they have the same parents?')
  await page.locator('.drop-picker-choice', { hasText: 'Yes, same parents' }).click()
  await expect(page.locator('.graph-link.couple')).toHaveCount(0)
  await treeCard(page, 'Joyce Tan').click()
  await expect(section(page, 'Parents')).toContainText('Mum Tan')
  await expect(section(page, 'Spouses')).not.toContainText('Madrid Tan')
  await expect(page.locator('.details-panel')).not.toContainText('Sibling')
})

test('step-siblings get a dashed link and nobody’s parents change', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Madrid Tan')
  await createInTray(page, 'Kai Lim')
  await dragTo(page, trayCard(page, 'Kai Lim'), treeCard(page, 'Madrid Tan'))
  await page.locator('.drop-picker-option', { hasText: 'Sibling' }).click()
  await page.locator('.drop-picker-choice', { hasText: 'step-siblings' }).click()
  await expect(page.locator('.graph-link.sibling.step')).toHaveCount(1)
  await expect(page.locator('.graph-link.couple')).toHaveCount(0)
  const madrid = await settledBox(treeCard(page, 'Madrid Tan'))
  const kai = await settledBox(treeCard(page, 'Kai Lim'))
  expect(Math.abs((madrid?.y ?? 0) - (kai?.y ?? 1))).toBeLessThan(2)
  await treeCard(page, 'Kai Lim').click()
  await expect(section(page, 'Parents')).toContainText('None listed')
  await page.locator('.details-panel .panel-edit').click()
  await expect(page.locator('.sibling-link-chip')).toContainText('Madrid Tan · step')
  await page.locator('.sibling-link-chip button').click()
  await expect(page.locator('.sibling-link-chip')).toHaveCount(0)
  await expect(page.locator('.graph-link.sibling')).toHaveCount(0)
})

test('siblings linked before their parents are known are asked about when a parent is added', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Madrid Tan')
  for (const name of ['Joyce Tan', 'Mum Tan']) await createInTray(page, name)
  await dragTo(page, trayCard(page, 'Joyce Tan'), treeCard(page, 'Madrid Tan'))
  await page.locator('.drop-picker-option', { hasText: 'Sibling' }).click()
  await page.locator('.drop-picker-choice', { hasText: 'Yes, same parents' }).click()
  await expect(page.locator('.graph-link.sibling:not(.step)')).toHaveCount(1)
  await dragTo(page, trayCard(page, 'Mum Tan'), treeCard(page, 'Madrid Tan'))
  await pickKin(page, 'Parent')
  await answerFollowUp(page, ['Joyce Tan'])
  await treeCard(page, 'Joyce Tan').click()
  await expect(section(page, 'Parents')).toContainText('Mum Tan')
})

test('adding a parent offers to add the other parent straight away', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Madrid Tan')
  for (const name of ['Mum Tan', 'Dad Tan']) await createInTray(page, name)
  await dragTo(page, trayCard(page, 'Mum Tan'), treeCard(page, 'Madrid Tan'))
  await pickKin(page, 'Parent')
  const prompt = followUp(page)
  await expect(prompt).toContainText('Madrid Tan has one parent so far')
  await prompt.locator('.followup-add-parent').click()
  const modal = page.locator('.modal[role="dialog"]')
  await expect(modal.locator('.relationship-option.active')).toHaveText('Parent')
  await expect(modal.locator('.modal-subtitle')).toContainText('Madrid Tan')
  await modal.locator('.connect-candidate', { hasText: 'Dad Tan' }).click()
  await modal.locator('.btn-primary').click()
  await expect(section(page, 'Parents')).toContainText('Dad Tan')
  await treeCard(page, 'Dad Tan').click()
  await expect(section(page, 'Spouses')).toContainText('Mum Tan')
})

test('the other-parent prompt can create a new person', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Madrid Tan')
  await createInTray(page, 'Mum Tan')
  await dragTo(page, trayCard(page, 'Mum Tan'), treeCard(page, 'Madrid Tan'))
  await pickKin(page, 'Parent')
  await followUp(page).locator('.followup-add-parent').click()
  const modal = page.locator('.modal[role="dialog"]')
  await modal.locator('input[placeholder="Search people or type a new name…"]').fill('New Dad')
  await modal.locator('.connect-create').click()
  await expect(modal.locator('input[placeholder="Full name"]')).toHaveValue('New Dad')
  await modal.locator('.btn-primary').click()
  await expect(treeCard(page, 'New Dad')).toBeVisible()
  await expect(section(page, 'Parents')).toContainText('New Dad')
})

test('drag a tree card grip onto another card to link existing relatives', async ({ page }) => {
  await buildFamily(page, 'ada')
  await dragTo(page, await hoverGrip(page, 'Cara Tan'), treeCard(page, 'Ben Tan'))
  await expect(page.locator('.drop-picker')).toContainText('Cara Tan')
  await pickKin(page, 'Child')
  await treeCard(page, 'Ben Tan').click()
  await expect(section(page, 'Children')).toContainText('Cara Tan')
  await page.keyboard.press('Escape')
  await dragTo(page, await hoverGrip(page, 'Cara Tan'), treeCard(page, 'Ben Tan'))
  const picker = page.locator('.drop-picker')
  await expect(picker.locator('.drop-picker-option', { hasText: 'Child' })).toBeDisabled()
  await expect(picker.locator('.drop-picker-option', { hasText: 'Parent' })).toBeDisabled()
  await picker.locator('.drop-picker-cancel').click()
  await expect(picker).toHaveCount(0)
})

test('a removed person goes to the tray and can be reconnected as a spouse', async ({ page }) => {
  await buildFamily(page)
  await treeCard(page, 'Ben Tan').click()
  await page.locator('.details-panel .panel-edit').click()
  await page.locator('.remove-person-link').click()
  await page.locator('.remove-confirm .btn-danger').click()
  await expect(treeCard(page, 'Ben Tan')).toHaveCount(0)
  await expect(trayCard(page, 'Ben Tan')).toBeVisible()
  await dragTo(page, trayCard(page, 'Ben Tan'), treeCard(page, 'Ada Tan'))
  await pickKin(page, 'Spouse')
  await answerFollowUp(page, [])
  await expect(treeCard(page, 'Ben Tan')).toBeVisible()
  await expect(trayCard(page, 'Ben Tan')).toHaveCount(0)
})

test('a removed person can be reconnected through the Add spouse picker', async ({ page }) => {
  await buildFamily(page)
  await treeCard(page, 'Ben Tan').click()
  await page.locator('.details-panel .panel-edit').click()
  await page.locator('.remove-person-link').click()
  await page.locator('.remove-confirm .btn-danger').click()
  await treeCard(page, 'Ada Tan').click()
  await page.locator('button:has-text("+ Add spouse")').click()
  const modal = page.locator('.modal[role="dialog"]')
  const search = modal.locator('input[placeholder="Search people or type a new name…"]')
  await search.click()
  await search.fill('Ben')
  await modal.locator('.connect-candidate', { hasText: 'Ben Tan' }).click()
  await expect(modal).toBeVisible()
  await modal.locator('.btn-primary').click()
  await answerFollowUp(page, ['Cara Tan'])
  await expect(section(page, 'Spouses')).toContainText('Ben Tan')
  await expect(treeCard(page, 'Ben Tan')).toBeVisible()
})

test('dragging a tree card onto the tray removes it from the tree', async ({ page }) => {
  await buildFamily(page)
  await dragTo(page, await hoverGrip(page, 'Ben Tan'), page.locator('.people-tray'))
  await expect(treeCard(page, 'Ben Tan')).toHaveCount(0)
  await expect(trayCard(page, 'Ben Tan')).toBeVisible()
})

test('unlinking a parent or child from the details lists works in both directions', async ({ page }) => {
  await buildFamily(page)
  await treeCard(page, 'Cara Tan').click()
  const adaRow = section(page, 'Parents').locator('.relation-row', { hasText: 'Ada Tan' })
  await adaRow.hover()
  await adaRow.locator('.relation-row-remove').click()
  await expect(section(page, 'Parents')).not.toContainText('Ada Tan')
  await expect(section(page, 'Parents')).toContainText('Ben Tan')
  await treeCard(page, 'Ben Tan').click()
  const caraRow = section(page, 'Children').locator('.relation-row', { hasText: 'Cara Tan' })
  await caraRow.hover()
  await caraRow.locator('.relation-row-remove').click()
  await expect(section(page, 'Children')).not.toContainText('Cara Tan')
})

test('one Add button searches existing people and connects them in the right direction', async ({ page }) => {
  await buildFamily(page)
  await createInTray(page, 'Dan Lim')
  await treeCard(page, 'Ada Tan').click()
  await section(page, 'Parents').locator('.add-relationship-btn').click()
  const modal = page.locator('.modal[role="dialog"]')
  await expect(modal.locator('.relationship-option.active')).toHaveText('Parent')
  await modal.locator('input[placeholder="Search people or type a new name…"]').fill('Dan')
  await expect(modal.locator('.connect-create')).toContainText('Create “Dan”')
  await modal.locator('.connect-candidate', { hasText: 'Dan Lim' }).click()
  await modal.locator('.btn-primary').click()
  await answerFollowUp(page)
  await expect(modal).toHaveCount(0)
  await expect(section(page, 'Parents')).toContainText('Dan Lim')
  await expect(section(page, 'Children')).not.toContainText('Dan Lim')
})

test('the tree lays out generations top to bottom with couples side by side', async ({ page }) => {
  await buildFamily(page)
  const ada = await settledBox(treeCard(page, 'Ada Tan'))
  const ben = await settledBox(treeCard(page, 'Ben Tan'))
  const cara = await settledBox(treeCard(page, 'Cara Tan'))
  expect(Math.abs((ada?.y ?? 0) - (ben?.y ?? 1))).toBeLessThan(2)
  expect((cara?.y ?? 0)).toBeGreaterThan((ada?.y ?? 0) + (ada?.height ?? 0))
  const parentsMid = ((ada?.x ?? 0) + (ben?.x ?? 0)) / 2
  expect(Math.abs((cara?.x ?? 0) - parentsMid)).toBeLessThan(4)
  await expect(page.locator('.graph-link.couple')).toHaveCount(1)
  await expect(page.locator('.graph-link.descent')).toHaveCount(1)
})

test('cards switch between compact and photo views and remember the choice', async ({ page }) => {
  await buildFamily(page)
  await expect(page.locator('.kt-card.kt-mode-compact')).toHaveCount(3)
  await page.locator('.card-mode-toggle').click()
  await expect(page.locator('.kt-card.kt-mode-photo')).toHaveCount(3)
  const photo = await settledBox(treeCard(page, 'Ada Tan'))
  expect((photo?.height ?? 0)).toBeGreaterThan(photo?.width ?? 0)
  await page.reload()
  await expect(page.locator('.kt-card.kt-mode-photo')).toHaveCount(3)
})

test('save a family to a file and open it again', async ({ page }, testInfo) => {
  await buildFamily(page)
  const downloadPromise = page.waitForEvent('download')
  await page.locator('button[aria-label="Save family file"]').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^ka-teng-family-\d{4}-\d{2}-\d{2}\.json$/)
  const filePath = testInfo.outputPath('family.json')
  await download.saveAs(filePath)
  const saved = JSON.parse(await readFile(filePath, 'utf8')) as { app: string; people: unknown[] }
  expect(saved.app).toBe('ka-teng')
  expect(saved.people).toHaveLength(3)
  await page.goto('/')
  await createPerson(page, 'Unsaved Person')
  page.once('dialog', (dialog) => { void dialog.accept() })
  await page.getByTestId('family-file-input').setInputFiles(filePath)
  await expect(treeCard(page, 'Unsaved Person')).toHaveCount(0)
  await expect(treeCard(page, 'Ada Tan')).toBeVisible()
  await expect(treeCard(page, 'Cara Tan')).toBeVisible()
  await treeCard(page, 'Cara Tan').click()
  await expect(section(page, 'Parents')).toContainText('Ben Tan')
})

test('opening an invalid file explains the problem and keeps the current tree', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Keep Me')
  await page.getByTestId('family-file-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":true}') })
  await expect(page.locator('.app-notice')).toContainText('not a Ka-teng family file')
  await expect(treeCard(page, 'Keep Me')).toBeVisible()
})

test('closing the details panel does not move the camera', async ({ page }) => {
  await page.goto('/?sample')
  await expect(page.locator('.kt-card').first()).toBeVisible({ timeout: 10000 })
  const target = page.locator('.kt-card').nth(3)
  const name = (await target.locator('.kt-name').textContent()) ?? ''
  await target.click()
  await expect(page.locator('.details-panel')).toBeVisible()
  const before = await settledBox(treeCard(page, name).first())
  await page.locator('.details-panel .panel-close').click()
  await expect(page.locator('.details-panel')).toHaveCount(0)
  await page.waitForTimeout(800)
  const after = await settledBox(treeCard(page, name).first())
  expect(after?.x).toBeCloseTo(before?.x ?? 0, 0)
  expect(after?.y).toBeCloseTo(before?.y ?? 0, 0)
})

test('there is no ⌘K shortcut or hint', async ({ page }) => {
  await page.goto('/?sample')
  await expect(page.locator('.search-box kbd')).toHaveCount(0)
  await page.keyboard.press('Control+KeyK')
  await expect(page.locator('.search-box input')).not.toBeFocused()
})

test('connect-existing modal stays open while interacting inside it', async ({ page }) => {
  await page.goto('/?sample')
  await page.locator('.kt-card').first().click()
  await page.locator('button:has-text("+ Add spouse")').click()
  const modal = page.locator('.modal[role="dialog"]')
  await modal.locator('input[placeholder="Search people or type a new name…"]').click()
  await modal.locator('.relationship-option').first().click()
  await expect(modal).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modal).not.toBeVisible()
  await expect(page.locator('.details-panel')).toBeVisible()
})

test('forms have one close control and the required mark sits inline with its label', async ({ page }) => {
  await page.goto('/?sample')
  await page.locator('.kt-card').first().click()
  await page.locator('.details-panel .panel-edit').click()
  const form = page.locator('.edit-modal form')
  await expect(form.locator('.panel-close')).toHaveCount(0)
  const mark = await form.locator('.required-mark').first().boundingBox()
  const label = await form.locator('.field-label').first().boundingBox()
  expect(mark && label && mark.y + mark.height <= label.y + label.height + 1).toBe(true)
  expect(label && label.height < 24).toBe(true)
  await form.locator('.btn-secondary', { hasText: 'Cancel' }).click()
  await page.locator('button:has-text("+ Add child")').click()
  await expect(page.locator('.modal .panel-close')).toHaveCount(0)
  await expect(page.locator('.modal .btn-secondary', { hasText: 'Cancel' })).toBeVisible()
})

test('relative names stay inside the details panel on a wide monitor', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1080 })
  await page.goto('/?sample')
  await page.locator('.kt-card').first().click()
  const panel = await page.locator('.details-panel').boundingBox()
  const rows = page.locator('.details-panel .relation-row-name')
  expect(await rows.count()).toBeGreaterThan(0)
  for (const right of await rows.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().right))) {
    expect(right).toBeLessThanOrEqual((panel?.x ?? 0) + (panel?.width ?? 0))
  }
})

test('gender offers Male, Female and Other only, and a new person can be marked deceased', async ({ page }) => {
  await page.goto('/')
  await page.locator('.canvas-empty .btn-primary').click()
  const modal = page.locator('.modal[role="dialog"]')
  await expect(modal.locator('.segmented button')).toHaveText(['Male', 'Female', 'Other'])
  await expect(modal.locator('select option', { hasText: 'Unknown' })).toHaveCount(0)
  await modal.locator('input[placeholder="Full name"]').fill('Grand Pa')
  await modal.locator('.segmented button[data-gender="M"]').click()
  await modal.locator('input[aria-label="Born year"]').fill('1921')
  await modal.locator('.switch-row').click()
  await modal.locator('input[aria-label="Died day"]').fill('5')
  await modal.locator('select[aria-label="Died month"]').selectOption('5')
  await modal.locator('input[aria-label="Died year"]').fill('2000')
  await modal.locator('.btn-primary').click()
  const card = treeCard(page, 'Grand Pa')
  await expect(card.locator('.kt-life')).toHaveText('1921 – 2000')
  await expect(card).toHaveAttribute('data-gender', 'M')
  await card.click()
  await expect(page.locator('.person-facts-list')).toContainText('Died 5 May 2000 · aged 79')
  await expect(page.locator('.details-panel')).not.toContainText('Male')
})

test('dates read in words without symbols', async ({ page }) => {
  await page.goto('/')
  await page.locator('.canvas-empty .btn-primary').click()
  const modal = page.locator('.modal[role="dialog"]')
  await modal.locator('input[placeholder="Full name"]').fill('Date Person')
  await modal.locator('input[aria-label="Born day"]').fill('12')
  await modal.locator('select[aria-label="Born month"]').selectOption('3')
  await modal.locator('input[aria-label="Born year"]').fill('1994')
  await expect(modal.locator('.date-field .field-hint').first()).toContainText('12 March 1994')
  await modal.locator('.btn-primary').click()
  const card = treeCard(page, 'Date Person')
  await expect(card.locator('.kt-life')).toHaveText('Born 1994')
  await expect(card).not.toContainText('★')
  await card.click()
  await expect(page.locator('.person-facts-list')).toContainText('Born 12 March 1994 · age')
})

test('long relative lists collapse behind a toggle', async ({ page }) => {
  const kids = Array.from({ length: 7 }, (_, index) => ({ id: `k${index}`, name: { first: `Kid${index}`, last: 'Lee' }, gender: 'U', parents: ['p'] }))
  const file = { app: 'ka-teng', version: 1, focusId: 'p', people: [{ id: 'p', name: { first: 'Parent', last: 'Lee' }, gender: 'F', children: kids.map((kid) => kid.id) }, ...kids] }
  await page.goto('/')
  await page.getByTestId('family-file-input').setInputFiles({ name: 'big.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) })
  await treeCard(page, 'Parent Lee').click()
  const children = section(page, 'Children')
  await expect(children.locator('.relation-row')).toHaveCount(4)
  await children.locator('.relation-toggle').click()
  await expect(children.locator('.relation-row')).toHaveCount(7)
  await expect(children.locator('.relation-toggle')).toHaveText('Show fewer')
})

test('view controls live in the top bar beside the theme toggle, with icon-only file buttons', async ({ page }) => {
  await page.goto('/?sample')
  const bar = page.locator('.top-bar')
  const controls = bar.locator('.view-controls')
  await expect(controls).toBeVisible()
  await expect(controls.locator('.view-segmented button')).toHaveText(['Focus', 'Family', 'All'])
  await expect(bar.locator('button[aria-label="Zoom in"], button[aria-label="Zoom out"], .graph-toolbar')).toHaveCount(0)
  await expect(bar.locator('.card-mode-toggle')).toHaveCount(1)
  const theme = await bar.locator('.theme-toggle').boundingBox()
  const fit = await bar.locator('button[aria-label="Fit whole tree"]').boundingBox()
  expect(Math.abs((theme?.x ?? 0) - ((fit?.x ?? 0) + (fit?.width ?? 0)))).toBeLessThan(16)
  for (const label of ['Open family file', 'Save family file']) {
    const button = bar.locator(`button[aria-label="${label}"]`)
    await expect(button).toHaveText('')
    await expect(button).toHaveAttribute('data-tooltip', /.+/)
  }
})

test('clicking a card glides the view to that person', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?sample')
  await page.waitForTimeout(800)
  const name = await page.locator('.kt-card:not(.is-main)').evaluateAll((cards) => {
    const visible = cards.find((card) => {
      const rect = card.getBoundingClientRect()
      return rect.left > 380 && rect.right < 1020 && rect.top > 120 && rect.bottom < 860
    })
    return visible?.querySelector('.kt-name')?.textContent ?? ''
  })
  expect(name).not.toBe('')
  await treeCard(page, name).first().click()
  await expect(page.locator('.kt-card.is-main .kt-name')).toHaveText(name)
  await expect.poll(async () => {
    const box = await treeCard(page, name).first().boundingBox()
    return Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - 720)
  }, { timeout: 8000 }).toBeLessThan(12)
  const card = await settledBox(treeCard(page, name).first())
  const tray = await page.locator('.people-tray').boundingBox()
  const panel = await page.locator('.details-panel').boundingBox()
  expect((card?.x ?? 0)).toBeGreaterThan((tray?.x ?? 0) + (tray?.width ?? 0))
  expect((card?.x ?? 0) + (card?.width ?? 0)).toBeLessThan(panel?.x ?? 1440)
})

test('focus view shows only the selected person’s close family', async ({ page }) => {
  await page.goto('/?sample')
  await expect(page.locator('.kt-card').first()).toBeVisible()
  const familyCount = await page.locator('.kt-card').count()
  await page.locator('.view-segmented button', { hasText: 'Focus' }).click()
  await expect.poll(async () => page.locator('.kt-card').count()).toBeLessThan(familyCount)
  await expect(page.locator('.kt-card.is-main')).toHaveCount(1)
  await page.locator('.view-segmented button', { hasText: 'Family' }).click()
  await expect.poll(async () => page.locator('.kt-card').count()).toBe(familyCount)
})

test('the animated background never blocks the canvas', async ({ page }) => {
  await page.goto('/')
  const starfield = page.locator('canvas.starfield')
  await expect(starfield).toHaveCount(1)
  await expect(starfield).toHaveCSS('pointer-events', 'none')
  await page.locator('.canvas-empty .btn-primary').click()
  await expect(page.locator('.modal[role="dialog"]')).toBeVisible()
})

test('destructive buttons use the theme danger colour', async ({ page }) => {
  await page.goto('/')
  await page.locator('.theme-toggle').click()
  await createPerson(page, 'Dirty Tree')
  await page.locator('.people-start-over').click()
  const discard = page.locator('.tray-workspace-confirm .btn-danger')
  await expect(discard).toHaveCSS('background-color', 'rgb(255, 99, 99)')
})

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyQAAAABJRU5ErkJggg==', 'base64')

test('clicking a card keeps it in place and moves the view to it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?sample')
  await page.locator('.view-segmented button', { hasText: 'Family' }).click()
  await page.waitForTimeout(800)
  const name = await page.locator('.kt-card:not(.is-main)').evaluateAll((cards) => {
    const visible = cards.find((card) => {
      const rect = card.getBoundingClientRect()
      return rect.left > 340 && rect.right < 1000 && rect.top > 120 && rect.bottom < 860
    })
    return visible?.querySelector('.kt-name')?.textContent ?? ''
  })
  expect(name).not.toBe('')
  const target = treeCard(page, name).first()
  const node = page.locator('.graph-node', { has: page.locator('.kt-name', { hasText: name }) }).first()
  const before = await node.evaluate((element) => (element as HTMLElement).style.transform)
  await target.click()
  await expect(page.locator('.kt-card.is-main .kt-name')).toHaveText(name)
  await page.waitForTimeout(700)
  const after = await node.evaluate((element) => (element as HTMLElement).style.transform)
  expect(after).toBe(before)
  const box = await settledBox(treeCard(page, name).first())
  expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - 720)).toBeLessThan(16)
})

test('one card-size button toggles compact and photo cards with an animated morph', async ({ page }) => {
  await buildFamily(page)
  const toggle = page.locator('.card-mode-toggle')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.kt-card.kt-mode-photo')).toHaveCount(3)
  await expect(page.locator('.graph-node').first()).toHaveCSS('transition-property', /width/)
  const name = page.locator('.kt-mode-photo .kt-name').first()
  await expect(name).toHaveCSS('white-space', 'nowrap')
  await toggle.click()
  await expect(page.locator('.kt-card.kt-mode-compact')).toHaveCount(3)
})

test('a photo can be repositioned and zoomed inside the card', async ({ page }) => {
  await page.goto('/')
  await page.locator('.canvas-empty .btn-primary').click()
  const modal = page.locator('.modal[role="dialog"]')
  await modal.locator('input[placeholder="Full name"]').fill('Photo Person')
  await modal.locator('.photo-column input[type="file"]').setInputFiles({ name: 'face.png', mimeType: 'image/png', buffer: PNG })
  const frame = modal.locator('.photo-adjuster-frame')
  await expect(frame).toBeVisible()
  const box = await frame.boundingBox()
  if (!box) throw new Error('no frame')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 5 })
  await page.mouse.up()
  await modal.locator('.photo-adjuster-zoom input').fill('1.6')
  await modal.locator('.photo-adjuster-actions .btn-secondary').click()
  await modal.locator('.btn-primary').click()
  const image = treeCard(page, 'Photo Person').locator('.kt-avatar-img')
  await expect(image).toHaveAttribute('style', /object-position: (?!50% 50%)/)
  await expect(image).toHaveAttribute('style', /scale\(1\.6\)/)
})

test('the name and gender share a compact row with no “Gender” label', async ({ page }) => {
  await page.goto('/')
  await page.locator('.canvas-empty .btn-primary').click()
  const modal = page.locator('.modal[role="dialog"]')
  await expect(modal.locator('.field-label', { hasText: 'Gender' })).toHaveCount(0)
  const name = await modal.locator('input[placeholder="Full name"]').boundingBox()
  const gender = await modal.locator('.gender-field .segmented').boundingBox()
  const dialog = await modal.boundingBox()
  expect((name?.width ?? 999)).toBeLessThan((dialog?.width ?? 0) - 100)
  expect(Math.abs((name?.x ?? 0) - (gender?.x ?? 1))).toBeLessThan(2)
})

test('your tree is kept in the browser and comes back after a reload', async ({ page }) => {
  await buildFamily(page)
  await page.waitForTimeout(600)
  await page.reload()
  await expect(treeCard(page, 'Cara Tan')).toBeVisible()
  await expect(page.locator('.app-notice')).toContainText('restored your tree of 3 people')
  await page.locator('.workspace-switch button', { hasText: 'Sample family' }).click()
  await expect(treeCard(page, 'Ada Tan')).toHaveCount(0)
  await page.locator('.workspace-switch button', { hasText: 'My tree' }).click()
  await expect(treeCard(page, 'Ada Tan')).toBeVisible()
})

test('saving in the sample asks whether to save just this family', async ({ page }) => {
  await page.goto('/?sample')
  await page.locator('button[aria-label="Save family file"]').click()
  const modal = page.locator('.save-modal')
  await expect(modal).toContainText('This family')
  await expect(modal).toContainText('Everything')
  const downloadPromise = page.waitForEvent('download')
  await modal.locator('.drop-picker-choice').first().click()
  const download = await downloadPromise
  const content = JSON.parse(await (await download.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString('utf8'))) as { people: unknown[] }
  const everything = await page.evaluate(() => document.querySelector('.people-tray-count')?.textContent)
  expect(content.people.length).toBeGreaterThan(10)
  expect(content.people.length).toBeLessThan(637)
  expect(everything).toBeTruthy()
})

test('editing a person opens a centred dialog', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await buildFamily(page)
  await treeCard(page, 'Ada Tan').click()
  await page.locator('.details-panel .panel-edit').click()
  const dialog = page.locator('.edit-modal')
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - 720)).toBeLessThan(4)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('removal explains which connections go and who would leave the tree', async ({ page }) => {
  const file = {
    app: 'ka-teng', version: 1, focusId: 'c',
    people: [
      { id: 'gp', name: { first: 'Grand', last: 'Lee' }, gender: 'M', children: ['p'], spouses: ['gm'] },
      { id: 'gm', name: { first: 'Granny', last: 'Lee' }, gender: 'F', spouses: ['gp'] },
      { id: 'p', name: { first: 'Parent', last: 'Lee' }, gender: 'F', parents: ['gp'], children: ['c'] },
      { id: 'c', name: { first: 'Child', last: 'Lee' }, gender: 'U', parents: ['p'] },
    ],
  }
  await page.goto('/')
  await page.getByTestId('family-file-input').setInputFiles({ name: 'chain.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) })
  await treeCard(page, 'Parent Lee').click()
  await page.locator('.details-panel .panel-edit').click()
  await page.locator('.remove-person-link').click()
  const confirm = page.locator('.remove-confirm')
  await expect(confirm).toContainText('These connections are removed — the people stay')
  await expect(confirm.locator('.remove-affected.is-leaving')).toContainText('Child Lee')
  await expect(confirm.locator('.remove-affected.is-leaving')).not.toContainText('Grand Lee')
})

test('long names in search suggestions stay inside the list', async ({ page }) => {
  await page.goto('/?sample')
  await page.locator('.search-box input').click()
  await page.keyboard.type('Mountbatten')
  const list = await page.locator('.search-suggestions').boundingBox()
  for (const right of await page.locator('.suggestion-name').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().right))) {
    expect(right).toBeLessThanOrEqual((list?.x ?? 0) + (list?.width ?? 0))
  }
})

test('the People list is a full-height sheet on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/?sample')
  const sheet = await settledBox(page.locator('.people-tray.is-sheet'))
  expect(sheet?.x).toBe(0)
  expect(sheet?.y).toBe(0)
  expect(Math.round(sheet?.height ?? 0)).toBe(1080)
  expect((sheet?.width ?? 0)).toBeGreaterThan(330)
})

test('an empty name is highlighted in both the add and edit forms', async ({ page }) => {
  await page.goto('/')
  await page.locator('.canvas-empty .btn-primary').click()
  const modal = page.locator('.modal[role="dialog"]')
  await modal.locator('.btn-primary').click()
  const name = modal.locator('input[placeholder="Full name"]')
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toBeFocused()
  await expect(modal.locator('.field-error')).toHaveText('Add a name to continue')
  await name.fill('Named Person')
  await expect(name).not.toHaveAttribute('aria-invalid', 'true')
  await modal.locator('.btn-primary').click()
  await treeCard(page, 'Named Person').click()
  await page.locator('.details-panel .panel-edit').click()
  const edit = page.locator('.edit-modal')
  await edit.locator('input[placeholder="Full name"]').fill('')
  await edit.locator('.btn-primary').click()
  await expect(edit.locator('input[placeholder="Full name"]')).toHaveAttribute('aria-invalid', 'true')
  await expect(edit).toBeVisible()
})

test('the avatar ring in the add form is not clipped', async ({ page }) => {
  await page.goto('/')
  await page.locator('.canvas-empty .btn-primary').click()
  await settledBox(page.locator('.modal'))
  const sheet = await page.locator('.modal .form-sheet').boundingBox()
  const photo = await page.locator('.modal .photo-preview').boundingBox()
  expect((photo?.y ?? 0) - (sheet?.y ?? 0)).toBeGreaterThanOrEqual(4)
  expect((photo?.x ?? 0) - (sheet?.x ?? 0)).toBeGreaterThanOrEqual(4)
})

test('sheets slide out toward their own edge and the top bar never moves', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?sample')
  const bar = page.locator('.top-bar')
  const before = await settledBox(bar)
  await page.evaluate(() => {
    const seen: string[] = []
    ;(window as unknown as { __exits: string[] }).__exits = seen
    new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target as Element
        if (target.classList?.contains('is-closing')) seen.push(getComputedStyle(target).animationName)
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true })
  })
  const exits = () => page.evaluate(() => (window as unknown as { __exits: string[] }).__exits)
  await page.locator('.people-tray .panel-close').click()
  await expect.poll(exits).toContain('kt-slide-out-left')
  await expect(page.locator('.people-rail')).toBeVisible()
  expect(Math.abs(((await settledBox(bar))?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(2)
  await page.locator('.kt-card').first().click()
  await expect(page.locator('.details-panel')).toHaveCSS('animation-name', 'kt-slide-in-right')
  expect(Math.abs(((await settledBox(bar))?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(2)
  await page.locator('.details-panel .panel-close').click()
  await expect.poll(exits).toContain('kt-slide-out-right')
  await expect(page.locator('.details-panel')).toHaveCount(0)
})

test('heavy view changes show a loading pill', async ({ page }) => {
  await page.goto('/?sample')
  await expect(page.locator('.kt-card').first()).toBeVisible()
  await page.evaluate(() => {
    const seen: string[] = []
    ;(window as unknown as { __busy: string[] }).__busy = seen
    new MutationObserver(() => {
      const pill = document.querySelector('.busy-pill')
      if (pill?.textContent) seen.push(pill.textContent)
    }).observe(document.body, { childList: true, subtree: true })
  })
  await page.locator('.view-segmented button', { hasText: 'All' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __busy: string[] }).__busy.length)).toBeGreaterThan(0)
  await expect(page.locator('.busy-pill')).toHaveCount(0)
})

test('a splash with a water-droplet ripple plays on launch and then gets out of the way', async ({ page }) => {
  await page.goto('/')
  const splash = page.locator('.splash')
  await expect(splash).toHaveCount(1)
  await expect(splash.locator('.splash-ripple')).toHaveCount(3)
  await expect(splash).toHaveCSS('pointer-events', 'none')
  await expect(splash).toHaveCount(0, { timeout: 4000 })
})

test('notices are large enough to notice and never block clicks', async ({ page }) => {
  await page.goto('/')
  await createPerson(page, 'Toast Person')
  await createPerson(page, 'Second Person')
  const toast = page.locator('.app-notice')
  await expect(toast).toBeVisible()
  const box = await settledBox(toast)
  expect((box?.height ?? 0)).toBeGreaterThanOrEqual(44)
  await expect(toast).toHaveCSS('font-size', '14.5px')
  await expect(toast).toHaveCSS('pointer-events', 'none')
})

test('lists use the themed thin scrollbar', async ({ page }) => {
  await page.goto('/?sample')
  await expect(page.locator('.people-tray-list')).toHaveCSS('scrollbar-width', 'thin')
  await page.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveCSS('color-scheme', /dark|light/)
})
