# Roadmap

- [x] Restore sign-in-required dashboard entry, superseding the temporary no-login flow.
- [ ] Connect an eligible payment provider; blocked by declined Razorpay connection and unconfirmed international recurring support.
- [ ] Build subscription checkout; blocked by payment provider connection.
- [x] Remove auth callback lock/racing plan writes; enable managed Google/Lovable sign-in and email signup with confirmation and onboarding.
- [x] Verify Google authorization from fresh preview telemetry showing a successful Google session and account read.
- [x] Add and verify employer job posting, candidate document submission, keyword matching, and employer review/status updates.
- [x] Reproduce and correct misleading signup confirmation for an existing verified Google account; add confirmation resend and alternate-email controls with cooldown.
- [ ] Verify delivery to an inbox for a genuinely new email signup; mailbox access is unavailable.