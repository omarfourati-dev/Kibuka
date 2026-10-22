import { test, expect } from '@playwright/test'

// TDD RED: Pflichtangaben für den Verkauf an Verbraucher —
// Impressum/Datenschutz von jeder Seite, Kündigungsbutton (§ 312k BGB)
// ohne Login, Widerrufsverzicht vor dem Abo-Kauf (§ 356 Abs. 5 BGB).

const RECEIPT = {
  reference: '11111111-2222-3333-4444-555555555555',
  received_at: '2026-10-22T18:30:05+00:00',
  name: 'Omar Fourati',
  email: 'omar@example.com',
  kind: 'ordinary',
  reason: null,
  contract_reference: null,
}

test.describe('Rechtliche Pflichtangaben', () => {
  for (const path of ['/', '/library', '/pricing', '/profile']) {
    test(`${path} links imprint, privacy and the cancellation button`, async ({ page }) => {
      await page.goto(path)
      const footer = page.getByRole('contentinfo')
      await expect(footer.getByRole('link', { name: 'Impressum' })).toBeAttached()
      await expect(footer.getByRole('link', { name: 'Datenschutz' })).toBeAttached()
      await expect(
        footer.getByRole('link', { name: 'Verträge hier kündigen' }),
      ).toBeAttached()
    })
  }

  test('anyone can cancel without login and gets a receipt', async ({ page }) => {
    await page.route('**/api/v1/contracts/cancellation', (route) =>
      route.fulfill({ status: 201, json: RECEIPT }),
    )
    await page.goto('/pricing')
    await page.getByRole('link', { name: 'Verträge hier kündigen' }).click()
    await expect(page).toHaveURL(/\/kuendigen$/)

    await page.getByLabel(/name/i).fill('Omar Fourati')
    await page.getByLabel(/e-mail/i).fill('omar@example.com')
    await page.getByRole('button', { name: 'Jetzt kündigen' }).click()

    await expect(page.getByRole('heading', { name: /eingegangen/i })).toBeVisible()
    await expect(page.getByText(RECEIPT.reference)).toBeVisible()
  })

  test('pricing asks for the withdrawal waiver', async ({ page }) => {
    await page.goto('/pricing')
    const waiver = page.getByRole('checkbox', { name: /widerrufsrecht/i })
    await expect(waiver).toBeVisible()
    await expect(waiver).not.toBeChecked()
  })
})
