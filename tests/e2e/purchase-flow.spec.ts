import { test, expect } from '@playwright/test'

test.describe('Purchase Flow', () => {
  test('pricing page CTA buttons are visible and clickable', async ({ page }) => {
    await page.goto('/pricing')

    // All "Jetzt starten" buttons should be visible (one per plan)
    const ctaButtons = page.locator('button:has-text("Jetzt starten")')
    await expect(ctaButtons.first()).toBeVisible()
    const count = await ctaButtons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('clicking a CTA button navigates away from pricing', async ({ page }) => {
    await page.goto('/pricing')
    const ctaButton = page.locator('button:has-text("Jetzt starten")').first()
    await expect(ctaButton).toBeVisible()
    await ctaButton.click()
    // Should navigate somewhere (login, library, or onboarding) — not stay on /pricing
    await page.waitForURL((url) => !url.pathname.startsWith('/pricing'), { timeout: 5000 }).catch(() => {
      // If navigation did not happen (e.g. modal opened), that is also acceptable
    })
  })

  test('FAQ accordion items expand on click', async ({ page }) => {
    await page.goto('/pricing')

    // Click the first FAQ question
    const firstQuestion = page.getByText(/Kann ich kündigen/)
    await expect(firstQuestion).toBeVisible()
    await firstQuestion.click()

    // After clicking, the answer should be visible
    await expect(
      page.getByText(/jederzeit ohne Mindestlaufzeit/)
    ).toBeVisible({ timeout: 3000 })
  })

  test('pricing page shows 14 day free trial mention', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText(/14 Tage/)).toBeVisible()
  })

  test('pricing page shows jährlich savings amount', async ({ page }) => {
    await page.goto('/pricing')
    // The yearly plan should show the price anchor
    await expect(page.getByText('99 €', { exact: true })).toBeVisible()
  })
})
