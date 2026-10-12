/* DOITSILLY map configuration. World units = pixels of the map art (9800 x 5400). Rects are [x, y, width, height].
   districts: the eight DOITSILLY places (label = name pill, pin = "i" pin tip, rect = what the camera frames when the place opens).
   communityPlaces: placeholder spots on Community Island (content coming later).
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
  "studio": { "rect": [450, 250, 5930, 4630], "label": [2950, 560] },
  "community": { "rect": [5950, 850, 3290, 2820], "label": [7350, 820] }
 },
 "districts": [
  { "id": "design", "island": "studio", "label": [2284, 1780], "pin": [2284, 1650], "rect": [1634, 1290, 1300, 900] },
  { "id": "work", "island": "studio", "label": [3262, 1282], "pin": [3262, 1152], "rect": [2612, 792, 1300, 900] },
  { "id": "production", "island": "studio", "label": [4324, 1468], "pin": [4324, 1338], "rect": [3674, 978, 1300, 900] },
  { "id": "content", "island": "studio", "label": [2872, 2872], "pin": [2872, 2742], "rect": [2222, 2382, 1300, 900] },
  { "id": "tech", "island": "studio", "label": [4072, 2476], "pin": [4072, 2346], "rect": [3422, 1986, 1300, 900] },
  { "id": "about", "island": "studio", "label": [4990, 4010], "pin": [4990, 3880], "rect": [4340, 3500, 1300, 900] },
  { "id": "contact", "island": "studio", "label": [5363, 4560], "pin": [5363, 4320], "rect": [4713, 3990, 1300, 900] },
  { "id": "strategy", "island": "studio", "label": [1887, 1331], "pin": [1887, 1201], "rect": [1237, 841, 1300, 900] }
 ],
 "communityPlaces": [
  { "id": "c1", "island": "community", "label": [6252, 1767], "pin": [6252, 1657], "rect": [5752, 1357, 1000, 700] },
  { "id": "c2", "island": "community", "label": [7092, 1587], "pin": [7092, 1477], "rect": [6592, 1177, 1000, 700] },
  { "id": "c3", "island": "community", "label": [6162, 2547], "pin": [6162, 2437], "rect": [5662, 2137, 1000, 700] },
  { "id": "c4", "island": "community", "label": [6942, 2187], "pin": [6942, 2077], "rect": [6442, 1777, 1000, 700] }
 ],
 "ferry": { "art": "art/cast/ferry.svg", "w": 300, "a": [5000, 2250], "b": [5850, 2150], "dur": 16 },
 "clouds": [
  { "src": "art/clouds/cloud.svg", "x": 800, "y": 250, "w": 420, "dx": 300, "dur": 70 },
  { "src": "art/clouds/cloud.svg", "x": 3800, "y": 120, "w": 300, "dx": -220, "dur": 55 },
  { "src": "art/clouds/cloud.svg", "x": 6200, "y": 350, "w": 380, "dx": 260, "dur": 64 },
  { "src": "art/clouds/cloud.svg", "x": 8800, "y": 4200, "w": 420, "dx": -300, "dur": 80 },
  { "src": "art/clouds/cloud.svg", "x": 300, "y": 4700, "w": 300, "dx": 200, "dur": 60 },
  { "src": "art/clouds/cloud.svg", "x": 7200, "y": 4900, "w": 360, "dx": -200, "dur": 66 },
  { "src": "art/clouds/cloud.svg", "x": 9000, "y": 600, "w": 300, "dx": -180, "dur": 58 }
 ],
 "lottieMinPx": 52
};
