import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Die sichtbare Hauptnavigation: auf dem Handy die Tableiste unten, ab
 * 1024 px die Navigation oben (die Tableiste ist dort ausgeblendet).
 */
export async function mainNav(page: Page): Promise<Locator> {
  const tabBar = page.locator('ion-tab-bar')
  await tabBar.or(page.locator('header nav:visible')).first().waitFor()
  if (await tabBar.isVisible()) return tabBar
  // Während eines Seitenwechsels sind kurz zwei Seiten (und zwei Köpfe)
  // sichtbar — warten, bis der Übergang fertig ist
  const nav = page.locator('header nav:visible')
  await expect(nav).toHaveCount(1)
  return nav
}

/** Ein Eintrag der Hauptnavigation, egal ob Tab oder Link oben. */
export async function navItem(page: Page, label: string): Promise<Locator> {
  const nav = await mainNav(page)
  return (await page.locator('ion-tab-bar').isVisible())
    ? nav.locator('ion-tab-button', { hasText: label })
    : nav.getByRole('link', { name: label, exact: true })
}
