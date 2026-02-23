# Microsoft 365 App Launcher Integration – Ticketing System

This guide configures your existing **ticketing-system** Entra app so it appears as a launchable icon in Microsoft 365 (Outlook, Teams, and the M365 app launcher) and opens your web app.

**App URL:** `https://tickets.people-usa.org/ticketing-system`

> **Note:** The **Single sign-on** (OIDC-based Sign-on) page for the Enterprise application configures authentication only. The URL that opens when users click the app is set in **App registrations** → **Branding** (or **Manifest**), not on the Single sign-on page.

---

## Part 1: Enterprise Application – Make the app visible and set launch URL

Your **App registration** (ticketing-system) automatically has a matching **Enterprise application**. That’s what shows in “My Apps” and the M365 app launcher.

### 1.1 Open the Enterprise application

1. Go to **Microsoft Entra admin center** → **Identity** → **Applications** → **Enterprise applications**.
2. Find and open **ticketing-system** (same name as your App registration).

### 1.2 Set the URL that opens when users click the app

**Important:** The **Single sign-on** page (OIDC-based Sign-on) only configures the auth protocol. The launch URL is **not** set there. It is set on the **App registration** (application object).

- Go to **App registrations** → **ticketing-system** (use “All applications” if needed).
- In the left menu, open **Branding**.
- Find **Home page URL** (or “Application URL”) and set it to:  
  `https://tickets.people-usa.org/ticketing-system`
- Save.

If **Branding** does not show a Home page URL field in your tenant:

- Open **Manifest** (left menu). In the JSON, find the `"web"` block (create it if missing) and ensure it contains:
  ```json
  "web": {
    "homePageUrl": "https://tickets.people-usa.org/ticketing-system",
    "redirectUris": [ "..." ]
  }
  ```
  (Keep your existing `redirectUris`; add or update only `homePageUrl`.) Save the manifest.
- Alternatively, set it via [Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/application-update): `PATCH` the application with `"web": { "homePageUrl": "https://tickets.people-usa.org/ticketing-system" }`.

The Enterprise application (tile in My Apps / launcher) uses this URL from the App registration; it may take a short time to sync.

### 1.3 Who can see the app

- **Enterprise applications** → **ticketing-system** → **Users and groups**.
- Click **Add user/group** and add:
  - Specific users, or
  - Groups (e.g. “All Employees” or “IT + Requesters”).
- If **User assignment required** is **No**, everyone in the tenant can see the app (no need to add users here unless you use assignment for other reasons).

After this, the app should appear in **My Apps** (myapplications.microsoft.com) and in the **Microsoft 365 app launcher (waffle)**. Clicking it should open `https://tickets.people-usa.org/ticketing-system`. Users will then sign in with Microsoft (Supabase + Azure) as they do today.

---

## Part 2: Teams – Add as a website or tab

To have the ticketing system inside Teams as well:

### Option A: Add as “Website” for yourself (quick test)

1. In **Teams**, open the **Apps** section (left rail).
2. Search for **“Website”** or **“Link”** (built-in or from your org).
3. Add it and set the URL to:  
   `https://tickets.people-usa.org/ticketing-system`
4. Pin it so it appears in the left rail or in a team/channel.

### Option B: Publish for the whole organization (admin)

1. **Teams admin center** → **Teams apps** → **Manage apps**.
2. Use **Upload an app** or **Add custom app** to add a custom app that points to:  
   `https://tickets.people-usa.org/ticketing-system`
3. Or use **Setup policies** to add a “Website” / custom link for all users.

Exact names depend on your Teams admin UI; the goal is to add a custom app or “Website” whose URL is your ticketing system.

---

## Part 3: Outlook

- The **same app** that appears in the M365 app launcher (from Part 1) is usually available in **Outlook on the web** (and sometimes in the desktop client) via the **app launcher (waffle)** in the top bar.
- No separate Outlook-only step is required if the Enterprise application is configured and assigned as above.

---

## Part 4: Pin for quick access (Outlook & Teams)

To make the ticketing system easier to find for assigned users (Everyone, Maksym Shevkun, etc.):

### Option A: Pin to the app launcher (recommended)

Pins the ticketing-system Enterprise app to the top of the app launcher (waffle) for all users. Works in Outlook, Teams, and Microsoft365.com.

1. Go to **Microsoft 365 admin center** → [admin.microsoft.com](https://admin.microsoft.com).
2. In the left nav, click **Show all** → under **Admin centers**, choose **Identity** (opens Entra).
3. In Entra: **Applications** → **Enterprise applications**.
4. In the left nav, look for **App launchers** → **Settings** (or **User settings** → **App launchers** → **Settings**; the exact path may vary by tenant).
5. Under **Microsoft 365 settings**, click **Add application**.
6. Select **ticketing-system** and add it (you can pin up to 3 apps).
7. Save.

The app will appear in the pinned area of the app launcher for users when they open the waffle in Outlook, Teams, or Microsoft365.com.

### Option B: Custom tile (alternative)

Adds a custom tile that points to your URL. Useful if Option A is not available in your tenant.

1. Go to **Microsoft 365 admin center** → **Settings** → **Org settings**.
2. Open the **Organization profile** tab.
3. Under **Custom tiles for Apps**, click **Add a custom tile**.
4. Enter:
   - **Tile name:** IT Ticketing System
   - **URL:** `https://tickets.people-usa.org/ticketing-system`
   - **Image URL:** A 60×60 px image (optional; use a public URL).
   - **Description:** Internal IT help desk ticketing system
5. Save.

The tile appears in the app launcher within about 24 hours.

### Teams: Pin a web app in the sidebar

Teams app setup policies only pin **Teams apps** (from the Teams store or custom packages). Your ticketing system is a web app, so:

- **Simplest:** Users open the **app launcher (waffle)** in Teams and click **ticketing-system** (from Part 1 or Option A above). No extra config.
- **Dedicated Teams app:** Create a custom Teams app (manifest with a static tab pointing to your URL), upload it in **Teams admin center** → **Manage apps**, then pin it via **Setup policies** for your users. This requires creating a Teams app package.

---

## Checklist

- [ ] **Entra – Enterprise application:** Open **ticketing-system** and set **Application URL** / **Home page URL** to `https://tickets.people-usa.org/ticketing-system`.
- [ ] **Entra – Users and groups:** Either set **User assignment required = No** or assign the right users/groups so people can see the app.
- [ ] **Test:** From a browser, go to **My Apps** (myapplications.microsoft.com), find **ticketing-system**, and confirm it opens the ticketing system and sign-in works.
- [ ] **Teams (optional):** Add the URL as a “Website” or custom app for your team or org.
- [ ] **Outlook:** Confirm the app appears in the M365 app launcher when in Outlook and that it opens the same URL.

---

## If the app doesn’t appear or the URL is wrong

- **App not in launcher:** Confirm **User assignment required** and **Users and groups** so your account (or your group) is assigned. Wait a few minutes and refresh.
- **Wrong or blank page:** Re-check **Application URL** / **Home page URL** in the Enterprise application (Single sign-on, Branding, or Properties). It must be exactly `https://tickets.people-usa.org/ticketing-system`.
- **Sign-in issues:** Those are handled by Supabase + Azure (your existing App registration). Redirect URIs in the **App registration** must include `https://tickets.people-usa.org/...` and Supabase must use the same; no change needed for “launch from M365” only.

Your existing **App registration** (client ID, secrets, redirect URIs) stays as used by Supabase; this guide only adds **where** the app shows (Enterprise app + optional Teams) and **what URL** opens when users click it.
