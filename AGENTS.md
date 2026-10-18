# Project implementation rules

- Keep the dashboard route accessible without a client-side sign-in gate while the temporary no-login entry flow is active, because landing-page “Get Started” must open the dashboard directly; user-specific data and backend actions still require valid authentication.