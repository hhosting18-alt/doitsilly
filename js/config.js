/* DOITSILLY map configuration. World units = pixels of the map art (9800 x 5400). Rects are [x, y, width, height].
   islands: DOITSILLY Island (the studio) and About Us Island (who we are).
   districts: every clickable place on both islands (label = name pill, pin = "i" pin tip, rect = what the camera frames
   when the place opens). "island" decides which island it belongs to and its address: #/studio/<id> or #/about/<id>.
   formEndpoint: set to a URL (e.g. Formspree, your backend) to receive "Start a project" briefs as JSON.
   The beach around the islands is traced from the map tiles in the browser and cached; it rebuilds by itself when the tile list changes. */
window.DIS_CONFIG = {
 "seaColor": "#0A72EE",
 "dotColor": "#05489A",
 "formEndpoint": null,
 "world": [9800, 5400],
 "islandsFit": [300, 150, 9300, 5000],
 "maxScale": 1.0,
 "islands": {
  "studio": { "rect": [450, 250, 5930, 4630], "label": [1560, 4180] },
  "about": { "rect": [5950, 850, 3290, 2820], "label": [7350, 3760] }
 },
 "districts": [
  { "id": "design", "island": "studio", "label": [2284, 1780], "pin": [2284, 1650], "rect": [1634, 1290, 1300, 900] },
  { "id": "work", "island": "studio", "label": [3262, 1282], "pin": [3262, 1152], "rect": [2612, 792, 1300, 900] },
  { "id": "production", "island": "studio", "label": [4324, 1468], "pin": [4324, 1338], "rect": [3674, 978, 1300, 900] },
  { "id": "content", "island": "studio", "label": [2872, 2872], "pin": [2872, 2742], "rect": [2222, 2382, 1300, 900] },
  { "id": "tech", "island": "studio", "label": [4072, 2476], "pin": [4072, 2346], "rect": [3422, 1986, 1300, 900] },
  { "id": "contact", "island": "studio", "label": [5363, 4560], "pin": [5363, 4320], "rect": [4713, 3990, 1300, 900] },
  { "id": "strategy", "island": "studio", "label": [1887, 1331], "pin": [1887, 1201], "rect": [1237, 841, 1300, 900] },

  { "id": "story", "island": "about", "label": [6252, 1767], "pin": [6252, 1657], "rect": [5752, 1357, 1000, 700] },
  { "id": "modes", "island": "about", "label": [7092, 1587], "pin": [7092, 1477], "rect": [6592, 1177, 1000, 700] },
  { "id": "who", "island": "about", "label": [6162, 2547], "pin": [6162, 2437], "rect": [5662, 2137, 1000, 700] },
  { "id": "team", "island": "about", "label": [6942, 2187], "pin": [6942, 2077], "rect": [6442, 1777, 1000, 700] }
 ],
 "ferry": { "art": "art/cast/ferry.svg", "w": 300, "a": [5000, 2250], "b": [5850, 2150], "dur": 16, "label": [5360, 2830] },
 /* The intro island: when you arrive from space, the logo becomes ONE island in the logo's shape (js/logo-shape.js),
    built from the map art cut into 12 districts around these seed points (world px) and laid out on a 4 x 3 grid.
    It then breaks apart and every district flies back to its real spot, forming the two islands you explore. */
 "logoIsland": {
  "width": 4600,
  "seeds": {
   "pinkwest": [2062, 1501], "spiral": [1802, 2436], "toplime": [3880, 1060], "greenne": [4763, 1423],
   "mountains": [3594, 2125], "snow": [3049, 3345], "park": [4373, 3423], "beach": [5257, 3917],
   "east": [4685, 2540], "city": [6555, 1761], "eastlobe": [7906, 1969], "forest": [6711, 2930]
  },
  "grid": [["pinkwest", "toplime", "greenne", "city"], ["spiral", "mountains", "east", "eastlobe"], ["snow", "park", "beach", "forest"]],
  "about": ["city", "eastlobe", "forest"],
  "overlap": 1.18,
  "bakeScale": 0.6
 },
 "clouds": [
  { "src": "art/clouds/cloud.svg", "x": 800, "y": 250, "w": 420, "dx": 300, "dur": 70 },
  { "src": "art/clouds/cloud.svg", "x": 3800, "y": 120, "w": 300, "dx": -220, "dur": 55 },
  { "src": "art/clouds/cloud.svg", "x": 6200, "y": 350, "w": 380, "dx": 260, "dur": 64 },
  { "src": "art/clouds/cloud.svg", "x": 8800, "y": 4200, "w": 420, "dx": -300, "dur": 80 },
  { "src": "art/clouds/cloud.svg", "x": 300, "y": 4700, "w": 300, "dx": 200, "dur": 60 },
  { "src": "art/clouds/cloud.svg", "x": 7200, "y": 4900, "w": 360, "dx": -200, "dur": 66 },
  { "src": "art/clouds/cloud.svg", "x": 9000, "y": 600, "w": 300, "dx": -180, "dur": 58 }
 ],
 "lottieMinPx": 52,
 /* The islands as a 3D diorama, seen through the screen like a window into a box (js/depth.js). The mouse tilts the
    view gently; "View full experience" follows your head. on: false (or ?flat in the address) = the flat map, as before.
    wall: how far behind the screen the islands sit, so they move as you move (0 = pinned at the screen; the island names
    always float at the screen and hold still in front of them), floor: how deep the dotted sea floor is below them,
    thick: island thickness in map px, lean: how much the locals stand up, mouse: how far the mouse moves the view (0 = off).
    The model look: tilt = how much of the islands' south cliff face always shows (0 = only when you move), tiltX = a little
    of the east face, head = how much your head / the mouse swings the cliffs round, maxDrop = tallest the cliff face gets
    (fraction of screen height), shadow = darkness of the shadow on the water (0 = none), slices = layers in the cliff.
    fxWall / fxFloor: the same two, during View full experience (fxFloor: how far the sea drops away so the islands float).
    box: true brings back the walls round the edges (the "theater" look); grid: tile lines on those walls.
    cloudLift: how far in front of the screen the clouds float. adapt: if frames get slow, quietly drop the extras to stay
    smooth (false = never). */
 "depth": { "on": true, "wall": 0.1, "fxWall": 0.2, "box": false, "grid": false, "floor": 0.22, "fxFloor": 0.4, "cloudLift": 0.05,
   "thick": 560, "maxThick": 0.09, "lean": 0.6, "mouse": 0.4,
   "tilt": 0.42, "tiltX": 0.1, "head": 0.55, "maxDrop": 0.075, "shadow": 0.3, "slices": 4, "adapt": true }
};
