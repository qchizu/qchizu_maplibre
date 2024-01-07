import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import OpacityControl from "maplibre-gl-opacity";
import "maplibre-gl-opacity/dist/maplibre-gl-opacity.css";
import "./src/maplibre-gl-gsi-terrain-fast-png";

document.addEventListener("DOMContentLoaded", function () {
  var DemSourceSelector = document.getElementById("Dem_Source_Selector");
  // セレクトボックスの変更イベントを監視
  DemSourceSelector.addEventListener("change", function () {
    var selectedSource = DemSourceSelector.value;
    var hillshadeCheckbox = document.getElementById("hillshade");
    map.removeLayer("hillshade");

    // 選択されたソースに応じて"hillshade" レイヤーのソースを変更
    map.addLayer({
      id: "hillshade",
      type: "hillshade",
      source: selectedSource + "2", //次のようなエラーが出るため別ソースを使用　You are using the same source for a hillshade layer and for 3D terrain. Please consider using two separate sources to improve rendering quality.
      paint: {
        "hillshade-illumination-anchor": "map",
        "hillshade-exaggeration": 0.5,
      },
      layout: {
        visibility: hillshadeCheckbox.checked ? "visible" : "none"
      },
    });

    map.removeControl(terrainControl);

    // 新しいソースで地形コントロールを再作成
    terrainControl = new MapLibreGL.TerrainControl({
      source: selectedSource,
      exaggeration: 1
    });
    // 新しい地形コントロールを地図に追加
    map.addControl(terrainControl);

    // ボタンを押して地形を再描画しないと画面が切り替わらないため、追加
    var terrainOff = document.querySelector('.maplibregl-ctrl-terrain-enabled');
    if (terrainOff) {
        terrainOff.click();
        var terrainOn = document.querySelector('.maplibregl-ctrl-terrain');
        terrainOn.click();
    }

    /* map.setTerrain({ source: selectedSource, exaggeration: 1.0 }); このコードであればリアルタイムで変更を反映できるが、動作が遅い*/

    //updateContourLayer(selectedSource);

    map.removeLayer("contours");
    map.removeLayer("contour-text");

    var contoursCheckbox = document.getElementById("contours");
    var contourTextCheckbox = document.getElementById("contour-text");

    var dem2ContourSource = {
      "gsidem10B": "contours10B",
      "gsidem5A": "contours5A",
      "gsidem5B": "contours5B",
      "gsidem5C": "contours5C",
      //"gsjdemmixed": "contoursMixed",
      //"tochigidem": "contourSourceTochigi",
      //"kochidem": "contourSourceKochi",
    };

    map.addLayer({
      id: "contours",
      type: "line",
      source: dem2ContourSource[selectedSource],
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
      source: dem2ContourSource[selectedSource],
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

    // レイヤーを再描画
    map.triggerRepaint();

    });

});

//等高線描画用
var contourSource10B = new mlcontour.DemSource({
  url: "https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png",
  encoding: "gsi", //mapbox or terrarium or gsi
  maxzoom: 14, // dem_png → 14，5a,b,c → 15
});
var contourSource5A = new mlcontour.DemSource({
  url: "https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png",
  encoding: "gsi", //mapbox or terrarium or gsi
  maxzoom: 15, // dem_png → 14，5a,b,c → 15
});
var contourSource5B = new mlcontour.DemSource({
  url: "https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png",
  encoding: "gsi", //mapbox or terrarium or gsi
  maxzoom: 15, // dem_png → 14，5a,b,c → 15
});
var contourSource5C = new mlcontour.DemSource({
  url: "https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/{z}/{x}/{y}.png",
  encoding: "gsi", //mapbox or terrarium or gsi
  maxzoom: 15, // dem_png → 14，5a,b,c → 15
});

/* 
var contourSourceMixed = new mlcontour.DemSource({
  url: "https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png",
  encoding: "gsi", //mapbox or terrarium or gsi
  maxzoom: 17, // dem_png → 14，5a,b,c → 15
});
var contourSourceTochigi = new mlcontour.DemSource({
  url: "https://rinya-tochigi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png",
  encoding: "mapbox", //mapbox or terrarium or gsi
  maxzoom: 18, // dem_png → 14，5a,b,c → 15
});
var contourSourceKochi = new mlcontour.DemSource({
  url: "https://rinya-kochi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png",
  encoding: "mapbox", //mapbox or terrarium or gsi
  maxzoom: 18, // dem_png → 14，5a,b,c → 15
}); 
*/

contourSource10B.setupMaplibre(MapLibreGL);
contourSource5A.setupMaplibre(MapLibreGL);
contourSource5B.setupMaplibre(MapLibreGL);
contourSource5C.setupMaplibre(MapLibreGL);
/*
contourSourceMixed.setupMaplibre(MapLibreGL);
contourSourceTochigi.setupMaplibre(MapLibreGL);
contourSourceKochi.setupMaplibre(MapLibreGL);
*/

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

const map = new MapLibreGL.Map({
  container: "map",
  zoom: 4,
  center: [140.084556, 36.104611],
  hash: true,
  maxPitch: 85, //maxPitch must be less than or equal to 85
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

      //terrain
      gsidem10B: {
        type: 'raster-dem',
        tiles: ['gsidem://https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        maxzoom: 14,
        tileSize: 256,
      },
      gsidem5A: {
        type: 'raster-dem',
        tiles: ['gsidem://https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        maxzoom: 15,
        tileSize: 256,
      },
      gsidem5B: {
        type: 'raster-dem',
        tiles: ['gsidem://https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png'],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        maxzoom: 15,
        tileSize: 256,
      },
      gsidem5C: {
        type: 'raster-dem',
        tiles: ['gsidem://https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/{z}/{x}/{y}.png'],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        maxzoom: 15,
        tileSize: 256,
      },
      /*
      gsjdemmixed: {
        type: 'raster-dem',
        tiles: ['gsidem://https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png'],
        attribution: '<a href="https://gbank.gsj.jp/seamless/elev/" target="_blank">産総研地質調査総合センターウェブサイト</a>',
        maxzoom: 17,
        tileSize: 256,
      },
      tochigidem: {
        type: 'raster-dem',
        tiles: ['https://rinya-tochigi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/dem05_tochigi" target="_blank">栃木県</a>',
        maxzoom: 18,
        tileSize: 256,
      },
      kochidem: {
        type: 'raster-dem',
        tiles: ['https://rinya-kochi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/dem05_kochi" target="_blank">高知県</a>',
        maxzoom: 18,
        tileSize: 256,
      },
      */

      //hillshade用
      gsidem10B2: {
        type: 'raster-dem',
        tiles: ['gsidem://https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        maxzoom: 14,
        tileSize: 256,
      },
      gsidem5A2: {
        type: 'raster-dem',
        tiles: ['gsidem://https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        maxzoom: 15,
        tileSize: 256,
      },
      gsidem5B2: {
        type: 'raster-dem',
        tiles: ['gsidem://https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png'],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        maxzoom: 15,
        tileSize: 256,
      },
      gsidem5C2: {
        type: 'raster-dem',
        tiles: ['gsidem://https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/{z}/{x}/{y}.png'],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        maxzoom: 15,
        tileSize: 256,
      },
      /*
      gsjdemmixed2: {
        type: 'raster-dem',
        tiles: ['gsidem://https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png'],
        attribution: '<a href="https://gbank.gsj.jp/seamless/elev/" target="_blank">産総研地質調査総合センターウェブサイト</a>',
        maxzoom: 17,
        tileSize: 256,
      },
      tochigidem2: {
        type: 'raster-dem',
        tiles: ['https://rinya-tochigi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/dem05_tochigi" target="_blank">栃木県</a>',
        maxzoom: 18,
        tileSize: 256,
      },
      kochidem2: {
        type: 'raster-dem',
        tiles: ['https://rinya-kochi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
        attribution: '<a href="https://www.geospatial.jp/ckan/dataset/dem05_kochi" target="_blank">高知県</a>',
        maxzoom: 18,
        tileSize: 256,
      },
      */

      contours10B: {
        type: "vector",
        tiles: [
          contourSource10B.contourProtocolUrl({
            // meters to feet
            multiplier: 1, //★変更前　3.28084
            thresholds: contourInterval,
            elevationKey: "ele",
            levelKey: "level",
            contourLayer: "contours",
          }),
        ],
        maxzoom: 18,
      },
      contours5A: {
        type: "vector",
        tiles: [
          contourSource5A.contourProtocolUrl({
            // meters to feet
            multiplier: 1, //★変更前　3.28084
            thresholds: contourInterval,
            elevationKey: "ele",
            levelKey: "level",
            contourLayer: "contours",
          }),
        ],
        maxzoom: 18,
      },
      contours5B: {
        type: "vector",
        tiles: [
          contourSource5B.contourProtocolUrl({
            // meters to feet
            multiplier: 1, //★変更前　3.28084
            thresholds: contourInterval,
            elevationKey: "ele",
            levelKey: "level",
            contourLayer: "contours",
          }),
        ],
        maxzoom: 18,
      },
      contours5C: {
        type: "vector",
        tiles: [
          contourSource5C.contourProtocolUrl({
            // meters to feet
            multiplier: 1, //★変更前　3.28084
            thresholds: contourInterval,
            elevationKey: "ele",
            levelKey: "level",
            contourLayer: "contours",
          }),
        ],
        maxzoom: 18,
      },
      /*
      contoursMixed: {
        type: "vector",
        tiles: [
          contourSourceMixed.contourProtocolUrl({
            // meters to feet
            multiplier: 1, //★変更前　3.28084
            thresholds: contourInterval,
            elevationKey: "ele",
            levelKey: "level",
            contourLayer: "contours",
          }),
        ],
        maxzoom: 18,
      },
      contourSourceTochigi: {
        type: "vector",
        tiles: [
          contourSourceTochigi.contourProtocolUrl({
            // meters to feet
            multiplier: 1, //★変更前　3.28084
            thresholds: contourInterval,
            elevationKey: "ele",
            levelKey: "level",
            contourLayer: "contours",
          }),
        ],
        maxzoom: 18,
      },
      contourSourceKochi: {
        type: "vector",
        tiles: [
          contourSourceKochi.contourProtocolUrl({
            // meters to feet
            multiplier: 1, //★変更前　3.28084
            thresholds: contourInterval,
            elevationKey: "ele",
            levelKey: "level",
            contourLayer: "contours",
          }),
        ],
        maxzoom: 18,
      },
    */
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
        id: "hillshade",
        type: "hillshade",
        source: "gsidem10B2",
        paint: {
          "hillshade-illumination-anchor": "map",
          "hillshade-exaggeration": 0.5,
        },
        layout: {
          visibility: "none"
        },
      },
      {
        id: "contours",
        type: "line",
        source: "contours10B",
        "source-layer": "contours",
        paint: {
          "line-color": "rgba(0,0,0, 0.5)",
          "line-width": ["*", ["match", ["get", "level"], 1, 1, 0.5],2] //★最後の引数で線の太さを調整
        },
        layout: {
          "line-join": "round",
          visibility: "none",
        },
      },
      {
        id: "contour-text",
        type: "symbol",
        source: "contours10B",
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
          visibility: "none",
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

// 3D地形コントロール表示
var terrainControl = new MapLibreGL.TerrainControl({
  source: 'gsidem10B',
  exaggeration: 1 // 標高を強調する倍率
});
map.addControl(terrainControl);

map.on("load", () => {
  const opacity = new OpacityControl({
    baseLayers: {
      "gsi_std" : "標準地図",
      "gsi_pale" : "淡色地図",
      "gsi_seamlessphoto" : "写真",
      "white-background" : "背景なし",
      },
    overLayers: {
      "hillshade" : "陰影",
      "contours" : "等高線",
      "contour-text" : "等高線数値",
      },
    opacityControl: false,
  });
  map.addControl(opacity, "top-left");
  
  // 標高タイルセット 不要？？
  //map.setTerrain({ 'source': 'gsidem1', 'exaggeration': 1 });

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