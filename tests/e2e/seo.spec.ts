import { test, expect } from '@playwright/test'

test.describe('SEO — Homepage', () => {
  test('has correct title containing Kibuka', async ({ page }) => {
    await page.goto('/')
    const title = await page.title()
    expect(title).toContain('Kibuka')
  })

  test('has meta description with meaningful length', async ({ page }) => {
    await page.goto('/')
    const metaDescription = page.locator('meta[name="description"]')
    const content = await metaDescription.getAttribute('content')
    expect(content).toBeTruthy()
    expect((content ?? '').length).toBeGreaterThan(50)
  })

  test('has Open Graph title tag', async ({ page }) => {
    await page.goto('/')
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveCount(1)
    const ogContent = await ogTitle.getAttribute('content')
    expect(ogContent).toContain('Kibuka')
  })

  test('has Open Graph description tag', async ({ page }) => {
    await page.goto('/')
    const ogDesc = page.locator('meta[property="og:description"]')
    await expect(ogDesc).toHaveCount(1)
  })

  test('has Open Graph image tag', async ({ page }) => {
    await page.goto('/')
    const ogImage = page.locator('meta[property="og:image"]')
    await expect(ogImage).toHaveCount(1)
    const src = await ogImage.getAttribute('content')
    expect(src).toBeTruthy()
  })

  test('has Twitter card meta tags', async ({ page }) => {
    await page.goto('/')
    const twitterCard = page.locator('meta[name="twitter:card"]')
    await expect(twitterCard).toHaveCount(1)
  })

  test('has JSON-LD structured data', async ({ page }) => {
    await page.goto('/')
    const jsonLd = page.locator('script[type="application/ld+json"]')
    await expect(jsonLd).toHaveCount(1)
    const jsonContent = await jsonLd.textContent()
    expect(jsonContent).toBeTruthy()
    // Validate it parses as valid JSON
    expect(() => JSON.parse(jsonContent ?? '')).not.toThrow()
    const parsed = JSON.parse(jsonContent ?? '')
    // Must contain WebSite or Organization type
    const graph = parsed['@graph'] as Array<{ '@type': string }>
    const types = graph.map((node) => node['@type'])
    expect(types).toContain('WebSite')
  })

  test('html lang attribute is set', async ({ page }) => {
    await page.goto('/')
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
    expect(lang).toBe('de')
  })
})

test.describe('SEO — Pricing Page', () => {
  test('pricing page title contains Kibuka', async ({ page }) => {
    await page.goto('/pricing')
    const title = await page.title()
    expect(title).toContain('Kibuka')
  })

  test('pricing page has meta description', async ({ page }) => {
    await page.goto('/pricing')
    const metaDescription = page.locator('meta[name="description"]')
    const content = await metaDescription.getAttribute('content')
    expect(content).toBeTruthy()
  })
})

test.describe('SEO — Library Page', () => {
  test('library page title contains Kibuka', async ({ page }) => {
    await page.route('/api/v1/books*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 12 }),
      })
    )

    await page.goto('/library')
    const title = await page.title()
    expect(title).toContain('Kibuka')
  })
})

test.describe('SEO — robots.txt & sitemap', () => {
  test('robots.txt is accessible', async ({ page }) => {
    const response = await page.request.get('/robots.txt')
    expect(response.status()).toBeLessThan(404)
  })

  test('sitemap.xml is accessible', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml')
    expect(response.status()).toBeLessThan(404)
  })

  test('llms.txt is accessible for GEO', async ({ page }) => {
    const response = await page.request.get('/llms.txt')
    expect(response.status()).toBeLessThan(404)
  })
})
