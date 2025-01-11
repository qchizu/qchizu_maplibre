import { removeProtocol } from 'maplibre-gl';
import { mapViewParameters } from './stores/MapViewParameters.js'; //リンク用の情報（緯度・経度など）
import mlcontour from '../node_modules/maplibre-contour/dist/index'; //一部改変
let terrainControl;
let popup = null;

// ベースレイヤーの可視性設定
export function updateBaseLayerVisibility(map, selectedBaseLayer) {
  map.setLayoutProperty('gsi_std', 'visibility', selectedBaseLayer === 'gsi_std' ? 'visible' : 'none');
  map.setLayoutProperty('gsi_pale', 'visibility', selectedBaseLayer === 'gsi_pale' ? 'visible' : 'none');
  map.setLayoutProperty('gsi_seamlessphoto', 'visibility', selectedBaseLayer === 'gsi_seamlessphoto' ? 'visible' : 'none');
  map.setLayoutProperty('open_street_map', 'visibility', selectedBaseLayer === 'open_street_map' ? 'visible' : 'none');
  map.setLayoutProperty('relief', 'visibility', selectedBaseLayer === 'relief' ? 'visible' : 'none');
  map.setLayoutProperty('slope-color', 'visibility', selectedBaseLayer === 'slope-color' ? 'visible' : 'none');  
  map.setLayoutProperty('cs', 'visibility', selectedBaseLayer === 'cs' ? 'visible' : 'none');
  map.setLayoutProperty('white-background', 'visibility', selectedBaseLayer === 'white-background' ? 'visible' : 'none');
  map.setLayoutProperty('p17_ishikawa_f_01', 'visibility', selectedBaseLayer === 'p17_ishikawa_f_01' ? 'visible' : 'none');
  map.setLayoutProperty('ishikawa_cs', 'visibility', selectedBaseLayer === 'ishikawa_cs' ? 'visible' : 'none');
  map.setLayoutProperty('ishikawa_rrim', 'visibility', selectedBaseLayer === 'ishikawa_rrim' ? 'visible' : 'none');
  map.setLayoutProperty('ishikawa_photo_2024', 'visibility', selectedBaseLayer === 'ishikawa_photo_2024' ? 'visible' : 'none');
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

// 傾斜区分図の更新
function updateSlopeColorLayer(map, selectedDemSource, demSources) {
  if (map.getLayer("slope-color")) {
    map.removeLayer("slope-color");
  }
  if (map.getSource("slopeColorSource")) {
    map.removeSource("slopeColorSource");
  }

  const slopeColorTilesUrl = getTilesUrl(selectedDemSource, demSources, "slope-color");

  map.addSource("slopeColorSource", {
    "type": "raster",
    "tiles": slopeColorTilesUrl,
    "attribution": demSources[selectedDemSource]["attribution"],
    "maxzoom": demSources[selectedDemSource]["maxzoom"],
    "tileSize": demSources[selectedDemSource]["tileSize"],
  });

  map.addLayer({
    id: "slope-color",
    type: "raster",
    source: "slopeColorSource",
    layout: {
      visibility: 'none'
    },
  });
}

// CS立体図の更新
export function updateCsLayer(map, selectedDemSource, demSources, dem2CsProtocol, csParameters ,selectedBaseLayer) {
  if (map.getLayer("cs")) {
    map.removeLayer("cs");
  }
  if (map.getSource("csSource")) {
    map.removeSource("csSource");
  }

  removeProtocol("csGsjXy");
  removeProtocol("csGsjYx");
  dem2CsProtocol("csGsjXy", "gsj", "xy", csParameters.terrainScale, csParameters.redAndBlueIntensity);
  dem2CsProtocol("csGsjYx", "gsj", "yx", csParameters.terrainScale, csParameters.redAndBlueIntensity);

  const csTilesUrl = getTilesUrl(selectedDemSource, demSources, "cs");

  map.addSource("csSource", {
    "type": "raster",
    "tiles": csTilesUrl,
    "attribution": demSources[selectedDemSource]["attribution"],
    "maxzoom": demSources[selectedDemSource]["maxzoom"],
    "tileSize": demSources[selectedDemSource]["tileSize"],
  });

  map.addLayer({
    id: "cs",
    type: "raster",
    source: "csSource",
    layout: {
      visibility: selectedBaseLayer === 'cs' ? 'visible' : 'none'
    },
  },"relief" // このレイヤーの上に重ねる。
  );
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
    "encoding": "terrarium",
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
    "encoding": "terrarium", //gsj以外に対応させるには、変数で管理する必要がある
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
      "gsj": url => "slopeGsj" + (demSources[selectedDemSource]["tiles"][0].includes('{x}/{y}') ? 'Xy' : 'Yx') + "Gray" + "://" + url,
      "mapbox": url => "slopeMapbox" + (demSources[selectedDemSource]["tiles"][0].includes('{x}/{y}') ? 'Xy' : 'Yx') + "Gray" + "://" + url
    },
    "slope-color": {
      "gsj": url => "slopeGsj" + (demSources[selectedDemSource]["tiles"][0].includes('{x}/{y}') ? 'Xy' : 'Yx') + "Color" + "://" + url,
      "mapbox": url => "slopeMapbox" + (demSources[selectedDemSource]["tiles"][0].includes('{x}/{y}') ? 'Xy' : 'Yx') + "Color" + "://" + url
    },
    "cs": {
      "gsj": url => "csGsj" + (demSources[selectedDemSource]["tiles"][0].includes('{x}/{y}') ? 'Xy' : 'Yx') + "://" + url,
      "mapbox": url => "csMapbox" + (demSources[selectedDemSource]["tiles"][0].includes('{x}/{y}') ? 'Xy' : 'Yx') + "://" + url
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

// 定数
const HILLSHADE_EXAGGERATION = 1;
const HILLSHADE_HIGHLIGHT_COLOR = "rgb(255, 255, 255)";
const CONTOUR_LINE_WIDTH_FACTOR = 2;

// 標高Sourceの切り替え
export function updateTerrainLayers(map, selectedDemSource, demSources, contourInterval, maplibregl, dem2CsProtocol, csParameters, selectedBaseLayer) {

  // Update relief layer
  updateReliefLayer(map, selectedDemSource, demSources);

  // Update slope color layer
  updateSlopeColorLayer(map, selectedDemSource, demSources);

  // Update cs layer
  updateCsLayer(map, selectedDemSource, demSources, dem2CsProtocol, csParameters, selectedBaseLayer); // 今後の作業　他の関数もselectedBaseLayerを引数に追加
  
  // Update slope layer
  updateSlopeLayer(map, selectedDemSource, demSources);

  // Update hillshade layer
  updateHillshadeLayer(map, selectedDemSource, demSources);

  // Update contour layers
  updateContourLayers(map, selectedDemSource, demSources, contourInterval, maplibregl);

  // Update terrain control
  updateTerrainControl(map, selectedDemSource, demSources, maplibregl);
}

// リンク用の情報を更新
export function updateMapViewParameters(map, maplibregl) {
  const zoom = map.getZoom();
  const center = map.getCenter();
  const lng = center.lng;
  const lat = center.lat;
  const bearing = map.getBearing();
  const pitch = map.getPitch();

  const bearing360 = bearing < 0 ? 360 + bearing : bearing; // 0 to 360

  // カメラの高さを計算
  const cameraAltitudeInPixels = Math.cos(pitch/ 180 * Math.PI) * map.transform.cameraToCenterDistance;
  
  // カメラの高さによる地図の中心点のズレを計算
  const cameraOffsetInPixels = Math.tan(pitch/ 180 * Math.PI) * map.transform.cameraToCenterDistance;

  // map.transform.centerPointは画面中央のピクセル座標（原点：左上、xが横方向、yが縦方向、いずれも正）
  const cameraPointInPixels = map.transform.centerPoint.add(new maplibregl.Point(0, cameraOffsetInPixels));
  const cameraPoint = map.transform.pointLocation(cameraPointInPixels);

  const verticalScaleConstant = map.transform.worldSize / (2 * Math.PI * 6378137 * Math.abs(Math.cos(cameraPoint.lat * (Math.PI / 180))));
  const cameraAltitude = cameraAltitudeInPixels / verticalScaleConstant;
  const targetAltitude = map.getCameraTargetElevation();

  // 桁数の計算用
  // https://github.com/maplibre/maplibre-gl-js/blob/863541feb5e1bbc189abbb90fdea7a67ad837588/src/ui/hash.ts#L24
  const precision = Math.ceil((Math.round(zoom* 100) / 100 * Math.LN2 + Math.log(512 / 360 / 0.5)) / Math.LN10);
  const m = Math.pow(10, precision);

  mapViewParameters.set({
    zoom: Math.round(zoom* 100) / 100,
    lng:  Math.round(lng * m) / m,
    lat: Math.round(lat * m) / m,
    bearing: bearing,
    pitch: pitch,
    cameraLng: Math.round(cameraPoint.lng * m) / m,
    cameraLat: Math.round(cameraPoint.lat * m) / m,
    cameraAltitude: Number(cameraAltitude.toFixed(2)),
    targetAltitude: Number(targetAltitude.toFixed(2)),
    bearing360: bearing360.toFixed(2),
  });
}

export function flyTo(e,map) {
  // 右クリック地点を中心に設定
  map.flyTo({
    center: e.lngLat,
    curve: 0,
    speed: 10,
  });
}

export function showPopupLink(e, map, maplibregl, mapViewParameters) {
  // 既存のポップアップがあれば削除
  if (popup) {
      popup.remove();
  }
  // モバイル判定
  let isMobile = window.innerWidth <= 768;
  popup = new maplibregl.Popup({ offset: [0, -25] })
  .setLngLat(e.lngLat)
  .setHTML(`
      <div class='popup-lng-lat'>
        緯度: ${mapViewParameters.lat}<br>
        経度: ${mapViewParameters.lng}<br>
        ${mapViewParameters.targetAltitude !== 0.00 ? `標高: ${Number(mapViewParameters.targetAltitude).toFixed(1)}` : ''}
      </div>
      <table class='map-btn-container'>
      <tr>
      <td><a class='map-btn' href='https://map.yahoo.co.jp/place?lat=${mapViewParameters.lat}&lon=${mapViewParameters.lng}&zoom=${mapViewParameters.zoom+1}&maptype=basic' target='_blank'>Y!地図</a></td>
      <td><a class='map-btn' href='https://map.yahoo.co.jp/place?lat=${mapViewParameters.lat}&lon=${mapViewParameters.lng}&zoom=${mapViewParameters.zoom+1}&maptype=satellite' target='_blank'>Y!写真</a></td>
      <td><a class='map-btn' href='https://maps.qchizu.xyz/#${mapViewParameters.zoom+1}/${mapViewParameters.lat}/${mapViewParameters.lng}' target='_blank'>通常版</a></td>
      </tr>
      <tr>
      <td><a class='map-btn' href='https://www.google.com/maps/place/${mapViewParameters.lat},${mapViewParameters.lng}/@${mapViewParameters.lat},${mapViewParameters.lng},${mapViewParameters.zoom+1}z' target='_blank'>G地図</a></td>
      <td><a class='map-btn' href='https://www.google.com/maps/place/${mapViewParameters.lat},${mapViewParameters.lng}/@${mapViewParameters.cameraLat},${mapViewParameters.cameraLng},${mapViewParameters.cameraAltitude}a,35y,${mapViewParameters.bearing360}h,${mapViewParameters.pitch}t/data=!3m1!1e3' target='_blank'>G写真</a></td>
      <td><a class='map-btn' href='https://www.google.com/maps/@?api=1&map_action=pano&parameters&viewpoint=${mapViewParameters.lat},${mapViewParameters.lng}&heading=${mapViewParameters.bearing}' target='_blank'>ビュー</a></td>
      </tr>
      </table>
      <style>
          .popup-lng-lat {
              font-family:  "BIZ UDPGothic", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
              font-size: 10pt;
          }
          .map-btn-container {
              width: 100%;
              font-weight:bold;
              line-height:${isMobile ? 3 : 1.7};
          }
          .map-btn-container td {
              padding: 5px;
          }
          .map-btn-container td a.map-btn {
              padding: 2px 2px;
          }
          .map-btn-container td a.map-btn {
              display: block;
              width: 100%;
              text-align: center;
              background-color: #e6b422;
              border: none;
              border-radius: 4px;
              text-decoration: none;
              font-size: 10pt;
              color: #333;
              text-shadow:
              0 -1px 1px #FFF,
              -1px 0 1px #FFF,
              1px 0 1px #FFF,
              0 1px 1px #FFF;
          }
      `)
  .addTo(map);
}

// ポップアップが存在する場合に削除
export function removePopupLink() {
  if (popup) {
    popup.remove();
    popup = null;
  }
}
