import { test, expect, type Page } from '@playwright/test'

// Ionics globales CSS (normalize.css) setzt button { padding:0; border:0;
// border-radius:0 } ohne Cascade-Layer und schlug damit Tailwinds Utilities.
// Und der Dark Mode ließ Ionics Flächen hell, während die Texte hell wurden.

const DAILY = {
  id: 'daily-1', theme: 'animals', age_range: '3-5', cover_image_url: null,
  is_daily_book: true, published_at: new Date().toISOString(), page_count: 6,
  price_single: 0, titles: { de: 'Lilly, die kleine Füchsin' },
}

async function mockApi(page: Page) {
  await page.route('**/api/v1/books/daily', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DAILY) })
  )
  await page.route('**/api/v1/books?**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ items: [DAILY], total: 1, page: 1, page_size: 12 }) })
  )
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill({ status: 401, body: '{}' }))
}

/** Hintergrund, den Ionic tatsächlich hinter den Inhalt einer Seite malt. */
function pageBackground(page: Page) {
  return page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 3)
    const content = el?.closest('ion-content')
    const bg = content?.shadowRoot?.querySelector('#background-content')
    return bg ? getComputedStyle(bg).backgroundColor : 'n/a'
  })
}

const DARK_BACKGROUND = 'rgb(26, 26, 46)' // --color-background im Dark Mode
const LIGHT_BACKGROUND = 'rgb(255, 253, 247)' // --color-background hell

test.describe('Buttons behalten ihr Tailwind-Styling', () => {
  test.beforeEach(async ({ page }) => mockApi(page))

  test('the daily book CTA has padding and rounded corners', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('button', { name: 'Gratis lesen' })
    await expect(cta).toBeVisible({ timeout: 10000 })
    await expect(cta).toHaveCSS('padding-left', '24px') // px-6
    await expect(cta).toHaveCSS('padding-top', '12px') // py-3
    await expect(cta).toHaveCSS('border-top-left-radius', '12px') // rounded-xl
  })

  test('the outlined preview button keeps its border', async ({ page }) => {
    await page.goto('/')
    const preview = page.getByRole('button', { name: 'Vorschau lesen' })
    await expect(preview).toBeVisible({ timeout: 10000 })
    await expect(preview).toHaveCSS('border-top-width', '2px') // border-2
  })

  test('the login button on the profile page is padded', async ({ page }) => {
    await page.goto('/profile')
    const login = page.getByRole('button', { name: 'Anmelden' })
    await expect(login).toBeVisible({ timeout: 10000 })
    await expect(login).toHaveCSS('padding-left', '24px')
  })
})

test.describe('Dark Mode', () => {
  test.use({ colorScheme: 'dark' })
  test.beforeEach(async ({ page }) => mockApi(page))

  for (const path of ['/', '/library', '/pricing', '/profile']) {
    test(`${path} paints a dark page behind light text`, async ({ page }) => {
      await page.goto(path)
      await expect.poll(() => pageBackground(page), { timeout: 10000 }).toBe(DARK_BACKGROUND)
    })
  }

  test('the tab bar is dark too', async ({ page }) => {
    await page.goto('/library')
    await expect(page.locator('ion-tab-bar')).toHaveCSS('background-color', 'rgb(22, 33, 62)') // --color-surface
  })

  test('pricing cards follow the dark theme', async ({ page }) => {
    await page.goto('/pricing')
    const yearly = page.locator('div.rounded-2xl', { hasText: 'Jährlich' }).first()
    await expect(yearly).toBeVisible({ timeout: 10000 })
    await expect(yearly).not.toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })

  test('also right-to-left on /ar', async ({ page }) => {
    await page.goto('/ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect.poll(() => pageBackground(page), { timeout: 10000 }).toBe(DARK_BACKGROUND)
  })
})

test.describe('Light Mode', () => {
  test.use({ colorScheme: 'light' })
  test.beforeEach(async ({ page }) => mockApi(page))

  test('stays light', async ({ page }) => {
    await page.goto('/library')
    await expect.poll(() => pageBackground(page), { timeout: 10000 }).toBe(LIGHT_BACKGROUND)
  })
})
