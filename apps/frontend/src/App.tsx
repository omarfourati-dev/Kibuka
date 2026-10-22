import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import {
  homeOutline,
  libraryOutline,
  personCircleOutline,
  pricetagsOutline,
} from "ionicons/icons";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdSenseLoader } from "./components/ads/AdSenseLoader";
import { DocumentLanguage } from "./components/DocumentLanguage";
import { useAppLanguage } from "./hooks/useAppLanguage";
import { homePathFor } from "./lib/locale";

const LandingPage = lazy(() => import("./pages/public/Landing"));
const LoginPage = lazy(() => import("./pages/public/Login"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const DashboardPage = lazy(() => import("./pages/app/Dashboard"));
const SpacesPage = lazy(() => import("./pages/app/Spaces"));
const SettingsPage = lazy(() => import("./pages/app/Settings"));
const AdminPage = lazy(() => import("./pages/app/Admin"));

// Kibuka book routes
const HomePageKibuka = lazy(() => import("./pages/HomePage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const BookDetailPage = lazy(() => import("./pages/BookDetailPage"));
const ReaderPage = lazy(() => import("./pages/ReaderPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function Fallback() {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">
      {t("app.loading")}
    </div>
  );
}

const lazyPage = (Page: React.LazyExoticComponent<() => JSX.Element>) =>
  function LazyPage() {
    return (
      <Suspense fallback={<Fallback />}>
        <Page />
      </Suspense>
    );
  };

// Stabile Komponenten-Identität: lazyPage() erzeugt bei jedem Aufruf einen
// NEUEN Komponententyp. Inline im JSX hätte jedes Rendern alle Seiten neu
// montiert — Ionic verlor dabei die Seiten für seine Übergänge und ließ die
// Zielseite unsichtbar stehen (Bug 22.10.: Zurück zu Home ging nicht).
const HomePageKibukaRoute = lazyPage(HomePageKibuka);
const LibraryPageRoute = lazyPage(LibraryPage);
const BookDetailPageRoute = lazyPage(BookDetailPage);
const PricingPageRoute = lazyPage(PricingPage);
const ProfilePageRoute = lazyPage(ProfilePage);
const ReaderPageRoute = lazyPage(ReaderPage);
const LandingPageRoute = lazyPage(LandingPage);
const LoginPageRoute = lazyPage(LoginPage);
const DashboardPageRoute = lazyPage(DashboardPage);
const SpacesPageRoute = lazyPage(SpacesPage);
const SettingsPageRoute = lazyPage(SettingsPage);
const AdminPageRoute = lazyPage(AdminPage);

const TAB_PATHS = [
  "/",
  "/ar",
  "/fr",
  "/en",
  "/library",
  "/books",
  "/books/:bookId",
  "/pricing",
  "/profile",
];

function MainTabs() {
  const { t } = useTranslation();
  // Home führt zur Startseite der aktuellen Sprache (/ar, /fr, /en oder /)
  const homePath = homePathFor(useAppLanguage());

  return (
    <IonTabs>
      <IonRouterOutlet>
        {/* Sprach-Landingpages: dieselbe Startseite — die Sprache setzt
            DocumentLanguage anhand der URL */}
        <Route exact path="/" component={HomePageKibukaRoute} />
        <Route exact path="/ar" component={HomePageKibukaRoute} />
        <Route exact path="/fr" component={HomePageKibukaRoute} />
        <Route exact path="/en" component={HomePageKibukaRoute} />
        <Route exact path="/library" component={LibraryPageRoute} />
        <Route exact path="/books" component={LibraryPageRoute} />
        <Route exact path="/books/:bookId" component={BookDetailPageRoute} />
        <Route exact path="/pricing" component={PricingPageRoute} />
        <Route exact path="/profile" component={ProfilePageRoute} />
      </IonRouterOutlet>
      <IonTabBar slot="bottom" className="kibuka-tab-bar">
        <IonTabButton tab="home" href={homePath}>
          <IonIcon aria-hidden="true" icon={homeOutline} />
          <IonLabel>{t("tabs.home")}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="library" href="/library">
          <IonIcon aria-hidden="true" icon={libraryOutline} />
          <IonLabel>{t("tabs.library")}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="pricing" href="/pricing">
          <IonIcon aria-hidden="true" icon={pricetagsOutline} />
          <IonLabel>{t("tabs.pricing")}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="profile" href="/profile">
          <IonIcon aria-hidden="true" icon={personCircleOutline} />
          <IonLabel>{t("tabs.profile")}</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AdSenseLoader />
        <DocumentLanguage />
        <ErrorBoundary>
          <Switch>
            {/* Fullscreen routes without tab bar */}
            <Route
              exact
              path="/books/:bookId/read"
              component={ReaderPageRoute}
            />
            <Route exact path="/landing" component={LandingPageRoute} />
            <Route exact path="/login" component={LoginPageRoute} />

            {/* Protected template area */}
            <ProtectedRoute path="/app">
              <AppLayout>
                <Suspense fallback={<Fallback />}>
                  <Route
                    exact
                    path="/app"
                    render={() => <Redirect to="/app/dashboard" />}
                  />
                  <Route
                    exact
                    path="/app/dashboard"
                    component={DashboardPageRoute}
                  />
                  <Route exact path="/app/spaces" component={SpacesPageRoute} />
                  <Route
                    exact
                    path="/app/settings"
                    component={SettingsPageRoute}
                  />
                  <Route path="/app/admin" component={AdminPageRoute} />
                </Suspense>
              </AppLayout>
            </ProtectedRoute>

            {/* Tab navigation (Home, Library, Pricing, Book Detail, Profil).
                Nur bekannte Pfade — eine pfadlose Route INNERHALB des
                IonRouterOutlet matcht jede URL und blockierte den Wechsel
                zurück zu Home (Bug 22.10.). */}
            <Route exact path={TAB_PATHS} component={MainTabs} />

            {/* 404: unbekannte Pfade zurück zur Startseite */}
            <Route render={() => <Redirect to="/" />} />
          </Switch>
        </ErrorBoundary>
      </IonReactRouter>
    </IonApp>
  );
}
