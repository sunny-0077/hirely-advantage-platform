type SignupResult = {
  session: unknown | null;
  user: { identities?: unknown[] } | null;
};

export function signupOutcome(result: SignupResult): "signed-in" | "confirmation" | "sign-in" {
  if (result.session) return "signed-in";
  if (!result.user || result.user.identities?.length === 0) return "sign-in";
  return "confirmation";
}