# Mobile Release Guide — Play Store & App Store

This app is a TanStack Start web app with **server functions** (the Gemini AI calls run
server-side using `GEMINI_API_KEY`). That key must never ship inside a mobile binary, so the
mobile apps are **Capacitor shells that load your hosted deployment**. The release path has
three stages: deploy the backend, build the shells, submit to stores.

---

## Stage 1 — Deploy the web app (required first)

The AI features need a server. Deploy to any Node-compatible host:

1. Push the repo to GitHub.
2. Create a project on **Vercel** (or Netlify/Railway/Fly.io). TanStack Start is supported
   out of the box on Vercel — it detects Vite and builds with `bun run build`.
3. Set the environment variable `GEMINI_API_KEY` in the host's dashboard
   (get a key at https://aistudio.google.com/apikey).
4. Deploy and verify: open the site, draw on a board, and run an AI Studio generation.
5. Note your production URL (e.g. `https://slate.vercel.app`) — you'll need it below.

The deployed site is already a **PWA**: `public/manifest.webmanifest` + `public/sw.js` make
it installable from the browser with basic offline support. Android users can install it
without the Play Store at all if you want a zero-review distribution channel.

## Stage 2 — Build the native shells (run on your Mac)

Prerequisites: Xcode (for iOS), Android Studio (for Android), and CocoaPods (`brew install cocoapods`).

```bash
# 1. Install Capacitor
bun run mobile:setup

# 2. Point the shell at your deployment
#    Edit capacitor.config.json → "server.url": "https://YOUR-REAL-DOMAIN.com"

# 3. Create the native projects (creates android/ and ios/ folders)
bun run mobile:add

# 4. Build the web assets and sync them into the native projects
bun run mobile:sync

# 5. Open in the IDEs
bun run mobile:android   # opens Android Studio
bun run mobile:ios       # opens Xcode
```

Because `server.url` is set, the shell loads your live site — every web deploy updates the
app instantly, with no store re-review for content changes.

### App identity

- `appId` is `com.slate.whiteboard` in `capacitor.config.json`. **Change it** to a domain
  you own reversed (e.g. `com.yourname.slate`) *before* first store upload — it can't be
  changed afterwards.
- Icons: replace `public/icons/*` with your branded set, then regenerate native icons with
  `bunx @capacitor/assets generate` (put a 1024×1024 `icon.png` in `assets/`).

## Stage 3 — Store submission

### Google Play (typically 1–3 days review)

1. Create a Play Console account ($25 one-time): https://play.google.com/console
2. In Android Studio: **Build → Generate Signed Bundle** → create a keystore
   (back it up — losing it means you can never update the app) → build an `.aab`.
3. In Play Console: create the app → upload the `.aab` to an internal testing track →
   fill in the store listing (title, descriptions, screenshots — take them on a phone
   and a 7"/10" tablet), content rating questionnaire, data-safety form
   (declare: user content stored on-device; prompts sent to your server/Google Gemini).
4. Promote to production when internal testing looks good.

### Apple App Store (typically 1–3 days review, stricter)

1. Enroll in the Apple Developer Program ($99/year): https://developer.apple.com
2. In Xcode: set your Team + bundle ID, then **Product → Archive** → upload via the Organizer.
3. In App Store Connect: create the app, attach the build, fill in the listing + privacy
   labels (same declarations as Play).
4. **Important — 4.2 "minimum functionality" rule:** Apple rejects apps that are plain
   website wrappers. Mitigate by integrating a couple of native capabilities before
   submitting, e.g. `@capacitor/haptics` on drawing/flashcard flips, `@capacitor/share`
   for board PNG export, and `@capacitor/filesystem` for saving exports to Files. These
   are drop-in Capacitor plugins; add them where the web export/share buttons already exist.

## Integrations checklist

| Integration | Status | Where |
|---|---|---|
| Gemini AI (chat, generation, study plans) | ✅ built in | server fns, needs `GEMINI_API_KEY` on host |
| PWA install + offline shell | ✅ built in | `manifest.webmanifest`, `sw.js` |
| Capacitor Android/iOS | ✅ configured | `capacitor.config.json`, `mobile:*` scripts |
| Haptics / Share / Filesystem (Apple 4.2 mitigation) | ⬜ add before iOS submission | `bun add @capacitor/haptics @capacitor/share @capacitor/filesystem` |
| Accounts + cloud sync (multi-device) | ⬜ future | needs a backend DB (PRD Docs 7–8, 15) |
| Push notifications (revision reminders) | ⬜ future | `@capacitor/push-notifications` + FCM/APNs |

## Current limitation to know about

All user data (boards, notes, learning progress) lives in **localStorage on the device**.
That's fine for a v1 launch (fully offline, zero infrastructure), but users can't sync
between phone and desktop, and clearing browser/app data erases their work. Cloud sync
(PRD Doc 15) is the first post-launch backend project; until then, the JSON board export
is the user-facing backup mechanism.
