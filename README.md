# Reloop

A hyper-local secondhand marketplace app — React + Vite frontend, Firebase (Auth + Firestore + Storage + Cloud Functions) backend.

## 1. Install Node

Node.js 18+ if you don't have it already: https://nodejs.org (LTS version).

## 2. Create your Firebase project

1. Go to https://console.firebase.google.com and click **Add project**. Name it whatever you like (e.g. "reloop").
2. Once it's created, click the **web icon (`</>`)** on the project overview page to register a web app. Give it a nickname, skip Firebase Hosting for now.
3. Firebase will show you a `firebaseConfig` object with keys like `apiKey`, `authDomain`, etc. Keep this tab open — you'll paste these into `.env.local` in the next section.
4. In the left sidebar, go to **Build → Authentication → Get started**. Enable two sign-in providers:
   - **Email/Password** — toggle it on.
   - **Google** — toggle it on, pick a support email.
5. In the left sidebar, go to **Build → Firestore Database → Create database**. Choose a region close to you (e.g. `europe-west3` for Stuttgart), and start in **production mode**.
6. In the left sidebar, go to **Build → Storage → Get started**. Same region, production mode. This is where listing photos live.
7. **Upgrade to the Blaze (pay-as-you-go) plan.** Click the plan name in the bottom-left of the console. Cloud Functions — used to enforce listing/photo limits server-side — can't deploy on the free Spark plan, even if you never exceed the free tier's usage. Normal dev/testing traffic for an app like this stays well within Firebase's free monthly quota, so you're unlikely to see charges, but the plan itself requires a billing account attached.

## 3. Connect the app to your project

1. In this project folder, copy `.env.example` to a new file called `.env.local`.
2. Paste the matching values from the `firebaseConfig` object (step 2.3 above) into `.env.local`:

   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=reloop-xxxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=reloop-xxxxx
   VITE_FIREBASE_STORAGE_BUCKET=reloop-xxxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

   `.env.local` is already in `.gitignore` so these keys won't get committed anywhere.

## 4. Get a free Gemini API key (for content moderation)

Every new listing gets checked by Gemini's vision model before it's allowed to go live — see "Content moderation" below for what it actually checks.

1. Go to https://aistudio.google.com/apikey and click **Create API key**. It's free — Google AI Studio's free tier covers normal usage for an app like this with no billing required for the key itself.
2. Copy the key. You'll set it as a secret in step 5, not in `.env.local` — it's used server-side only, never sent to the browser.

## 4b. Get a Google Maps API key (for address verification)

New accounts are asked for a pickup address right after signing up, and it's checked against Google's Geocoding API before being accepted — this is what stops someone typing a fake street or a random postal code.

1. Go to https://console.cloud.google.com/google/maps-apis, select (or create) the same project as your Firebase project.
2. Enable the **Geocoding API** specifically (APIs & Services → Library → search "Geocoding API" → Enable).
3. Create an API key (APIs & Services → Credentials → Create credentials → API key).
4. Set it as a secret (this key is used server-side only, in the `verifyAddress` function — never sent to the browser):
   ```
   firebase functions:secrets:set GOOGLE_MAPS_API_KEY
   ```

**Cost**: Google's free tier ($200/month credit) covers roughly 40,000 geocode requests before any charge — a single address check per signup means this stays free for a very long time at student-project volume.

## 4c. Get a free AfterShip API key (for real carrier verification)

Carrier-tracking verification is real now, not a stub — `functions/submitShipment.js` calls AfterShip's Tracking API to confirm a seller's tracking number is actually recognized by a real carrier before any money moves.

1. Sign up at https://www.aftership.com — the free plan covers **50 tracked shipments/month, no credit card required**. That's enough to test with and cover genuinely low volume; you'll want to check current pricing before this app has real ongoing sales, since AfterShip's paid tiers exist for a reason.
2. In the AfterShip dashboard, go to **Settings → API Keys → Create an API key**.
3. Set it as a secret:
   ```
   firebase functions:secrets:set AFTERSHIP_API_KEY
   ```

**If you skip this step**: `submitShipment` falls back to a format-only check (tracking number length ≥ 6 characters) and logs a loud warning — the same honest-but-weak behavior as before, not a hard failure. Don't treat that fallback as real verification; it exists so local development doesn't grind to a halt before you've set up a key, not as a legitimate alternative.

## 5. Deploy the rules and Cloud Functions

This needs the Firebase CLI:

```
npm install -g firebase-tools
firebase login
```

From this project's root folder:

```
firebase use --add
```

Pick your project when prompted. Set the required secrets (each prompts you to paste the value):

```
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

`STRIPE_SECRET_KEY` is your Stripe account's secret key (Stripe Dashboard → Developers → API keys — use the **test mode** key while you're building). `STRIPE_WEBHOOK_SECRET` you'll get in step 5b below, *after* the first deploy — it's fine to set a placeholder value now and update it later with the same command.

Then install the Cloud Functions' own dependencies and deploy everything:

```
cd functions
npm install
cd ..
firebase deploy --only firestore:rules,storage:rules,functions
```

That deploys four things at once:
- **`firestore.rules`** — anyone can browse listings, only the buyer or seller on an order can see/update it, listing photos can only be created (never overwritten) by their owner, and Stripe Connect status in `users/{uid}` is readable only by that user.
- **`storage.rules`** — photo uploads capped at 2MB, JPEG/WebP only, each user can only write into their own folder.
- **`functions/`** — `createListing`, `seedListings`, `enforcePhotoLimit`, plus the Stripe Connect functions (`createStripeConnectLink`, `getStripeAccountStatus`, `stripeWebhook`). Direct client writes to create a listing are denied by the Firestore rules above; the app calls these functions instead, which is where the active-listing limit, photo-count limit, and content moderation are actually, unbypassably enforced (see below).

If you'd rather click through the console instead of the CLI for the rules specifically, Firestore Database → Rules and Storage → Rules both have a paste-and-publish editor — but Cloud Functions and secrets can only be set via the CLI.

## 5b. Point Stripe at your webhook

After the deploy above finishes, it prints a URL for the `stripeWebhook` function — something like `https://<region>-<project>.cloudfunctions.net/stripeWebhook`. Copy it.

1. In the Stripe Dashboard, go to **Developers → Webhooks → Add endpoint**.
2. Paste the function URL as the endpoint URL.
3. Select these events: `account.updated` (keeps a seller's payout status in sync if Stripe re-verifies their details later), `payment_intent.succeeded` (this is what actually marks a listing sold and creates its order — checkout won't complete without it registered), and `payment_intent.payment_failed` (server-side visibility into failed payments).
4. Save, then click into the new endpoint and copy its **Signing secret** (starts with `whsec_`).
5. Set it as the real secret value: `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`, paste the `whsec_...` value.
6. Redeploy functions once more so the new secret takes effect: `firebase deploy --only functions`.

## 6. Run it

```
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`) — open it in your browser. It hot-reloads on save.

Sign up with an email/password or Google, then in the **Discover** tab tap **Load sample listings** to seed some starter data — that only fires once and does nothing if listings already exist.

## How buying/selling actually works

1. **Sign up** — creating an account requires a verified pickup address (checked against Google Geocoding) before you can do anything else. Editable later in Profile → Settings.
2. **List an item** — upload real photos, pick a category, a price tier (or mark it a free giveaway), and a package size (Small/Medium/Large — this sets the shipping cost). This calls `createListing`, which re-checks your active listing count, photo count, and runs Gemini content moderation before writing anything.
3. **Buy now** — opens Checkout (Stripe's Payment Element: card, Apple Pay, Google Pay). If the seller hasn't finished Stripe onboarding, checkout never opens at all — you see a "seller hasn't set up payments" message instead. Paying charges item + shipping in one go; the *entire* amount lands on Reloop's own Stripe balance, not the seller's.
4. Once Stripe confirms payment (via webhook — never trusted from the client), the order is created as **awaiting shipment**, with a 24-business-hour deadline for the seller to ship (weekends don't count against it). The listing itself is deleted from Firestore/Storage at this point — sold items don't linger.
5. **Seller ships** — Profile → Activity → Pickup shows what needs shipping. Tapping Ship package and submitting a tracking number (⚠️ carrier verification is currently a stub, see the shipping section below) triggers a real `stripe.transfers.create()` moving the seller's cut out of Reloop's balance and into theirs. Only then does the order become `completed`.
6. **Wallet** (Profile → Wallet) shows the seller's real Stripe Connect balance — available and pending — read live from Stripe's own balance API, with a refresh button. **Cancel** (only available before shipping) marks the order `cancelled` and counts toward missed drop-offs in Trust.

## What's here

- `src/App.jsx` — screen layout, tabs, phone-frame shell, photo upload UI
- `src/firebase.ts` — Firebase app/auth/Firestore/Storage/Functions init (reads `.env.local`)
- `src/context/AuthContext.tsx` — auth state + sign in/up/out
- `src/LoginScreen.tsx` — sign in/up screen
- `src/AddressSetup.tsx` — pickup address collection/verification (signup gate + Settings edit)
- `src/i18n/` — translation dictionaries, language context, and the switcher UI (see "Language switcher" below)
- `src/utils/image.ts` — client-side photo resize/compression before upload
- `src/data/listings.ts` — listings: realtime reads, create (via Cloud Function), mark-sold, seed, photo upload
- `src/data/orders.ts` — claiming a listing (atomic batch write), mark picked up / cancel
- `src/data/wallet.ts` — derives available/pending balance + transaction history from real orders and withdrawals
- `src/data/products.ts` — seed catalog + photo placeholder palette (not live data)
- `src/data/sellerPayments.ts` — live Stripe Connect status hook + onboarding-link trigger
- `src/data/localStore.ts` — IndexedDB wrapper for local-only data (recently viewed, search radius) — download/delete controls live in Profile → Your data
- `src/ProductView.tsx` — product detail screen (image carousel, buy/claim-free)
- `src/Checkout.tsx` — Stripe Payment Element checkout screen
- `src/ReceiptDetail.tsx` — full receipt view with QR code (buyer receipt, or the seller's printable green shipping-label receipt)
- `src/DataDisclosure.tsx` — contextual data/device-permissions summary
- `src/legal/` — Terms of Service, Privacy Policy, Data Processing Agreement, Refund Policy content + `LegalViewer.tsx` renderer
- `src/Cart.tsx` — cart screen, items grouped by seller with combined shipping
- `src/CartCheckout.tsx` — multi-item checkout screen (reuses Checkout.tsx's PayForm)
- `src/context/CartContext.tsx` — cart state, persisted locally via IndexedDB
- `src/data/cart.ts` — client wrapper for cart checkout
- `src/stripeClient.ts` — Stripe.js loader singleton
- `src/utils/price.ts` — shared buyer-price display constants (must stay in sync with `functions/checkout.js`)
- `src/utils/shipping.ts` — shared shipping rate display constants (must stay in sync with `functions/shipping.js`)
- `src/utils/sanitize.ts` — input sanitization for user-submitted text
- `src/ProfileScreen.tsx` — wallet, activity, trust, area, settings
- `src/icons/*.tsx` — bottom nav icons
- `src/icons/ClothingIcons.tsx` — hand-drawn category icons (dress, sneaker, jacket, bag, heels, pants) used in the hero rotation and Featured categories
- `functions/index.js` — `createListing`, `seedListings`, `enforcePhotoLimit`, plus re-exports of the Stripe Connect functions
- `functions/moderation.js` — the two-layer Gemini content check
- `functions/address.js` — `verifyAddress`, backed by Google Geocoding
- `functions/stripeConnect.js` — seller Stripe Connect onboarding: account creation, onboarding links, status sync, webhook (also handles payment_intent events)
- `functions/checkout.js` — `createPaymentIntent` (no immediate seller transfer — see shipping section) and the payment-succeeded handler
- `functions/submitShipment.js` — seller ships a package; verifies the tracking number via AfterShip's API; creates the real Stripe transfer once verified
- `functions/getSellerBalance.js` — reads the seller's real Stripe Connect balance
- `functions/shipping.js` — shipping rates + the business-hours ship-by deadline calculator
- `functions/receipt.js` — generates the 6-character receipt code
- `functions/cartCheckout.js` — multi-item cart checkout: one PaymentIntent split into per-seller orders after payment
- `firestore.rules` / `storage.rules` / `firebase.json` — security rules + deploy config (see step 4)

## Content moderation

Every listing's title, description, and photos get checked by Gemini (`gemini-2.0-flash`, via `functions/moderation.js`) inside `createListing`, before anything gets written to Firestore. It's two separate questions in one call, not one:

- **Layer 1 — Safety**: is any of this sexually explicit, violent, hateful, or otherwise unsafe?
- **Layer 2 — Marketplace fit**: even if it's "safe" in the SafeSearch sense, is it actually a clothing/shoes/bags/accessories item? A photo of a knife, medication, alcohol, or a vehicle isn't graphic or explicit — it's just not something Reloop sells — and layer 2 is what catches that, separately from layer 1.

If either layer fails, `createListing` throws and the person listing sees the model's plain-language reason (e.g. "This looks like a kitchen knife, not a clothing item") instead of a generic rejection.

**Cost**: Google AI Studio's free tier is generous enough that normal usage (a student project, even a few hundred listings a day) shouldn't cost anything. If you outgrow it, Gemini Flash's paid pricing is still cheap per image — check https://ai.google.dev/pricing for current numbers.

**If the check itself fails** (API down, key missing, quota hit — not "the listing got rejected," but "the check couldn't run at all"), the function is set to **fail open**: it logs the error and lets the listing through rather than taking listing creation down entirely. Flip `MODERATION_FAIL_OPEN` to `false` in `functions/index.js` if you'd rather block listings whenever the check can't run. Without a `GEMINI_API_KEY` secret set at all, moderation is skipped outright with a console warning — useful for testing without setting up the key immediately, but don't ship that way.

**Model name**: `gemini-2.0-flash` is current as of when this was built. If Google deprecates it, swap the `MODEL` constant at the top of `functions/moderation.js` — check https://ai.google.dev/gemini-api/docs/models for whatever's current.

## Upload limits

- **Per image**: resized client-side to fit within 1600px on the longest side and re-encoded (WebP where the browser supports it, JPEG fallback), stepping quality down until it's under ~1.5MB. `storage.rules` backs this up with a hard, non-negotiable 2MB / JPEG-or-WebP-only cap.
- **Per listing**: capped at 5 photos. Enforced twice — once in the picker UI, and again inside the `createListing` Cloud Function, which rejects a submission with more than `MAX_PHOTOS_PER_LISTING` images regardless of what the client sends.
- **Per user**: capped at 25 active listings at once. The `createListing` function runs a real Firestore count query (`sellerId == you AND status == active`) before writing — a modified client claiming otherwise doesn't matter, the function checks the actual number.
- **Photo-folder cleanup**: since Storage rules can't count how many files already exist in a folder, the `enforcePhotoLimit` function runs after every upload, checks how many photos exist for that listing, and deletes anything past the cap — so even direct-to-Storage uploads that skip the app entirely (bypassing `createListing`) can't leave more than 5 photos sitting in a listing's folder.
- **Storage rules**: each photo's path is `listings/{sellerUid}/{listingId}/{fileName}` — only the signed-in owner can write into their own folder, only `image/jpeg` or `image/webp` under 2MB is accepted, and files can never be overwritten (only created or deleted) since every upload gets a fresh timestamped filename.

## Rate limiting

Separate from the total-25-active-listings cap, `createListing` also throttles *speed*: a `rateLimits/{uid}` Firestore doc (written only by the function, `firestore.rules` denies any direct client access to it) tracks your last hour of listing-creation timestamps inside a transaction, so two simultaneous requests can't race past the limit. Right now that's:

- **5 seconds minimum** between one listing and the next.
- **10 listings max per rolling hour.**

Both constants live at the top of `functions/index.js` if you want to tune them. This only covers listing creation, since that's the only spam-able write action that exists right now (favoriting and buying don't really have an abuse case worth throttling — buying is inherently self-limiting since it takes one listing off the market per purchase).

## Data visibility

A quick pass on "does anyone see more than they should":

- Firestore rules already scope orders and withdrawals to the buyer/seller involved — nobody can query another user's private data.
- `rateLimits/{uid}` denies all direct client read/write — it's Admin-SDK-only.
- The main listings query (`useListings`) now caps at the 300 most recent listings instead of subscribing to the entire collection forever — not a privacy issue exactly, but it's the first thing that would make every client slower as the catalog grows, so it's capped as data-minimization/scale hygiene rather than showing everyone the full history of every listing ever created.

## Scale

I can't actually spin up 100 concurrent users against your live project from here — that needs real deployed infrastructure and a load-testing tool (k6 and Locust are the common free ones) pointed at your Firebase project. What I did instead was a code-level pass for the things that would visibly break first as usage grows:

- The listings query is now bounded (see "Data visibility" above) instead of unbounded.
- `createListing`'s active-listing count check and rate-limit check both use Firestore transactions/count-aggregation queries rather than reading and comparing client-side, so they stay correct under concurrent writes instead of racing.
- Cloud Functions scale automatically per-invocation on Firebase's infrastructure — the real ceiling under load is Firestore read/write quotas and Gemini API rate limits, not the function code itself.

If you want actual load-tested numbers before relying on this for real users, running `k6` or `Locust` against your deployed project (once it's live) would tell you where it actually breaks — that's a different exercise from what I can verify by reading code.

## Language switcher

Tap the globe icon next to the notification bell on Home to switch the app's language — English, German, Spanish, or French right now. It's a full app-UI translation system (`src/i18n/`), not just a label swap:

- `src/i18n/translations.ts` — one dictionary per language, plain key → string, with `{placeholder}` interpolation for dynamic bits ("You've reached the {limit} active listing limit.")
- `src/i18n/LanguageContext.tsx` — tracks the current language and exposes `t(key, vars)`; falls back to English for any key a language hasn't got, so nothing ever renders blank
- `src/i18n/LanguageSwitcher.tsx` — the picker itself
- The choice is saved locally (same IndexedDB store as the search radius preference), so it persists across sessions on that device

**What's covered**: every static piece of UI chrome — nav labels, buttons, section headers, empty states, form labels, validation errors, auth screen. **What's not**: anything that's actually data rather than UI text — listing titles/descriptions people type in, seller names, and error messages that come back from the Cloud Functions (like a moderation rejection reason, which is generated by Gemini in English). Translating user-generated content would mean routing it through a translation API on read, which is a different, separate feature from this one.

Adding a fifth language is just adding another entry to `LANGUAGES` in `translations.ts` and filling in a dictionary — no code changes needed elsewhere.

## Account data, export, and deletion

Profile → Your data has two real buttons, backed by two Cloud Functions (`functions/index.js`):

- **Download my data** calls `exportMyData`, which reads every listing you own, every order you're part of (as buyer or seller), and every withdrawal you've made, and combines it with the local IndexedDB export (recently viewed, search radius) into one JSON file.
- **Delete my data** calls `deleteMyAccount` — this is a real, permanent account deletion, not a local-only reset. It deletes every listing you own (and their Storage photos), your withdrawal records, your rate-limit tracking doc, clears the local IndexedDB store, and deletes the actual Firebase Auth account. You're signed out automatically once it finishes.

**The one deliberate exception**: orders aren't deleted outright. An order is a shared record between a buyer and a seller — deleting it would corrupt the *other* person's transaction history and trust count, which they have no say in. Instead, your name on any order you're part of gets replaced with "Deleted user"; the record survives for the other party, but nothing personally identifying about you does.

## Receipts & QR codes — phase 3 of 4

When a payment succeeds, a popup confirms it and points to Profile → Receipts (`ProductView.tsx`) — no more separate inline "finalizing" text, an actual modal.

Every order gets a **6-character receipt code** at creation time (`generateReceiptCode()` in `functions/receipt.js` — letters, digits, and a few symbols, deliberately excluding visually-ambiguous characters like `0`/`O` or `1`/`l`/`I`). It's generated once, server-side, and stored directly on the order document — since both the buyer and seller can already read that same document (existing `firestore.rules`), there's no need for two separately-generated codes that have to somehow match; they're both just reading the same field.

**Profile → Receipts** now lists orders from both sides — your purchases and your sales — sorted by date. Tapping one opens the full receipt (`ReceiptDetail.tsx`):

- **As a buyer**: standard receipt — item, date, total, the receipt code, and a QR code encoding `{ code, orderId, item, price }`.
- **As a seller, while the order is still awaiting shipment**: the receipt renders in green with an "Awaiting order receipt" badge, and additionally shows the buyer's name and full shipping address as large, readable text — meant to be printed (there's a literal Print button, `window.print()`) and used as a shipping label sticker. Its QR code encodes `{ sellerId, code }` — the same code as the buyer's receipt for that order, plus the seller's own ID, rather than the full order details (that's on the printed label as plain text already, which is what a courier actually needs to read).
- **As a seller, once shipped**: same receipt, no green badge — it's just a normal-styled confirmation at that point.

## Multi-item cart with split payment — phase 4 of 4

One checkout, one payment, split across however many original sellers were involved — buyers can now add multiple items (possibly from different sellers) and pay once.

### How it works

- **Cart** (`src/context/CartContext.tsx`) is just a list of listing IDs, persisted locally via IndexedDB (same mechanism as recently-viewed/preferences) — never touches Firestore. Add to cart from any product page (the small cart-icon button beside Buy now); the cart icon on Home shows a live count badge.
- **One PaymentIntent covers the whole cart** (`functions/cartCheckout.js`), even across multiple sellers. This works cleanly *because* of the phase 2 restructuring — since payment already lands on Reloop's own platform balance rather than auto-transferring via Stripe's single-destination model, there was never a technical reason a PaymentIntent had to correspond to exactly one seller. Splitting to multiple sellers now just means creating multiple orders after payment succeeds, each independently gated behind its own seller shipping their own item(s) — exactly the same mechanism single-item purchases already used.
- **Items from the same seller share one shipping charge and ship as one package** — "1 seller · 1 package," per the original idea. They're linked by a shared `cartGroupId` on their resulting orders. Shipping cost for the group uses the *largest* package size among that seller's cart items — a simplification, not a true combined-box volumetric calculation, in the same spirit as the flat S/M/L rates themselves.
- **Stripe's metadata size limit** would break under a real multi-item cart's full line-item breakdown, so the actual breakdown lives in a `cartCheckouts/{id}` Firestore doc (Admin-SDK-only, never client-readable) — the PaymentIntent's metadata just points at it.
- **Shipping, grouped**: Profile → Activity → Pickup now shows one row per seller-group instead of one per item — "3 items in this package" — with a single Ship package action that verifies one tracking number and creates **one combined Stripe transfer** summing every item's `sellerEarned` in the group, rather than a separate transfer per item.

### What I did NOT build

- The "add another item from this seller and save on shipping" nudge — the *mechanics* behind that (combined shipping, grouped orders) are real and working; the actual UI copy suggesting it to the buyer while browsing isn't implemented. Worth adding as a small follow-up if you want the nudge itself.
- The fancier "let Reloop pick shipping options dynamically via real carrier rates" idea mentioned alongside the original flat-rate ask — still flat S/M/L rates, same as phase 2, now just extended to groups.
- No cart persistence across devices — it's local to the browser/device (IndexedDB), same privacy posture as recently-viewed items. Signing in on a second device starts an empty cart there.

## Pickup address — phase 1 of 4 (roadmap: address → shipping → receipts → multi-item cart — all four phases done)

Every new account is required to add and verify a pickup address before reaching the main app (`AddressSetup.tsx`, gated in `App.jsx` right alongside the existing auth gate). It's not skippable at signup, but fully editable afterward via Profile → Settings → Pickup preferences.

- **Verification**: `functions/address.js` calls Google's Geocoding API and only accepts the address if Google can pin it to an actual building or street number (`location_type` of `ROOFTOP` or `RANGE_INTERPOLATED`, and not a `partial_match`) — a nonexistent street or a city-only address gets rejected with a specific reason, not a generic error.
- **Privacy**: stored on `users/{uid}`, which `firestore.rules` already restricts to self-read-only. Never exposed on a public listing or profile.
- **Where it actually gets used**: at payment time, `markOrderPaid` snapshots the buyer's *current* address onto the order itself (`shippingAddress` field) — not a live reference. If they change their address next week, an order from today still shows the address it actually needs to ship to. Only the buyer and seller on that specific order can read it (same `orders` rules as everything else).

This is the first of four planned phases discussed together — shipping (package size → cost), receipts with QR codes, and multi-item cart with split payment across sellers are next, roughly in that order, plus a larger rework of the order/payout status system (shipment verification gating when funds move from pending to available) that arrived alongside the shipping phase in planning. None of that is built yet — this phase is address collection only.

## Fixed pricing & platform fee

Sellers pick a selling price from a fixed set — €3 / €6 / €9 / €12 / €15 / €20 / €23 / €25 / €27 / €29 / €30 (see `PRICE_TIERS` in `App.jsx`) — rather than typing any number. Retail price (the crossed-out "was" price) stays freeform, since that's whatever the item actually cost new.

Reloop always keeps exactly **€1** on every paid sale (`PLATFORM_FEE_CENTS` in `functions/checkout.js`), but *who visibly absorbs it* differs by tier:
- **Every tier except €30**: the €1 is added on top of the listed price — the buyer pays `price + €1`, the seller receives the full listed price.
- **The €30 tier specifically**: the buyer pays exactly €30 (never more), and the €1 comes out of the seller's cut instead — they receive €29. This keeps €30 as a clean price ceiling for buyers.

`src/utils/price.ts` mirrors this for display (`buyerPrice()`) — if you change the fee or tiers, update both files.

## Seller payments (Stripe Connect) — phase 1 of 3

This is the **seller onboarding** piece only — the first of three planned phases toward the full Buy Now payment flow (seller onboarding → buyer checkout with Card/Apple Pay/Google Pay → giveaway logic and payment protection checks). What's built:

- **Profile → Settings → Payment / payout method** shows live status — a colored dot (grey "Not set up" / amber "Pending verification" / green "Active") plus a button that changes with it ("Set up payouts" → "Finish setup" → "Manage").
- Tapping it calls `createStripeConnectLink`, which creates a Stripe Connect **Express** account for that user (reusing one if it already exists) and opens Stripe's own hosted onboarding flow — collecting identity, bank details, etc. Reloop never sees or stores that information; Stripe does.
- When the seller finishes (or exits, or the link expires), Stripe redirects back into the app with `?stripe_return=1` or `?stripe_refresh=1`. `App.jsx` catches that on load, lands them on Profile, strips the query string, and forces a fresh status pull (`getStripeAccountStatus`) so the badge doesn't wait on the webhook to catch up.
- The `stripeWebhook` function keeps status in sync afterward too — if Stripe re-verifies or flags something days later, `account.updated` fires and updates Firestore without the user needing to reopen the app.
- Status lives in `users/{uid}` (`stripeAccountId`, `chargesEnabled`, `payoutsEnabled`, `detailsSubmitted`) — readable only by that user, writable only by the Cloud Functions' Admin SDK. A client can't fake "I'm set up" by writing to their own doc.

**Not built yet, on purpose** — these are later phases, not oversights:
- Buy Now doesn't check seller payment status yet. Nothing currently blocks a buyer from claiming a listing whose seller hasn't finished Stripe onboarding — that gate (`chargesEnabled` check before checkout) is phase 2.
- No actual checkout, card entry, Apple Pay, Google Pay, or PaymentIntents yet.
- No giveaway pricing logic.
- Account deletion (`deleteMyAccount`) removes Reloop's *record* of the Stripe account (the `users/{uid}` doc) but does not delete the Stripe Connect account itself — Stripe advises against deleting accounts with real transaction/payout history, so it just becomes orphaned on Stripe's side, unreferenced by the app.

## Shipping & shipment-gated payouts — phase 2 of 4

This is the big one — it changes how money actually moves, not just what the UI shows.

### What sellers see

Every listing now requires a package size at creation time — Small (€2.49) / Medium (€3.49) / Large (€5.49), flat rates, no weight or dimensions to fill in. Buyers see item price + shipping + total broken out, both in the product view and at checkout.

### What actually changed under the hood

Previously (phase 2's first draft, before this restructuring), a successful payment used a Stripe *destination charge* — `transfer_data.destination` on the PaymentIntent — which means Stripe automatically and immediately routes the seller's cut to their connected account the moment the charge succeeds. That's gone. Now:

1. **Payment succeeds** → the *entire* charge (item + shipping) lands in Reloop's own platform Stripe balance. The order is created with `status: "awaiting_shipment"` and a `shipByAt` deadline — 24 hours, but weekend time doesn't count against it (buy something Friday evening and the clock pauses until Monday; see `computeShipDeadline` in `functions/shipping.js`).
2. **Seller ships** — Profile → Activity → Pickup now shows a "needs to ship" queue instead of the old buyer-facing "mark picked up" flow. Ship package opens a form: pick a carrier, enter a tracking number.
3. **Verification** (`functions/submitShipment.js`) — real now, via AfterShip's Tracking API (see step 4c above for the free-tier key setup). It registers the tracking number with AfterShip *without* specifying a carrier — AfterShip auto-detects the carrier from the number's own format, which is what actually proves "a real courier recognizes this," rather than trusting whatever the seller picked from the carrier dropdown (that selection is still stored, just as a label — the auto-detected carrier is what's authoritative). Fails **closed**: if AfterShip itself is unreachable, the function throws rather than letting an unverified shipment through — a deliberate difference from the content-moderation module, which fails open, because this gates real money moving and moderation gates a listing going live.
4. **Only once verified** does a real `stripe.transfers.create()` move the seller's cut out of Reloop's platform balance into their connected account. That's the actual mechanism behind "seller doesn't get paid until they ship" — it's a financial fact enforced by which API calls get made and when, not a Firestore status field a client could fake.
5. **The wallet reads Stripe directly.** `functions/getSellerBalance.js` calls `stripe.balance.retrieve()` for the seller's connected account and returns exactly what Stripe says. Profile → Wallet shows that, with a manual refresh button — not a number Reloop computes and hopes matches reality. This is what "the wallet is essentially a representation of the seller's Stripe balance" meant in practice.

### Security-relevant change

`firestore.rules` used to let a client set an order's status to `"completed"` directly (for the old "buyer marks pickup done" flow). That's now blocked — a client can only ever set status to `"cancelled"`, and only while the order is still `"awaiting_shipment"`. `"completed"` now specifically means "a real Stripe transfer happened," and only `submitShipment`'s Admin SDK write can set it. Letting a client set that status directly would mean a buyer could mark an order paid-out before the seller ever shipped anything.

### Known gaps

- **AfterShip's free tier caps at 50 verified shipments/month.** Fine for testing and genuinely low volume; you'll hit this limit before you'd expect if the app gets real traction, and there's no in-app warning when you're close to it.
- **I built this against AfterShip's documented API contract, not a live test against a real API key** — I don't have a way to actually execute a request against their servers from where I'm working. The integration is structurally correct per their current docs, but the very first real shipment you verify is also the first real end-to-end test of this code. Watch the Cloud Functions logs the first few times.
- No shipping label generation yet (the doc that originally scoped this mentioned that as a future "even better option" using DHL/Hermes/DPD label APIs — not attempted here; AfterShip does have a separate Shipping/label API if you want to revisit this later).
- No automated handling for a seller who misses the `shipByAt` deadline — the deadline is computed and stored, and shown as "overdue" in the UI, but nothing automatically cancels the order or refunds the buyer yet.
- `requestWithdrawal` still just writes a Firestore log entry — it doesn't call `stripe.payouts.create()` to trigger a real payout. Express Connect accounts often have automatic payout schedules configured by default anyway (Stripe pays out on its own schedule without a manual trigger), so whether a manual "Withdraw" action is even needed depends on how you configure payout schedules for connected accounts — worth deciding deliberately rather than leaving as-is.

## Account security & session handling

- **Session-only auth persistence** (`src/firebase.ts`): the signed-in session lives in `sessionStorage`, not `localStorage`, and is cleared the moment the browser tab/window closes — not just on explicit log out. Trade-off: users sign in again each new browser session, even if they never explicitly logged out. This was a deliberate choice, not a default left unconfigured — flip back to `browserLocalPersistence` if you'd rather trade that security margin for a "stay signed in" experience.
- **Password strength** (`src/utils/password.ts`): a dependency-free scorer (length + character variety) shown live as a 4-bar meter during signup. Weak passwords are blocked from creating an account entirely — sign-in with an existing (possibly weak, pre-existing) password is unaffected.

## Sold listings are deleted, not archived

Once a payment succeeds, `markOrderPaid` (`functions/checkout.js`) deletes the listing document **and** its Storage photos entirely — it doesn't just flip a status field. A sold item stops showing up anywhere it'd be browsable (Discover, Home, Favourites, direct links) immediately.

This meant a few places that used to read the live listing needed to switch to reading the **order's own denormalized snapshot** instead, since the listing it points to may no longer exist:
- Profile → Sold now derives from `asSeller` orders, not from a `status: "sold"` filter on the listings collection (which would always be empty now).
- Profile → Buying already worked this way from the start.
- A shared link or open ProductView screen pointing at a listing that gets deleted mid-session doesn't crash — the app just falls back to showing the current tab (`selectedProduct` being `undefined` short-circuits the render in `App.jsx`), though there's no explicit "this item just sold" message shown when that happens.

## Sharing a listing

The share button (`ProductView.tsx`) uses the native Web Share API where available — this is what makes "share to WhatsApp / Messages / Mail / etc." work, since it hands off to whatever the OS's own share sheet offers rather than Reloop trying to integrate with each app individually. Falls back to copying the link to the clipboard on browsers without Web Share support (most desktop browsers).

Shared links use the shape `https://yourapp.com/?item=<listingId>` — `App.jsx` watches for that query param on load and opens straight into that product once listings have finished loading, then cleans the URL.

## Security, legal, and polish pass

A broad round covering security hardening, legal compliance, localization, and UX finishing touches.

### Security
- **Input sanitization** (`src/utils/sanitize.ts`, mirrored server-side in `functions/index.js`) — strips HTML-injection and control characters from listing titles/descriptions and display names before storage. Defense-in-depth: React already escapes all rendered text by default (no `dangerouslySetInnerHTML` anywhere in this codebase), so this protects surfaces outside the app itself (emails, PDFs, future admin tools).
- **Remember me** — off by default (session-only persistence); opt-in via a toggle on the login screen (`setRememberMe` in `firebase.ts`).
- **A real bug fix**: cancelling an order never actually refunded the buyer — it was just a Firestore status flip. `functions/cancelOrder.js` now issues a genuine Stripe refund for that order's own price before marking it cancelled, and the client-direct path is locked out in `firestore.rules`.
- **HSTS + security headers** added to `firebase.json`'s hosting config (Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) — hardening beyond Firebase Hosting's automatic HTTPS baseline.

### Legal & compliance
- **Four legal documents** (`src/legal/`) — Terms of Service, Privacy Policy, Data Processing Agreement, Refund Policy. Each is genuinely substantive and GDPR-aware, and each opens with an explicit "AI-drafted, needs real legal review" notice — these are a starting point, not a finished legal product. The Refund Policy in particular does *not* say an unconditional "no refunds," since that framing would likely itself violate EU consumer protection law; it expresses the "we don't proactively refund" intent within what's actually legally sound.
- **Consent gate** (`LoginScreen.tsx`) — a single checkbox blocks every sign-in method (email, Google, Yahoo) until the four documents are acknowledged, each viewable in full via `LegalViewer.tsx`.
- **Yahoo login** added via Firebase's generic `OAuthProvider("yahoo.com")` — needs enabling in Firebase Console (Yahoo isn't a built-in provider like Google).
- **Device permissions / data disclosure** (`DataDisclosure.tsx`, off Profile → Privacy) — a contextual, honest summary distinct from the full Privacy Policy: what's collected, and a permission-by-permission breakdown (Camera used only at listing-photo time via the native picker; Location, Notifications, and Microphone explicitly **not** used anywhere in the app).

### Localization
- **Minimalist white/black/blue theme** — recolored centrally in `theme.ts` (kept the old `oxblood`/`oxbloodSoft` key names to avoid touching every file that references them; just repointed the values).
- **Four new languages** — Turkish, Chinese (Simplified), Hindi, Albanian, alongside the existing English/German/Spanish/French. Every one of the 326 translation keys is covered in all 8 languages — verified programmatically, zero gaps.
- **Bundesland selector** replaces the hardcoded "Stuttgart" — Profile → Your area now lets a seller pick from all 16 German federal states, and new listings use that choice instead of a fixed city.

### UX
- **Delete own listing** — with a confirm step, cleans up both the Firestore doc and its Storage photos.
- **Onboarding carousel on the login screen** — 4 auto-rotating slides ("Give clothes a second life," etc.) introducing what Reloop is before someone signs up.
- **"More from this seller"** on the product page — a horizontal strip of the seller's other active listings.
- **"Add another item from this seller and save on shipping"** nudge in the cart, with actual quick-add thumbnails — not just text, a real one-tap add.

## Turning this into a real iOS/Android app (Capacitor)

The web app is wrapped with [Capacitor](https://capacitorjs.com), which is already scaffolded in this repo — `android/` and `ios/` are real native projects (Gradle and Xcode respectively), not placeholders.

### Every time you change the web code

```
npm run build
npx cap sync
```

`sync` copies the fresh `dist/` build into both native projects and updates any native plugin dependencies. Then:

```
npx cap open android   # opens Android Studio
npx cap open ios       # opens Xcode — requires a Mac, no way around this, it's an Apple restriction
```

### Google/Yahoo login required a real fix, not a workaround

Google explicitly blocks OAuth sign-in inside an embedded WebView — both popup and redirect — as a security policy (you'd see a `disallowed_useragent` error). This is a hard rule on Google's side, not a Capacitor limitation to configure around. The only real fix is triggering the platform's actual native sign-in (a system account chooser or a genuine browser tab, never the app's own WebView), which is what the `@capacitor-firebase/authentication` plugin does — already installed and wired into `AuthContext.tsx`. It detects native vs. web at runtime (`Capacitor.isNativePlatform()`) and only changes behavior inside the native app; the website's login flow is untouched.

**This needs one more step before it actually works, which only you can do** — native OAuth requires per-platform credentials that get generated from your specific app's bundle identifier and signing certificate, none of which exist until you've set up real Xcode/Android Studio signing:

- **Android**: download `google-services.json` from Firebase Console → Project Settings → your Android app (register one if you haven't, using this project's app ID, `com.reloop.app` — see the note below about changing that ID first) → place it at `android/app/google-services.json`. You'll also need to register your debug/release SHA-1 fingerprint(s) with Firebase for Google Sign-In to work at all.
- **iOS**: download `GoogleService-Info.plist` from Firebase Console → your iOS app → place it in `ios/App/App/`, then add the reversed client ID as a URL scheme in Xcode (Signing & Capabilities → URL Types) — Firebase's iOS setup guide walks through this exact step.
- **Yahoo**: `FirebaseAuthentication.signInWithYahoo()` is the plugin's documented method as of when this was written — if it doesn't exist on whatever version actually installs for you, check https://capawesome.io/plugins/firebase/authentication/ for the current API, since less-common providers move around more between plugin versions than Google/Apple do.

### Before you actually submit to either store

- **Change the app ID.** `capacitor.config.ts` currently has `appId: "com.reloop.app"` as a placeholder — this needs to be your own reverse-domain identifier (matching what you register in Firebase, the App Store, and Play Console) before shipping. Changing it after native projects already exist means re-running `npx cap add ios`/`android` or manually updating the bundle identifiers in Xcode/Android Studio — easier to lock this in early.
- **App icons and splash screen** — Capacitor has an asset generator (`@capacitor/assets`) that produces every required icon size from one source image, but you need to supply that source image; nothing was generated here since there's no logo asset to start from.
- **Apple Pay / Google Pay via Stripe** may not appear inside the Capacitor WebView the way they do in mobile Safari/Chrome — wallet payments generally need a real system browser context. Card payments through Stripe's Payment Element should keep working fine since that's standard form input, not a wallet handoff. Test this specifically before assuming it works.
- **Environment variables are baked in at build time** — double-check `.env.local` has your real Firebase config filled in before running `npm run build` ahead of `cap sync`, since whatever's in there at build time is what ships.

## Known limitations

- **No real money movement.** Withdraw writes a Firestore record and updates the balance shown in the app — actually paying out to a bank account needs a payments processor (Stripe Connect is the usual pick) plus a server-side Cloud Function to hold the secret key, which is a separate build.
- **No offer negotiation.** "Make an offer" is a disabled/visual-only button — it doesn't create anything yet.
- **Trust is honest but thin.** Handoff/missed counts are real, but there's still no reputation score, dispute flow, or way to verify a handoff actually happened beyond both people's word.
- **Distance isn't enforced.** The "search radius" slider on Profile is stored as local UI state only — it doesn't yet filter what shows up in Discover/Home, since listings don't store the seller's precise location.
- **`enforcePhotoLimit` is cleanup, not prevention.** It deletes overflow photos shortly after they're uploaded rather than blocking the upload itself (Storage rules can't see the rest of a folder when evaluating one write) — so there's a brief window where more than 5 files exist before the function catches up.
