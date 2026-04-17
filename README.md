# سێریا ئەی (Seria Ay) — Kurdish Serie A Website

## Admin login
- **Username:** `admin`
- **Password:** `seriaay2026`

Click the 🔐 button (bottom-left corner on every page) to log in. Once logged in you can:
- Edit site data via JSON overlay (stored in your browser's localStorage).
- Add/remove other admins (super-admins can do this; editors can only edit data).

To change the default credentials permanently, edit the `DEFAULT_ADMIN` object near the top of `assets/script.js`.

## Folder layout
```
seria-ay/
├── index.html        # Home
├── fixtures.html     # Weekly fixtures (clickable → details + lineups)
├── news.html         # Scrollable news grid
├── history.html      # All-time + unique records
├── season.html       # Current + 5 past seasons (switchable)
├── national.html     # National team mode
└── assets/
    ├── style.css
    ├── script.js     # Shared runtime (nav, admin, modals, renderers)
    ├── data.js       # ← ALL site content lives here (edit to update)
    ├── fonts/Aria-ExtraBold.otf
    └── img/seriaa.jpeg  # Recreated from your logo design
```

## How "updates" work
The site is a static site. All content (table, fixtures, scorers, news, etc.) is driven
by the single file `assets/data.js`. Change any value in that file and every page
updates the next time it loads. For example, after a goal is scored, update the
`table` row's `gf`/`pts` and the scorer's `goals` field — the home page, season
page, and fixtures page all reflect the new numbers.

For non-developer edits, use the admin panel: click 🔐 → Login → "Edit data"
and paste a JSON overlay that partially overrides `window.SA`.

## National-team toggle
Clicking the rounded button at the top-right switches between club mode and
national team mode. When in national mode, the button flips to "سێریا ئەی" so
you can return.

## Logo
The uploaded logo arrived as an inline image only, so it was recreated in SVG at
`assets/img/seriaa.jpeg`. Replace that file with any PNG/SVG you like (keep the same
filename).
