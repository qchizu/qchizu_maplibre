import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import OpacityControl from "maplibre-gl-opacity";
import "maplibre-gl-opacity/dist/maplibre-gl-opacity.css";
import { demTranscoderProtocol } from "./src/demTranscoderProtocol.js";
import { png2ReliefProtocol } from "./src/png2ReliefProtocol.js";

// addProtocolを設定
MapLibreGL.addProtocol('gsi', demTranscoderProtocol("gsi", "gsi"));
MapLibreGL.addProtocol('reliefGsi', png2ReliefProtocol('reliefGsi',"gsi",true));
MapLibreGL.addProtocol('reliefMapbox', png2ReliefProtocol('reliefMapbox',"mapbox",true));

//png標高タイルの設定（index.htmlのリストも修正のこと）
const demSources = {
  "gsi10B": {
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'],
    encoding: "gsi",
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
    maxzoom: 14,
    tileSize: 256,
  },
  "gsi5A": {
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'],
    encoding: "gsi",
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
    maxzoom: 15,
    tileSize: 256,
  },
  "gsi5B": {
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png'],
    encoding: "gsi",
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
    maxzoom: 15,
    tileSize: 256,
  },
  "gsi5C": {
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/{z}/{x}/{y}.png'],
    encoding: "gsi",
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
    maxzoom: 15,
    tileSize: 256,
  },
  "gsjMixed": {
    tiles: ['https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png'],
    encoding: "gsi",
    attribution: '<a href="https://gbank.gsj.jp/seamless/elev/" target="_blank">産総研地質調査総合センター</a>',
    maxzoom: 17,
    tileSize: 256,
  },
  "gsiNotoDsm": {
    tiles: ['https://maps.gsi.go.jp/xyz/2mDSM/{z}/{x}/{y}.png'],
    encoding: "mapbox",
    attribution: '<a href="https://www.gsi.go.jp/johofukyu/johofukyu240122_00001.html" target="_blank">国土地理院</a>',
    maxzoom: 15,
    tileSize: 256,
  },
  "qchizuNotoE": {
    tiles: ['https://mapdata.qchizu.xyz/94dem/ishikawa_01/{z}/{x}/{y}.png'],
    encoding: "mapbox",
    attribution: '<a href="https://info.qchizu.xyz" target="_blank">Ｑ地図タイル</a>(<a href="https://www.geospatial.jp/ckan/dataset/aac-disaster-20240101-dem" target="_blank">朝日航洋㈱</a>(<a href="https://www.geospatial.jp/ckan/dataset/2024-notoeast-pc" target="_blank">AIGID</a>(石川県測量成果))使用)',
    maxzoom: 17,
    tileSize: 256,
  },
  "qchizuNotoW": {
    tiles: ['https://mapdata.qchizu.xyz/94dem/ishikawa_02/{z}/{x}/{y}.png'],
    encoding: "mapbox",
    attribution: '<a href="https://info.qchizu.xyz" target="_blank">Ｑ地図タイル</a>(<a href="https://www.geospatial.jp/ckan/dataset/2024-notowest-ground" target="_blank">AIGID</a>(石川県測量成果))を使用)',
    maxzoom: 17,
    tileSize: 256,
  },
  "qchizuTest1": {
    tiles: ['https://mapdata.qchizu.xyz/94dem/xxxxx/{z}/{x}/{y}.png'],
    encoding: "mapbox",
    attribution: 'テスト用',
    maxzoom: 15,
    tileSize: 256,
  },
};

//等高線間隔
var contourInterval = {
  // zoom: [minor, major]
  11: [100, 500],
  12: [50, 250],
  13: [50, 250],
  14: [20, 100],
  15: [10, 50],
  16: [5, 25],
  17: [1, 5],
  18: [1, 5],
};

let DemSourceSelector = document.getElementById("Dem_Source_Selector");
let terrainControl;

//Mapが読み込まれたときやソースが変更されたときに呼び出される関数
function updateMapLayers() {
  var selectedSource = DemSourceSelector.value;

  //【"relief"レイヤーの処理】
  if (map.getLayer("relief")) {
    map.removeLayer("relief");
  }
  if (map.getSource("reliefSource")) {
    map.removeSource("reliefSource");
  }

  let reliefTilesUrl;
  if (demSources[selectedSource]["encoding"] === "gsi") {
    reliefTilesUrl = demSources[selectedSource].tiles.map(url => "reliefGsi://" + url);
  } else if (demSources[selectedSource]["encoding"] === "mapbox"){
    reliefTilesUrl = demSources[selectedSource].tiles.map(url => "reliefMapbox://" + url);
  }

  map.addSource(
    "reliefSource", {
      "type": "raster",
      "tiles": reliefTilesUrl,
      "attribution": demSources[selectedSource]["attribution"],
      "maxzoom": demSources[selectedSource]["maxzoom"],
      "tileSize": demSources[selectedSource]["tileSize"],
    }
  ); 

  var reliefCheckbox = document.getElementById("relief");

  map.addLayer({
    id: "relief",
    type: "raster",
    source: "reliefSource",
    layout: {
      visibility: reliefCheckbox.checked ? "visible" : "none"
    },
  });

  //【hillshadeレイヤーの処理】
  if (map.getLayer("hillshade")) {
    map.removeLayer("hillshade");
  }
  if (map.getSource("hillshadeSource")) {
    map.removeSource("hillshadeSource");
  }

  let hillshadeTilesUrl;
  if (demSources[selectedSource]["encoding"] === "gsi") {
    hillshadeTilesUrl = demSources[selectedSource].tiles.map(url => "gsi://" + url);
  } else if (demSources[selectedSource]["encoding"] === "mapbox"){
    hillshadeTilesUrl = demSources[selectedSource].tiles;
  }

  map.addSource(
    "hillshadeSource", {
      "type": "raster-dem",
      "tiles": hillshadeTilesUrl,
      "attribution": demSources[selectedSource]["attribution"],
      "maxzoom": demSources[selectedSource]["maxzoom"],
      "tileSize": demSources[selectedSource]["tileSize"],
    }
  ); 

  var hillshadeCheckbox = document.getElementById("hillshade");

  map.addLayer({
    id: "hillshade",
    type: "hillshade",
    source: "hillshadeSource",
    paint: {
      "hillshade-illumination-anchor": "map",
      "hillshade-exaggeration": 0.5,
    },
    layout: {
      visibility: hillshadeCheckbox.checked ? "visible" : "none"
    },
  });

  //【等高線の処理】
  var contour = new mlcontour.DemSource({
    url:  demSources[selectedSource]["tiles"][0],
    encoding: demSources[selectedSource]["encoding"], //mapbox or terrarium or gsi
    maxzoom: demSources[selectedSource]["maxzoom"], // dem_png → 14，5a,b,c → 15
  });
  contour.setupMaplibre(MapLibreGL);

  if (map.getLayer("contours")) {
    map.removeLayer("contours");
  }
  if (map.getLayer("contour-text")) {
    map.removeLayer("contour-text");
  }
  if (map.getSource("contourSource")) {
    map.removeSource("contourSource");
  }

  map.addSource(
    "contourSource", {
      "type": "vector",
      "tiles": [
        contour.contourProtocolUrl({
          multiplier: 1, // meters to feet
          thresholds: contourInterval,
          elevationKey: "ele",
          levelKey: "level",
          contourLayer: "contours",
        }),
      ],
      "maxzoom": 18, //この意味要検討
    }
  );

  var contoursCheckbox = document.getElementById("contours");
  var contourTextCheckbox = document.getElementById("contour-text");

  map.addLayer({
    id: "contours",
    type: "line",
    source: "contourSource",
    "source-layer": "contours",
    paint: {
      "line-color": "rgba(0,0,0, 0.5)",
      "line-width": ["*", ["match", ["get", "level"], 1, 1, 0.5],2] //★最後の引数で線の太さを調整
    },
    layout: {
      "line-join": "round",
      visibility: contoursCheckbox.checked ? "visible" : "none"
    },
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
        "", //単位を表示する場合はここに入れる
      ],
      "text-font": ["Noto Sans Bold"],
      visibility: contourTextCheckbox.checked ? "visible" : "none"
    },
  });

  //【terrainControlの処理】
  if (map.getSource("terrainSource")) {
    map.removeSource("terrainSource");
  }

  let terrainTilesUrl;
  if (demSources[selectedSource]["encoding"] === "gsi") {
    terrainTilesUrl = demSources[selectedSource].tiles.map(url => "gsi://" + url);
  } else if (demSources[selectedSource]["encoding"] === "mapbox") {
    terrainTilesUrl = demSources[selectedSource].tiles;
  }

  console.log(terrainTilesUrl);

  map.addSource("terrainSource", {
    "type": "raster-dem",
    "tiles": terrainTilesUrl,
    "attribution": demSources[selectedSource]["attribution"],
    "maxzoom": demSources[selectedSource]["maxzoom"],
    "tileSize": demSources[selectedSource]["tileSize"],
  });

  map.setTerrain({ "source": "terrainSource", "exaggeration": 1 });

  if (typeof terrainControl !== 'undefined') {
    map.removeControl(terrainControl);
  }

  terrainControl = new MapLibreGL.TerrainControl({
    source: "terrainSource",
    exaggeration: 1,
  });
  map.addControl(terrainControl);

  // レイヤーを再描画
  map.triggerRepaint();
}

document.addEventListener("DOMContentLoaded", function () {
  // セレクトボックスの変更イベントを監視
  DemSourceSelector.addEventListener("change", updateMapLayers);
});

const map = new MapLibreGL.Map({
  container: "map",
  zoom: 4,
  center: [140.084556, 36.104611],
  pitch: 45,
  maxPitch: 85, //maxPitch must be less than or equal to 85
  hash: true,
  style: {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      gsi_std: {
        type: "raster",
        tiles: ["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        tileSize: 256,
        maxzoom: 18,
      },
      gsi_pale: {
        type: "raster",
        tiles: ["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        tileSize: 256,
        maxzoom: 18,
      },
      gsi_seamlessphoto: {
        type: "raster",
        tiles: ["https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg"],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        tileSize: 256,
        maxzoom: 18,
      },
      p17_ishikawa_f_01: {
        type: "raster",
        tiles: ["https://mapdata.qchizu2.xyz/17p/ishikawa_f_01/{z}/{x}/{y}.png"],
        attribution: '<a target="_blank"href="https://info.qchizu.xyz">Q地図タイル</a>(AIGID<a target="_blank"href="https://www.geospatial.jp/ckan/dataset/2024-notoeast-ortho">1</a>、<a target="_blank"href="https://www.geospatial.jp/ckan/dataset/2024-notowest-ortho">2</a>(石川県)複製)',
        tileSize: 256,
        maxzoom: 19,
      },
      ishikawa_cs: {
        type: "raster",
        tiles: ["https://www2.ffpri.go.jp/soilmap/tile/cs_noto/{z}/{x}/{y}.png"],
        attribution: '<<a target="_blank"href="https://www.geospatial.jp/ckan/dataset/2024-notowest-mtopo">森林総研</a>(石川県))',
        tileSize: 256,
        maxzoom: 17,
      },
      ishikawa_rrim: {
        type: "raster",
        tiles: ["https://xs489works.xsrv.jp/raster-tiles/pref-ishikawa/notowest-red-tiles/{z}/{x}/{y}.png"],
        attribution: '<a target="_blank"href="https://github.com/shi-works/noto-hanto-earthquake-2024-notowest-3d-terrain-map-on-maplibre-gl-js">shi-works</a>(<a target="_blank"href="https://www.geospatial.jp/ckan/dataset/2024-notowest-mtopo">AIGID</a>(石川県))',
        tileSize: 256,
        maxzoom: 18,
      },
    },
    
    layers: [
      //白い背景　レイヤーがないと地形の立体表示時に表示が乱れる
      {
        id: "white-background",
        type: "background",
        paint: {
          "background-color": "#ffffff",
        },
      },
      //地図
      {
        id: "gsi_std",
        type: "raster",
        source: "gsi_std",
        layout: {
          visibility: "none",
        },
      },
      {
        id: "gsi_pale",
        type: "raster",
        source: "gsi_pale",
        layout: {
          visibility: "none",
        },
      },
      {
        id: "gsi_seamlessphoto",
        type: "raster",
        source: "gsi_seamlessphoto",
        layout: {
          visibility: "none",
        },
      },
      {
        id: "p17_ishikawa_f_01",
        type: "raster",
        source: "p17_ishikawa_f_01",
        layout: {
          visibility: "none",
        },
      },
      {
        id: "ishikawa_cs",
        type: "raster",
        source: "ishikawa_cs",
        layout: {
          visibility: "none",
        },
      },
      {
        id: "ishikawa_rrim",
        type: "raster",
        source: "ishikawa_rrim",
        layout: {
          visibility: "none",
        },
      },
      {
        id: "relief", //段彩図ダミーレイヤー
        type: "background",
        paint: {
          "background-color": "#9A6229",
        },
        layout: {
          visibility: "none"
        },
      },
      {
        id: "hillshade", //陰影ダミーレイヤー
        type: "background",
        paint: {
          "background-color": "#666666",
        },
        layout: {
          visibility: "none"
        },
      },
      {
        id: "contours", //等高線ダミーレイヤー
        type: "background",
        paint: {
          "background-color": "#008000",
        },
        layout: {
          visibility: "none"
        },
      },
      {
        id: "contour-text", //等高線標高ダミーレイヤー
        type: "background",
        paint: {
          "background-color": "#002000",
        },
        layout: {
          visibility: "none"
        },
      },
    ],
  },
});

  // ズーム・回転
  map.addControl(
    new MapLibreGL.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true
    })
);

// フルスクリーンモードのオンオフ
map.addControl(new MapLibreGL.FullscreenControl());

// 現在位置表示
map.addControl(new MapLibreGL.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: false
    },
    fitBoundsOptions: { maxZoom: 18 },
    trackUserLocation: true,
    showUserLocation: true
}));

// スケール表示
map.addControl(new MapLibreGL.ScaleControl({
    maxWidth: 200,
    unit: 'metric'
}));

map.on("load", () => {

  const opacity = new OpacityControl({
    baseLayers: {
      "gsi_std" : "標準地図",
      "gsi_pale" : "淡色地図",
      "gsi_seamlessphoto" : "写真",
      "white-background" : "背景なし",
      "p17_ishikawa_f_01" : "能登写真(2020,2022)",
      "ishikawa_cs" : "能登CS立体図",
      "ishikawa_rrim" : "能登西部赤色立体地図",
      "relief" : "段彩図",
      },
    overLayers: {
      "hillshade" : "陰影",
      "contours" : "等高線",
      "contour-text" : "等高線数値",
      },
    opacityControl: false,
  });
  map.addControl(opacity, "top-left");

  updateMapLayers();

});

map.on('moveend', function() {
  var zoom = map.getZoom();
  var LeafletZoom = Math.round(zoom)+1;
  var center = map.getCenter();
  var lat = center.lat.toFixed(6);
  var lon = center.lng.toFixed(6);
  var link = document.querySelector('#Standard_Edition_Link a');
  link.href = `https://maps.qchizu.xyz/#${LeafletZoom}/${lat}/${lon}`;
});