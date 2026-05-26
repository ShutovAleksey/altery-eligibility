# Doodle images

Brand doodle illustrations copied from the Altery Design System
([Storybook](https://design.altery.com/?path=/story/corporate-design-library-images-doodleimages--default)),
fetched 2026-05-26 from the built assets bundle (`/assets/doodle-image-*.svg`).
Filenames cleaned of Vite hash suffixes.

**Blue accent baked to `#002780`** (Altery primary navy) — the source SVGs
expose `var(--a, blue)` as the accent colour, but `<img>` tags don't pick
up CSS variables from the parent. Bake-in lets us use the doodles via
plain `<img src="...">` without an inline-SVG wrapper.

## Available doodles (33)

| File | Typical use |
|---|---|
| `access-denied.svg` | Permission errors, locked-account states |
| `approval.svg` | Successful approval, KYB pass |
| `bin.svg` | Delete confirmation |
| `checking.svg` | In-progress verification |
| `clear-l.svg` | Clear / reset action (large variant per Design System) |
| `coming-soon.svg` | Feature placeholder |
| `delete.svg` | Destructive action confirmation |
| `done.svg` | Completion state |
| `empty-folder.svg` | Empty-list state |
| `enter-code.svg` | Code-entry step (OTP, invitation) |
| `error.svg` | Generic error state |
| `face-id.svg` | Biometric prompt |
| `file-check.svg` | Document verification |
| `hack.svg` | Security / breach state |
| `log-in.svg` | Sign-in prompt |
| `no-access.svg` | Access restriction |
| `onboarding.svg` | Onboarding intro / welcome |
| `otp.svg` | OTP entry / verification |
| `passcode.svg` | Passcode setup / entry |
| `pending.svg` | Pending review state |
| `personal-account.svg` | Personal-account context |
| `phone.svg` | Phone verification |
| `problem-solving.svg` | Manual review / help-needed state |
| `question.svg` | FAQ / help / clarifying question |
| `refusal.svg` | Rejected application |
| `reject.svg` | Rejected payment / item |
| `reset.svg` | Reset action (password, settings) |
| `sca.svg` | Strong Customer Authentication prompt |
| `sca-device.svg` | SCA device-pairing step |
| `searching.svg` | Search / lookup state |
| `sign-up.svg` | Registration prompt |
| `waiting.svg` | Waiting / in-progress |
| `winner.svg` | Achievement / success celebration |

## Usage

```html
<img src="/images/doodles/done.svg" alt="" aria-hidden="true" width="120" height="120" />
```

All SVGs are 120×120 viewport. Set `width` and `height` explicitly so
the browser reserves layout space before the SVG paints.

## Refresh

When the design system ships new variants, re-fetch the bundle URL list
from `design.altery.com/assets/doodle-image-*.js`, strip the Vite hash
suffixes, and re-download. Document the date in this README.
