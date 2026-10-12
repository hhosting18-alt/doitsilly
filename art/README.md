# Art

- `map/base-r*-c*.webp`: island art, base layer (world is 9800 x 5400 px, tiles 980 x 1080)
- `map/fg-r*-c*.webp`: foreground layer drawn above characters
- `cast/*.svg`: DOITSILLY characters and vehicles (editable in Figma/Illustrator)
- `clouds/cloud.svg`

Character positions and animations live in `js/map-data.js` (`cast` list: x, y, width, animation `bob|sway|walk|fly`).
Clickable place positions live in `js/config.js` (`districts`: label, pin, rect).
