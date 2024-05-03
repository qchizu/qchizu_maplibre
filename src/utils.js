import mlcontour from '../node_modules/maplibre-contour/dist/index'; //一部改変
let terrainControl;

// ベースレイヤーの可視性設定
export function updateBaseLayerVisibility(map, selectedBaseLayer) {
  map.setLayoutProperty('gsi_std', 'visibility', selectedBaseLayer === 'gsi_std' ? 'visible' : 'none');
  map.setLayoutProperty('gsi_pale', 'visibility', selectedBaseLayer === 'gsi_pale' ? 'visible' : 'none');
  map.setLayoutProperty('gsi_seamlessphoto', 'visibility', selectedBaseLayer === 'gsi_seamlessphoto' ? 'visible' : 'none');
  map.setLayoutProperty('relief', 'visibility', selectedBaseLayer === 'relief' ? 'visible' : 'none');
  map.setLayoutProperty('white-background', 'visibility', selectedBaseLayer === 'white-background' ? 'visible' : 'none');
  map.setLayoutProperty('p17_ishikawa_f_01', 'visibility', selectedBaseLayer === 'p17_ishikawa_f_01' ? 'visible' : 'none');
  map.setLayoutProperty('ishikawa_cs', 'visibility', selectedBaseLayer === 'ishikawa_cs' ? 'visible' : 'none');
  map.setLayoutProperty('ishikawa_rrim', 'visibility', selectedBaseLayer === 'ishikawa_rrim' ? 'visible' : 'none');
}

// オーバーレイの可視性設定
export function updateOverLayerVisibility(map, selectedOverLayers) {
  setLayerVisibility(map, 'slope', selectedOverLayers.includes('slope'));
  setLayerVisibility(map, 'hillshade', selectedOverLayers.includes('hillshade'));
  setLayerVisibility(map, 'contours', selectedOverLayers.includes('contours'));
  setLayerVisibility(map, 'contour-text', selectedOverLayers.includes('contours'));
}

// 標高Sourceの切り替えで使用する関数
// 段彩図の更新
function updateReliefLayer(map, selectedDemSource, demSources) {
  if (map.getLayer("relief")) {
    map.removeLayer("relief");
  }
  if (map.getSource("reliefSource")) {
    map.removeSource("reliefSource");
  }

  const reliefTilesUrl = getTilesUrl(selectedDemSource, demSources, "relief");

  map.addSource("reliefSource", {
    "type": "raster",
    "tiles": reliefTilesUrl,
    "attribution": demSources[selectedDemSource]["attribution"],
    "maxzoom": demSources[selectedDemSource]["maxzoom"],
    "tileSize": demSources[selectedDemSource]["tileSize"],
  });

  map.addLayer({
    id: "relief",
    type: "raster",
    source: "reliefSource",
    layout: {
      visibility: 'none'
    },
  });
}

// 傾斜量図の更新
function updateSlopeLayer(map, selectedDemSource, demSources) {
  if (map.getLayer("slope")) {
    map.removeLayer("slope");
  }
  if (map.getSource("slopeSource")) {
    map.removeSource("slopeSource");
  }

  const slopeTilesUrl = getTilesUrl(selectedDemSource, demSources, "slope");

  map.addSource("slopeSource", {
    "type": "raster",
    "tiles": slopeTilesUrl,
    "attribution": demSources[selectedDemSource]["attribution"],
    "maxzoom": demSources[selectedDemSource]["maxzoom"],
    "tileSize": demSources[selectedDemSource]["tileSize"],
  });

  map.addLayer({
    id: "slope",
    type: "raster",
    source: "slopeSource",
    layout: {
      visibility: 'none'
    },
  });
}

// 陰影の更新
function updateHillshadeLayer(map, selectedDemSource, demSources) {
  if (map.getLayer("hillshade")) {
    map.removeLayer("hillshade");
  }
  if (map.getSource("hillshadeSource")) {
    map.removeSource("hillshadeSource");
  }

  const hillshadeTilesUrl = getTilesUrl(selectedDemSource, demSources, "hillshade");

  map.addSource("hillshadeSource", {
    "type": "raster-dem",
    "tiles": hillshadeTilesUrl,
    "attribution": demSources[selectedDemSource]["attribution"],
    "maxzoom": demSources[selectedDemSource]["maxzoom"],
    "tileSize": demSources[selectedDemSource]["tileSize"],
  });

  map.addLayer({
    id: "hillshade",
    type: "hillshade",
    source: "hillshadeSource",
    paint: {
      "hillshade-illumination-anchor": "map",
      "hillshade-exaggeration": HILLSHADE_EXAGGERATION,
      "hillshade-highlight-color": HILLSHADE_HIGHLIGHT_COLOR,
    },
    layout: {
      visibility: 'none'
    },
  });
}

// 等高線の更新
function updateContourLayers(map, selectedDemSource, demSources, contourInterval, maplibregl) {
  if (map.getLayer("contours")) {
    map.removeLayer("contours");
  }
  if (map.getLayer("contour-text")) {
    map.removeLayer("contour-text");
  }
  if (map.getSource("contourSource")) {
    map.removeSource("contourSource");
  }

  var contour = new mlcontour.DemSource({
    url: demSources[selectedDemSource]["tiles"][0],
    encoding: demSources[selectedDemSource]["encoding"],
    maxzoom: demSources[selectedDemSource]["maxzoom"],
  });
  contour.setupMaplibre(maplibregl);

  map.addSource("contourSource", {
    "type": "vector",
    "tiles": [
      contour.contourProtocolUrl({
        multiplier: 1,
        thresholds: contourInterval,
        elevationKey: "ele",
        levelKey: "level",
        contourLayer: "contours",
      }),
    ],
    "maxzoom": 19,
  });

  map.addLayer({
    id: "contours",
    type: "line",
    source: "contourSource",
    "source-layer": "contours",
    paint: {
      "line-color": "rgba(0,0,0, 0.5)",
      "line-width": ["*", ["match", ["get", "level"], 1, 1, 0.5], CONTOUR_LINE_WIDTH_FACTOR]
    },
    layout: {
      "line-join": "round",
      visibility: 'none'
    },
    before: "gsi_std",
  });

  map.addLayer({
    id: "contour-text",
    type: "symbol",
    source: "contourSource",
    "source-layer": "contours",
    filter: [">", ["get", "level"], 0],
    paint: {
      "text-halo-color": "white",
      "text-halo-width": 1,
    },
    layout: {
      "symbol-placement": "line",
      "text-anchor": "center",
      "text-size": 12,
      "text-field": [
        "concat",
        ["number-format", ["get", "ele"], {}],
        "",
      ],
      "text-font": ["Noto Sans Bold"],
      visibility: 'none'
    },
  });
}

// 地形コントロールの更新
function updateTerrainControl(map, selectedDemSource, demSources, maplibregl) {
  let terrainExists = false;
  if (map.getTerrain()) {
    terrainExists = true;
  }

  if (map.getSource("terrainSource")) {
    map.removeSource("terrainSource");
  }

  const terrainTilesUrl = getTilesUrl(selectedDemSource, demSources, "terrain");

  map.addSource("terrainSource", {
    "type": "raster-dem",
    "tiles": terrainTilesUrl,
    "attribution": demSources[selectedDemSource]["attribution"],
    "maxzoom": demSources[selectedDemSource]["maxzoom"],
    "tileSize": demSources[selectedDemSource]["tileSize"],
  });

  if (terrainExists) {
    map.setTerrain({ "source": "terrainSource", "exaggeration": 1 });
  }

  if (typeof terrainControl !== 'undefined') {
    map.removeControl(terrainControl);
  }

  terrainControl = new maplibregl.TerrainControl({
    source: "terrainSource",
    exaggeration: 1,
  });
  map.addControl(terrainControl);
}

// 標高ソースのURLを取得
function getTilesUrl(selectedDemSource, demSources, layerType) {
  const encoding = demSources[selectedDemSource]["encoding"];
  const tilesUrlMap = {
    "relief": {
      "gsj": url => "reliefGsj://" + url,
      "mapbox": url => "reliefMapbox://" + url
    },
    "slope": {
      "gsj": url => "slopeGsj" + (demSources[selectedDemSource]["tiles"][0].includes('{x}/{y}') ? 'Xy' : 'Yx') + "://" + url,
      "mapbox": url => "slopeMapbox" + (demSources[selectedDemSource]["tiles"][0].includes('{x}/{y}') ? 'Xy' : 'Yx') + "://" + url
    },
    "hillshade": {
      "gsj": url => "gsj://" + url,
      "mapbox": url => url
    },
    "terrain": {
      "gsj": url => "gsj://" + url,
      "mapbox": url => url
    }
  };

  return demSources[selectedDemSource].tiles.map(tilesUrlMap[layerType][encoding]);
}

// レイヤーの可視性設定の共通化
function setLayerVisibility(map, layerId, visible) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

// マジックナンバーの定数化
const HILLSHADE_EXAGGERATION = 0.4;
const HILLSHADE_HIGHLIGHT_COLOR = "rgb(255, 255, 255)";
const CONTOUR_LINE_WIDTH_FACTOR = 2;

// 標高Sourceの切り替え
export function updateTerrainLayers(map, selectedDemSource, demSources, contourInterval, maplibregl) {

  // Update relief layer
  updateReliefLayer(map, selectedDemSource, demSources);

  // Update slope layer
  updateSlopeLayer(map, selectedDemSource, demSources);

  // Update hillshade layer
  updateHillshadeLayer(map, selectedDemSource, demSources);

  // Update contour layers
  updateContourLayers(map, selectedDemSource, demSources, contourInterval, maplibregl);

  // Update terrain control
  updateTerrainControl(map, selectedDemSource, demSources, maplibregl);
}