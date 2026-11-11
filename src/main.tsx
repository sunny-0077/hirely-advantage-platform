import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");

function isRootBlank() {
  if (!rootElement) return false;
  return rootElement.childElementCount === 0 || rootElement.textContent?.trim() === "";
}

function renderStartupError(error: unknown) {
  const message = error instanceof Error ? error.message : "The app could not start.";
  if (!rootElement) return;

  rootElement.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:hsl(var(--background, 240 25% 98.5%));color:hsl(var(--foreground, 226 19% 13%));padding:24px;font-family:Inter,-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;">
      <section style="width:100%;max-width:460px;border:1px solid hsl(var(--border, 226 20% 90%));background:hsl(var(--card, 0 0% 100%));border-radius:18px;padding:24px;box-shadow:0 24px 70px -28px hsl(var(--foreground, 226 19% 13%) / 0.28);">
        <p style="margin:0;color:hsl(var(--muted-foreground, 226 10% 48%));font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">App recovery</p>
        <h1 style="margin:10px 0 0;font-size:26px;line-height:1.15;font-weight:750;letter-spacing:0;">Something failed to load.</h1>
        <p style="margin:12px 0 0;color:hsl(var(--muted-foreground, 226 10% 48%));font-size:14px;line-height:1.65;">The app caught a startup problem instead of showing a blank white screen.</p>
        <p data-startup-message style="margin:14px 0 0;border:1px solid hsl(var(--border, 226 20% 90%));background:hsl(var(--muted, 240 15% 95%));border-radius:12px;padding:12px;color:hsl(var(--muted-foreground, 226 10% 48%));font-size:12px;line-height:1.55;overflow-wrap:anywhere;"></p>
        <button type="button" style="margin-top:18px;width:100%;height:42px;border:0;border-radius:12px;background:hsl(var(--primary, 226 19% 13%));color:hsl(var(--primary-foreground, 240 25% 98.5%));font-size:14px;font-weight:700;cursor:pointer;">Reload app</button>
      </section>
    </main>
  `;

  rootElement.querySelector("[data-startup-message]")!.textContent = message;
  rootElement.querySelector("button")?.addEventListener("click", () => window.location.reload());
}

window.addEventListener("error", (event) => {
  if (isRootBlank()) renderStartupError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  if (isRootBlank()) renderStartupError(event.reason);
});

async function startApp() {
  try {
    if (!rootElement) throw new Error("Missing root element.");

    const [appModule, boundaryModule] = await Promise.all([
      import("./App.tsx"),
      import("./components/AppErrorBoundary.tsx"),
      import("./index.css"),
    ]).then(([app, boundary]) => [app, boundary] as const);

    const App = appModule.default;
    const AppErrorBoundary = boundaryModule.AppErrorBoundary;

    createRoot(rootElement).render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>,
    );
  } catch (error) {
    console.error("App startup failed", error);
    renderStartupError(error);
  }
}

void startApp();
