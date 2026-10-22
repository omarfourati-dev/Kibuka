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

test.describe('SEO — Sprach-Landingpages', () => {
  for (const [path, lang, dir] of [
    ['/ar', 'ar', 'rtl'],
    ['/fr', 'fr', 'ltr'],
    ['/en', 'en', 'ltr'],
  ] as const) {
    test(`${path} opens the home page with <html lang="${lang}" dir="${dir}">`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.locator('html')).toHaveAttribute('lang', lang)
      await expect(page.locator('html')).toHaveAttribute('dir', dir)
    })
  }

  test('leaving a language page restores German', async ({ page }) => {
    await page.goto('/ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.goto('/library')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
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

  // sitemap.xml und llms.txt kommen seit dem SEO-Umbau dynamisch vom Backend
  // (alle Bücher) — abgedeckt in apps/backend/tests/integration/test_seo_api.py

  test('robots.txt invites AI search crawlers but keeps private areas closed', async ({ page }) => {
    const text = await (await page.request.get('/robots.txt')).text()
    for (const bot of ['OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
      expect(text).toContain(`User-agent: ${bot}`)
    }
    expect(text).toContain('Disallow: /books/*/read')
    expect(text).toContain('Sitemap: https://kibuka.omarfourati.de/sitemap.xml')
  })

  test('index.html carries the SSI hooks for server-side SEO rendering', async ({ page }) => {
    const html = await (await page.request.get('/')).text()
    expect(html).toContain('<!--# include virtual="/__seo/head$seo_path"')
    expect(html).toContain('<!--# include virtual="/__seo/body$seo_path"')
  })
})

test.describe('PWA — Installation auf dem Home-Bildschirm', () => {
  test('links a web app manifest with name, standalone display and icons', async ({ page }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()

    const res = await page.request.get(href!)
    expect(res.status()).toBe(200)
    const manifest = await res.json()
    expect(manifest.name).toContain('Kibuka')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    const sizes = (manifest.icons as Array<{ sizes: string }>).map((i) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  })

  test('has an iOS home-screen icon and full-screen meta tags', async ({ page }) => {
    await page.goto('/')
    const icon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
    expect(icon).toBeTruthy()
    expect((await page.request.get(icon!)).status()).toBe(200)

    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Kibuka')
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1)
    // Notch/Dynamic Island: Inhalt bis an den Rand, Ionic setzt die Safe Areas
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/)
  })
})
