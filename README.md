# DOITSILLY website

A zoomable illustrated map: solar system → DOITSILLY logo planet → DOITSILLY Island + Community Island → a place.

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

- **Solar system**: click the sun (it puts on shades), ZESCORP, its moon, the three little planets, the satellite
  orbiting DOITSILLY, the rocket (it boosts), the astro-bot and the ghost. Click empty space to make a wish
  (a shooting star flies from where you clicked). Shooting stars and a comet pass by on their own; the stars shift
  a little as you move the mouse.
- **Islands**: every local stays put and says hi when clicked, with a link to the nearest place.
  "Locals met: n of m" counts how many kinds you've greeted. Clouds go poof. The ferry gives you a ride to the other island.

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
- `art/cast/`: DOITSILLY's characters and vehicles as editable SVGs. `scribble.svg` is the mascot: the pink O from the logo.
- `art/clouds/`: cloud art
- `art/_unused/`: the old coastline files, no longer used. Safe to delete.

## Place names

| Page | Map name |
|---|---|
| Design | Scribble Square |
| Strategy | Paper Plane Point |
| Content | Post-it Park |
| Production | Clapper Studios |
| Tech | The Robot Shed |
| Work | The Fridge Door |
| About | The Pizza Party |
| Start a project | The Big Red Mailbox |

Community Island spots (opening soon): Crayon Corner, The Jam Room, Open Mic Pier, The Snack Shack.
Change any name in `js/content.js` (`landmark`); move a pin in `js/config.js` (`districts`).

## The coastline

Parts of the island art ended in hard, straight cuts. On load, `buildCoast()` in `js/app.js` reads the tiles at
1/10 scale, rounds the corners, traces a wavy coast with a sand beach, foam line and shallow water, and trims the
straight cuts off the art. The result is cached in the browser. It rebuilds by itself if the number of tiles changes;
to force a rebuild after editing tile images, clear the site's storage (DevTools → Application → Clear site data).

## Addresses (shareable links)

`#/system`, `#/islands`, `#/studio`, `#/community`, `#/studio/design`, `#/studio/strategy`, `#/studio/content`,
`#/studio/production`, `#/studio/tech`, `#/studio/work`, `#/studio/about`, `#/studio/contact`, `#/list`

## Before launch

- Fill every `[PLACEHOLDER]` in `js/content.js` (address, email, WhatsApp, budgets, case studies, team, socials, ZESCORP line).
- Set `formEndpoint` in `js/config.js` to where brief submissions should go (the form currently shows the success state only).
- Community Island content: add it to `js/content.js` and `communityPlaces` in `js/config.js`.
- Host: upload the whole folder to any static host (Netlify, Vercel, GitHub Pages, S3, cPanel). No build step.
  `serve.py`, `start.bat` and `start.ps1` are only for previewing on your computer.

## Deploying (GitHub → Vercel)

The repo is ready for Vercel with zero settings: it's a plain static site (no package.json, no build step).
`vercel.json` tells Vercel to serve the folder as-is, caches the art for a week, always re-checks JS/CSS so
changes show up right away, and points `/favicon.ico` at `art/favicon.svg`. `.vercelignore` leaves out the
local-preview files. `.gitignore` leaves out the zips (the art is already unzipped in `/art`).

To update the live site: edit, then `git add .`, `git commit -m "what changed"`, `git push`. Vercel redeploys on every push.
