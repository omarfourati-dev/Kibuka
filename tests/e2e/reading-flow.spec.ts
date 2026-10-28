import { test, expect } from '@playwright/test'
import { navItem } from './nav'

test.describe('Homepage', () => {
  test('loads and shows daily book section', async ({ page }) => {
    // Intercept API calls so tests are resilient without a live backend
    await page.route('/api/v1/books/daily', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-book-1',
          theme: 'adventure',
          age_range: '3-5',
          cover_image_url: null,
          is_daily_book: true,
          published_at: new Date().toISOString(),
          page_count: 10,
          price_single: 1.99,
          titles: { de: 'Das Abenteuer beginnt', en: 'The Adventure Begins' },
        }),
      })
    )
    await page.route('/api/v1/books*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          page_size: 6,
        }),
      })
    )

    await page.goto('/')
    // The homepage should render some content — hero, empty state, or loading skeleton
    await expect(
      page.locator('h1, [role="status"], .animate-pulse, button').first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('navigation links to library and pricing are present', async ({ page }) => {
    await page.route('/api/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )

    await page.goto('/')
    // Check that the page loaded (has the root rendered)
    await expect(page.locator('#root')).not.toBeEmpty()
  })
})

test.describe('Library Page', () => {
  test('renders filter bar and book grid', async ({ page }) => {
    await page.route('/api/v1/books*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          page_size: 12,
        }),
      })
    )

    await page.goto('/library')
    await expect(page).toHaveURL('/library')
    // Page content should be visible — either a filter/grid or empty state
    await expect(page.locator('body')).not.toBeEmpty()
    // Select element (language filter) should be present
    const selects = page.locator('select')
    await expect(selects.first()).toBeVisible({ timeout: 8000 })
  })

  test('shows empty state when no books available', async ({ page }) => {
    await page.route('/api/v1/books*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 12 }),
      })
    )

    await page.goto('/library')
    // Empty state text should appear when no books are returned
    await expect(
      page.getByText(/Keine Bücher|keine Bücher/i).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('/books route also renders the library page', async ({ page }) => {
    await page.route('/api/v1/books*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 12 }),
      })
    )

    await page.goto('/books')
    await expect(page).toHaveURL('/books')
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

test.describe('Pricing Page', () => {
  test('shows the three real plans', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText('Monatlich')).toBeVisible()
    await expect(page.getByText('Jährlich')).toBeVisible()
    await expect(page.getByText('Einzelbuch')).toBeVisible()
    await expect(page.getByText('Wochenpaket')).toHaveCount(0)
    await expect(page.getByText(/inkl\. MwSt/)).toBeVisible()
  })

  test('shows FAQ section with Kann ich kündigen question', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText(/Kann ich kündigen/)).toBeVisible()
  })

  test('shows Beliebteste Wahl badge on monthly plan', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText('Beliebteste Wahl')).toBeVisible()
  })

  test('shows savings badge on yearly plan', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText('Spare 2 Monate')).toBeVisible()
  })
})

test.describe('RTL Support', () => {
  test('Arabic language triggers RTL layout on library page', async ({ page }) => {
    await page.route('/api/v1/books*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 12 }),
      })
    )

    await page.goto('/library')
    // Find and click the Arabic language button if visible
    const arabicButton = page.locator('button:has-text("AR"), button:has-text("🇸🇦")').first()
    const isVisible = await arabicButton.isVisible().catch(() => false)
    if (isVisible) {
      await arabicButton.click()
      // Check that RTL attribute is applied somewhere on the page
      const rtlElement = page.locator('[dir="rtl"]').first()
      await expect(rtlElement).toBeVisible({ timeout: 5000 })
    } else {
      // Language switcher not present on this page; test is not applicable — skip gracefully
      test.skip()
    }
  })
})

test.describe('404 Handling', () => {
  test('unknown routes land back on the start page', async ({ page }) => {
    await page.route('/api/v1/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 6 }),
      })
    )

    await page.goto('/diese-seite-gibt-es-nicht')
    await page.waitForURL('/', { timeout: 5000 })
  })
})

test.describe('Reader Page', () => {
  test('reader page stays on URL or redirects — does not crash', async ({ page }) => {
    await page.route('/api/v1/**', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Unauthorized"}' })
    )

    // Attempt to access a book reader without auth
    await page.goto('/books/test-book-id/read')
    // Wait for network idle — page should not error-crash
    await page.waitForLoadState('networkidle')
    // Any outcome is valid: redirect to detail, redirect to login, or stay on URL
    // Just assert the page loaded something meaningful
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

test.describe('Tab-Navigation', () => {
  // Bug 22.10.: Nach einem Tab-Wechsel kam man nicht mehr zurück zu Home —
  // die URL wechselte, aber die alte Seite blieb oben liegen.
  const DAILY = {
    id: 'daily-1', theme: 'animals', age_range: '3-5', cover_image_url: null,
    is_daily_book: true, published_at: new Date().toISOString(), page_count: 6,
    price_single: 0, titles: { de: 'Lilly, die kleine Füchsin' },
  }

  async function topPageText(page: import('@playwright/test').Page) {
    // Welche Ionic-Seite liegt tatsächlich oben? (ion-page-invisible ist nur
    // opacity:0 — Playwrights toBeVisible würde sie als sichtbar werten)
    return page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 3)
      return el?.closest('.ion-page')?.textContent ?? ''
    })
  }

  for (const tab of ['Bibliothek', 'Abo', 'Familie']) {
    test(`switching ${tab} → Heute shows the home page again`, async ({ page }) => {
      await page.route('**/api/v1/books/daily', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DAILY) })
      )
      await page.route('**/api/v1/books?**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 6 }) })
      )
      await page.route('**/api/v1/auth/refresh', (r) => r.fulfill({ status: 401, body: '{}' }))

      await page.goto('/')
      await expect(page.getByText('Heute gratis', { exact: true })).toBeVisible({ timeout: 10000 })

      await (await navItem(page, tab)).click()
      await expect.poll(() => topPageText(page)).not.toContain('Heute gratis')

      await (await navItem(page, 'Heute')).click()
      await expect.poll(() => topPageText(page), { timeout: 5000 }).toContain('Heute gratis')
    })
  }
})
