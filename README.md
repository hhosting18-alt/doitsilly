# DOITSILLY website

A zoomable illustrated map: space (one planet, DOITSILLY) → pick a side → DOITSILLY Island + About Us Island, or the Community page.

## Run it (Windows)

1. Make sure this folder (`E:\doitsilly`) contains `index.html`, `serve.py`, `css`, `js` and `art`.
   The `art` folder (map images, characters, clouds, logo) comes from **doitsilly-art.zip**; `start.bat` unzips it on first run.
2. Double-click **`start.bat`**. Your browser opens http://localhost:8000 (or the next free port if 8000 is busy).
   - Needs Python 3.7+ (https://www.python.org/downloads/, tick "Add python.exe to PATH") or Node.js.
   - PowerShell instead: `powershell -ExecutionPolicy Bypass -File .\start.ps1`
   - Any terminal: `cd E:\doitsilly` then `python serve.py`
3. Stop the server with Ctrl+C in its window.

The server window stays quiet unless something is genuinely missing, in which case it prints the file name.
It never answers 304 (it always sends fresh files, so edits show up on refresh), and it quietly answers the
`/favicon.ico` and `/.well-known/...devtools.json` requests Chrome makes on its own.

Why a server and not just opening index.html? Browsers block some features on `file://` pages. In particular
the beach around the islands is traced from the map pixels, which browsers only allow over http.

## Things you can poke

- **Space**: DOITSILLY is the only planet. Scribble (the scribbly pink O) sits in the middle as the planet's O.
  Drag it anywhere in space and it stays there (drop it back on the planet and it snaps home).
  Picking it up, tapping it, or clicking the planet brings two landing pads out of the planet; drop Scribble on one:
  - **DOITSILLY** pad: zooms into the islands.
  - **Community** pad: a pink wipe into the Community landing page (`#/community`).
  - Keyboard: Tab to a pad and press Enter, and Scribble flies there by itself. Esc or a click on empty space closes the chooser.
  Also in space: the sun (it puts on shades), the satellite orbiting DOITSILLY, the rocket (it boosts), the astro-bot and the ghost.
  Click empty space to make a wish (a shooting star flies from where you clicked).
- **Islands**: every local stays put and says hi when clicked, with a link to the nearest place.
  "Locals met: n of m" counts how many kinds you've greeted. Clouds go poof.
- **The logo island**: the map is ONE island in the shape of the DOITSILLY logo (`js/logo-shape.js`, `art/logo-island.svg`).
  On load, `buildLogoIsland()` in `js/app.js` cuts the original island art (the tiles in `art/map/`) into 12 districts,
  lays them out on a 4 x 3 grid inside the logo outline, and moves every place, pin and local with its district.
  The right-hand column is About Us. Coming in from space, the logo lands on the sea and fades into the island in the
  same spot. Tune it in `js/config.js` → `logoIsland` (island width, district seed points, grid order, overlap).
- **View full experience** (button by the zoom controls, in space and on the map): optional. It goes fullscreen, asks
  for the camera, and follows the viewer's head (MediaPipe face landmarker, loaded only then from jsDelivr and Google's
  model host), so leaning left, right, in and out shifts the view like looking through a window. The video never leaves
  the device. No camera or permission refused: the mouse drives the same effect. Exit turns the camera off. Everyone
  who doesn't click it gets the normal site. Needs https or localhost (Vercel and start.bat are both fine).

## Files

- `index.html`: page shell
- `serve.py`: local preview server (used by start.bat / start.ps1)
- `css/site.css`: all styles (brand colours: blue #0A72EE, pink #FF52CC, lime #DDFF00)
- `js/content.js`: every word on the site, including place names, what each local and space object says. Edit copy here.
- `js/config.js`: map layout, clickable places (labels, pins, zoom frames), ferry, clouds, form endpoint
- `js/map-data.js`: map tiles and where each local stands
- `js/app.js`: the map engine (camera, zoom, routing, panels, tour, menu, loader, solar system, coastline)
- `js/assets.js`: solar-system drawings and the mascot
- `art/logo.jpg`: the DOITSILLY logo
- `art/favicon.svg`: browser tab icon
- `art/map/`: the island art as tiles (base layer + foreground layer)
- `art/squiggle.svg`: Scribble, the pink squiggle from the logo, traced from `art/logo.jpg`. The site uses this file everywhere Scribble appears (space, loader, thumbnails, Community page, the planet's O).
- `art/cast/`: DOITSILLY's characters and vehicles as editable SVGs. `scribble.svg` is the same squiggle, sized to stand on the islands.
- `art/clouds/`: cloud art
- `art/_unused/`: the old coastline files, no longer used. Safe to delete.

## Place names

DOITSILLY Island (the studio):

| Page | Map name |
|---|---|
| Design | Scribble Square |
| Strategy | Paper Plane Point |
| Content | Post-it Park |
| Production | Clapper Studios |
| Tech | The Robot Shed |
| Work | The Fridge Door |
| Start a project | The Big Red Mailbox |

About Us Island (the old Community Island; the About page is split into four stops):

| Page | Map name |
|---|---|
| Our story | The Pizza Party |
| How we work (the four modes) | The Four Hats |
| Who we work with | The Welcome Mat |
| Team + where to find us | The Scribble Crew |

The Community page is a normal scrolling page, not an island. Its copy is in `js/content.js` → `community`.
Change any name in `js/content.js` (`landmark`); move a pin in `js/config.js` (`districts`).

## The coastline

Parts of the island art ended in hard, straight cuts. On load, `buildCoast()` in `js/app.js` reads the tiles at
1/10 scale, rounds the corners, traces a wavy coast with a sand beach, foam line and shallow water, and trims the
straight cuts off the art. The result is cached in the browser. It rebuilds by itself if the number of tiles changes;
to force a rebuild after editing tile images, clear the site's storage (DevTools → Application → Clear site data).

## Addresses (shareable links)

`#/system`, `#/islands`, `#/studio`, `#/about`, `#/community`, `#/studio/design`, `#/studio/strategy`, `#/studio/content`,
`#/studio/production`, `#/studio/tech`, `#/studio/work`, `#/studio/contact`, `#/about/story`, `#/about/modes`, `#/about/who`,
`#/about/team`, `#/list`. The old `#/studio/about` link still works (it goes to `#/about/story`).

## Before launch

- Fill every `[PLACEHOLDER]` in `js/content.js` (address, email, WhatsApp, budgets, case studies, team, socials,
  community join link, opening hours, accelerator).
- Community page copy is a draft written from the content doc: check it with the community team.
  The community is called "the DOITSILLY Community"; "3rd Space" is only used as the address.
  Until `community.joinUrl` is a real link, "Join the Community" opens the Start a project form.
- Set `formEndpoint` in `js/config.js` to where brief submissions should go (the form currently shows the success state only).
- Host: upload the whole folder to any static host (Netlify, Vercel, GitHub Pages, S3, cPanel). No build step.
  `serve.py`, `start.bat` and `start.ps1` are only for previewing on your computer.

## Deploying (GitHub → Vercel)

The repo is ready for Vercel with zero settings: it's a plain static site (no package.json, no build step).
`vercel.json` tells Vercel to serve the folder as-is, caches the art for a week, always re-checks JS/CSS so
changes show up right away, and points `/favicon.ico` at `art/favicon.svg`. `.vercelignore` leaves out the
local-preview files. `.gitignore` leaves out the zips (the art is already unzipped in `/art`).

To update the live site: edit, then `git add .`, `git commit -m "what changed"`, `git push`. Vercel redeploys on every push.
