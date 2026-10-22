import { test, expect, type Page } from '@playwright/test'

// Wer über /ar, /fr oder /en kommt, soll die ganze App in seiner Sprache
// sehen — und die Sprache beim Navigieren nicht wieder verlieren.

const DAILY = {
  id: 'daily-1', theme: 'animals', age_range: '3-5', cover_image_url: null,
  is_daily_book: true, published_at: new Date().toISOString(), page_count: 6,
  price_single: 0,
  titles: { de: 'Lilly, die kleine Füchsin', ar: 'ليلى الثعلبة الصغيرة', fr: 'Lilly, la petite renarde' },
}

async function mockApi(page: Page) {
  await page.route('**/api/v1/books/daily', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DAILY) })
  )
  await page.route('**/api/v1/books?**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ items: [DAILY], total: 1, page: 1, page_size: 6 }) })
  )
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill({ status: 401, body: '{}' }))
}

/** Text der Ionic-Seite, die tatsächlich oben liegt (siehe reading-flow.spec.ts). */
function topPageText(page: Page) {
  return page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 3)
    return el?.closest('.ion-page')?.textContent ?? ''
  })
}

const tab = (page: Page, label: string) => page.locator('ion-tab-button', { hasText: label })

test.describe('Sprache der App', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
  })

  test('/ar shows the whole interface in Arabic, right-to-left', async ({ page }) => {
    await page.goto('/ar')
    await expect(page.getByText('قصة اليوم').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'ليلى الثعلبة الصغيرة' })).toBeVisible()

    const tabBar = page.locator('ion-tab-bar')
    for (const label of ['الرئيسية', 'المكتبة', 'الأسعار', 'حسابي']) {
      await expect(tabBar.getByText(label)).toBeVisible()
    }
    await expect(tabBar).not.toContainText('Bibliothek')
    await expect(page.getByText('Buch des Tages')).toHaveCount(0)

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page).toHaveTitle('Kibuka – قصص أطفال بالعربية: قصة مصوّرة جديدة كل يوم')
  })

  test('/ar keeps Arabic across tabs and Home leads back to /ar', async ({ page }) => {
    await page.goto('/ar')
    await expect(page.getByText('قصة اليوم').first()).toBeVisible({ timeout: 10000 })

    await tab(page, 'المكتبة').click()
    await expect(page).toHaveURL(/\/library$/)
    await expect.poll(() => topPageText(page)).toContain('كل اللغات')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page).toHaveTitle('المكتبة – قصص أطفال بأربع لغات | Kibuka')

    await tab(page, 'الرئيسية').click()
    await expect(page).toHaveURL(/\/ar$/)
    await expect.poll(() => topPageText(page), { timeout: 5000 }).toContain('قصة اليوم')
    await expect(page).toHaveTitle('Kibuka – قصص أطفال بالعربية: قصة مصوّرة جديدة كل يوم')
  })

  test('the chosen language survives opening another page directly', async ({ page }) => {
    await page.goto('/ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

    await page.goto('/pricing')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.getByRole('heading', { name: 'أسئلة شائعة' })).toBeVisible({ timeout: 10000 })
  })

  test('the browser tab title follows SPA navigation (/fr → Tarifs)', async ({ page }) => {
    await page.goto('/fr')
    await expect(page).toHaveTitle('Kibuka – Livres pour enfants bilingues : une histoire par jour')

    await tab(page, 'Tarifs').click()
    await expect(page).toHaveTitle('Tarifs – abonnement livres pour enfants | Kibuka')

    await tab(page, 'Profil').click()
    await expect(page).toHaveTitle('Profil | Kibuka')
  })

  test('switching back to German in the profile', async ({ page }) => {
    await page.goto('/ar')
    await tab(page, 'حسابي').click()
    await page.getByRole('button', { name: 'Deutsch' }).click()

    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(tab(page, 'Bibliothek')).toBeVisible()

    await tab(page, 'Home').click()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(() => topPageText(page), { timeout: 5000 }).toContain('Buch des Tages')
  })
})
