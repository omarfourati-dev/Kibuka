import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "react-router-dom";
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

const Fallback = () => (
  <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">
    Loading...
  </div>
);

const lazyPage = (Page: React.LazyExoticComponent<() => JSX.Element>) =>
  function LazyPage() {
    return (
      <Suspense fallback={<Fallback />}>
        <Page />
      </Suspense>
    );
  };

function MainTabs() {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/" component={lazyPage(HomePageKibuka)} />
        <Route exact path="/library" component={lazyPage(LibraryPage)} />
        <Route exact path="/books" component={lazyPage(LibraryPage)} />
        <Route
          exact
          path="/books/:bookId"
          component={lazyPage(BookDetailPage)}
        />
        <Route exact path="/pricing" component={lazyPage(PricingPage)} />
        <Route exact path="/profile" component={lazyPage(ProfilePage)} />
      </IonRouterOutlet>
      <IonTabBar slot="bottom" className="kibuka-tab-bar">
        <IonTabButton tab="home" href="/">
          <IonIcon aria-hidden="true" icon={homeOutline} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="library" href="/library">
          <IonIcon aria-hidden="true" icon={libraryOutline} />
          <IonLabel>Bibliothek</IonLabel>
        </IonTabButton>
        <IonTabButton tab="pricing" href="/pricing">
          <IonIcon aria-hidden="true" icon={pricetagsOutline} />
          <IonLabel>Preise</IonLabel>
        </IonTabButton>
        <IonTabButton tab="profile" href="/profile">
          <IonIcon aria-hidden="true" icon={personCircleOutline} />
          <IonLabel>Profil</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <ErrorBoundary>
          <Switch>
            {/* Fullscreen routes without tab bar */}
            <Route
              exact
              path="/books/:bookId/read"
              component={lazyPage(ReaderPage)}
            />
            <Route exact path="/landing" component={lazyPage(LandingPage)} />
            <Route exact path="/login" component={lazyPage(LoginPage)} />

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
                    component={lazyPage(DashboardPage)}
                  />
                  <Route
                    exact
                    path="/app/spaces"
                    component={lazyPage(SpacesPage)}
                  />
                  <Route
                    exact
                    path="/app/settings"
                    component={lazyPage(SettingsPage)}
                  />
                  <Route path="/app/admin" component={lazyPage(AdminPage)} />
                </Suspense>
              </AppLayout>
            </ProtectedRoute>

            {/* Tab navigation (Home, Library, Pricing, Book Detail) */}
            <Route path="/" component={MainTabs} />
          </Switch>
        </ErrorBoundary>
      </IonReactRouter>
    </IonApp>
  );
}
