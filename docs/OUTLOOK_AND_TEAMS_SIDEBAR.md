# Add Ticketing System to Outlook and Teams Sidebars

You already have the ticketing system in **My Applications** and in the **app launcher (waffle)**. To get it into the **Outlook** and **Teams** sidebars so everyone sees it without opening the waffle, you need the following.

**Summary:** ChatGPT’s answer is correct. The Entra Enterprise Application cannot be turned into an Outlook or Teams sidebar button. You need:

- **Outlook:** An **Outlook Add-in** (Office Add-in) that opens your app (e.g. in a task pane or via a link).
- **Teams:** A **Teams app** (e.g. a personal tab that loads your URL), then **pin it for everyone** with an app setup policy.

---

## Why it works this way

- **Outlook**  
  The left sidebar (Mail, Calendar, People, To Do, etc.) and the “Apps” area in Outlook are controlled by **Office Add-ins**. Only add-ins (with a manifest and a hosted entry point) can appear there. Your Entra app is a web app with SSO; it is not an add-in, so it cannot be added as a sidebar button directly.

- **Teams**  
  The left app bar shows **Teams apps** (apps that have a Teams manifest). Your ticketing system is a website; to show it in the sidebar you package it as a **Teams app** (e.g. one personal tab that loads your URL) and then pin that app for all users.

---

## Option 1: Teams sidebar (recommended, simpler)

A minimal **Teams app** with a **personal tab** that opens your ticketing system URL. Once uploaded and pinned, it appears in the Teams left rail for everyone you assign.

### 1. Create the Teams app package

You need two files (both can live in your repo or any folder):

**A. Manifest: `manifest.json`**

Create a file named `manifest.json` with the content below. Replace `YOUR_APP_ID` with a new GUID (e.g. from [guidgenerator.com](https://www.guidgenerator.com/)) and keep the rest as-is if your URL is `https://tickets.people-usa.org/ticketing-system`.

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "YOUR_APP_ID",
  "packageName": "com.peopleusa.ticketing",
  "developer": {
    "name": "People USA",
    "websiteUrl": "https://tickets.people-usa.org",
    "privacyUrl": "https://tickets.people-usa.org",
    "termsOfUseUrl": "https://tickets.people-usa.org"
  },
  "name": {
    "short": "IT Ticketing",
    "full": "People USA IT Ticketing System"
  },
  "description": {
    "short": "Internal IT help desk ticketing",
    "full": "Create and manage IT support tickets."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#0078D4",
  "staticTabs": [
    {
      "entityId": "ticketing",
      "name": "Ticketing",
      "contentUrl": "https://tickets.people-usa.org/ticketing-system",
      "websiteUrl": "https://tickets.people-usa.org/ticketing-system",
      "scopes": [ "personal" ]
    }
  ],
  "validDomains": [
    "tickets.people-usa.org",
    "login.microsoftonline.com",
    "YOUR_SUPABASE_PROJECT_REF.supabase.co"
  ]
}
```

Replace `YOUR_SUPABASE_PROJECT_REF` with your Supabase project hostname (from `NEXT_PUBLIC_SUPABASE_URL`, e.g. `hdrvrkzmbnrisxgtmhem`). These domains are required so the Teams tab can complete Microsoft OAuth (login.microsoftonline.com) and Supabase auth callbacks (your Supabase project domain) when using the in-Teams popup login flow.

**B. Icons**

- `outline.png`: 32×32 px, transparent, white icon on transparent (used in sidebar).
- `color.png`: 192×192 px, full color (used in app details).

Place both in the **same folder** as `manifest.json`.

### 2. Zip and upload to Teams

1. Zip the folder so that **manifest.json**, **outline.png**, and **color.png** are at the **root** of the zip (no extra parent folder).
2. Go to **Teams admin center** → [admin.teams.microsoft.com](https://admin.teams.microsoft.com) → **Teams apps** → **Manage apps**.
3. Click **Upload an app** → **Upload a custom app** and upload the zip.
4. After upload, open the app → **Publish** / make it available to your org if required.

### 3. Pin for all users

1. In Teams admin center go to **Teams apps** → **Setup policies**.
2. Open **Global (Org-wide default)** (or create a new policy and assign it to everyone).
3. Under **Pinned apps**, click **Add apps**.
4. Search for your app (e.g. “IT Ticketing”) and add it.
5. Save.

Within a few hours, the app appears in the Teams left sidebar for users; they click it to open the ticketing system (in Teams or in browser, depending on your `contentUrl`/`websiteUrl`).

---

## Option 2: Outlook sidebar (add-in)

To have an entry in **Outlook’s** app area (ribbon or task pane) that opens your ticketing system for everyone, you need an **Outlook Add-in** deployed by admin.

### High-level steps

1. **Create an Office Add-in** that has at least one **task pane** or **launch button**.
2. The task pane can be a **single HTML page** that either:
   - embeds your app in an **iframe** (e.g. `https://tickets.people-usa.org/ticketing-system`), or  
   - shows a “Open IT Ticketing” button that opens that URL in a new window.
3. **Host** that HTML (and any assets) on a URL that Outlook can load (e.g. `https://tickets.people-usa.org/outlook-addin/taskpane.html`).
4. **Manifest:** Use an **Office Add-in manifest** (XML or JSON) that:
   - Declares `Host Name="Mailbox"` (Outlook).
   - Points the task pane’s **SourceLocation** to your hosted HTML URL.
5. **Deploy:** In **Microsoft 365 admin center** → **Settings** → **Integrated apps** (or **Get add-ins** → **Upload custom add-in** / **Centralized deployment**), upload the manifest and assign the add-in to **Everyone** or the right users.

After deployment, users see the add-in in Outlook (e.g. Home ribbon or “Get Add-ins”); opening it shows your task pane with the link or iframe to the ticketing system.

### Minimal manifest idea (conceptual)

Your manifest will look roughly like this (exact schema depends on manifest version; see [Office Add-ins manifest](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/add-in-manifests)):

- **Id:** a GUID for your add-in.
- **DisplayName:** e.g. “IT Ticketing System”.
- **Hosts:** `Mailbox` (Outlook).
- **FormSettings / ExtensionPoint:** define a **task pane** whose **SourceLocation** is your hosted HTML URL (e.g. `https://tickets.people-usa.org/outlook-addin/taskpane.html`).

The hosted `taskpane.html` can be as simple as:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>IT Ticketing</title>
</head>
<body>
  <p><a href="https://tickets.people-usa.org/ticketing-system" target="_blank">Open IT Ticketing System</a></p>
  <!-- Or: <iframe src="https://tickets.people-usa.org/ticketing-system" style="width:100%;height:600px;"></iframe> -->
</body>
</html>
```

You must serve this (and the manifest) over **HTTPS** (your domain is already suitable).

---

## Summary

| Goal                         | What you have now                         | What you need to add                                      |
|-----------------------------|--------------------------------------------|-----------------------------------------------------------|
| My Apps + app launcher      | Done (Entra + promoted app)                | Nothing                                                   |
| **Teams left sidebar**      | Not available by default for a web app    | **Teams app** (personal tab with your URL) + pin policy  |
| **Outlook app / task pane** | Not available by default for a web app     | **Outlook Add-in** (manifest + hosted task pane) + deploy |

So: **ChatGPT is correct.** You cannot add the Enterprise Application as a sidebar button in Outlook or Teams. Use a **Teams app** for the Teams sidebar and an **Outlook Add-in** for the Outlook sidebar; the steps above are the way to do what you want.
