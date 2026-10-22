import { useEffect } from "react";
import { useLocation, useRouteMatch } from "react-router-dom";

const normalize = (path: string) => "/" + path.replace(/^\/+|\/+$/g, "");

/**
 * Setzt den Browser-Tab-Titel, solange die Seite angezeigt wird.
 *
 * Ionic hält besuchte Tab-Seiten im Hintergrund am Leben (mit ihrem eigenen
 * Route-Match, aber der aktuellen Location). Sie rendern bei jeder
 * Navigation und jedem Sprachwechsel mit — schreiben darf nur die Seite,
 * deren Match zur aktuellen URL passt. Beim Zurückkehren auf eine solche
 * Seite wird sie wieder aktiv und setzt ihren Titel erneut.
 */
export function usePageTitle(title: string): void {
  const match = useRouteMatch();
  const { pathname } = useLocation();
  // Ohne exakten eigenen Match (Seite außerhalb einer Route) gilt sie als aktiv
  const isActive =
    !match.isExact || normalize(match.url) === normalize(pathname);

  useEffect(() => {
    if (isActive) document.title = title;
  }, [title, isActive]);
}
