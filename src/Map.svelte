<script>
  import { onMount } from 'svelte';
  import maplibregl from "maplibre-gl";
  import "maplibre-gl/dist/maplibre-gl.css";
  //import { Protocol } from "pmtiles";

  //Components
  import Sidebar from './Sidebar.svelte'; //サイドバーのコンポーネント

  //Stores
  import { mapViewParameters } from './stores/MapViewParameters.js'; //リンク用の情報（緯度・経度など）
  import { mapSources } from './stores/MapSources'; //ソース定義
  import { mapLayers } from './stores/MapLayers'; //レイヤー定義
  import { selectedBaseLayer } from './stores/SelectedBaseLayer.js'; //選択中のベースマップレイヤー
  import { selectedOverLayers } from './stores/SelectedOverLayers'; //選択中のオーバーレイレイヤー
  import { demSources } from './stores/DemSources.js'; //標高タイル定義
  import { selectedDemSource } from './stores/SelectedDemSource.js'; //選択中の標高タイル
  import { pitch } from './stores/Pitch.js'; //傾斜角度
  import { CsParameters } from './stores/CsParameters'; //CS立体図のパラメーター

  //Protocols
  import { demTranscoderProtocol } from "./protocols/demTranscoderProtocol.js";
  import { dem2ReliefProtocol } from "./protocols/dem2ReliefProtocol.js";
  import { dem2CsProtocol } from "./protocols/dem2CsProtocol.js";
  import { dem2SlopeProtocol } from "./protocols/dem2SlopeProtocol.js";

  //Functions
  import { updateBaseLayerVisibility, updateOverLayerVisibility, updateTerrainLayers, updateCsLayer, flyTo, showPopupLink, removePopupLink, updateMapViewParameters} from './utils.js';

  //classes
  import { CustomControl } from "./mapControls.js";

  //定数の定義
  //等高線間隔
  const contourInterval = {
      // zoom: [minor, major]
      11: [100, 500],
      12: [50, 250],
      13: [50, 250],
      14: [20, 100],
      15: [10, 50],
      16: [5, 25],
      17: [1, 5],
      18: [1, 5],
      19: [0.5, 2.5],
  };

  //変数の定義
  let mapContainer;
  let map;
  let sidebarExternalToggle = true;
  let initialLoadComplete = false;
  let firstMove = true;

  // addProtocolを設定
  demTranscoderProtocol("gsj", "gsj");
  dem2ReliefProtocol('reliefGsj', "gsj", true);
  dem2ReliefProtocol('reliefMapbox',"mapbox",true);
  dem2CsProtocol("csGsjXy", "gsj", "xy");
  dem2CsProtocol("csGsjYx", "gsj", "yx");
  dem2CsProtocol("csMapboxXy", "mapbox", "xy");
  dem2SlopeProtocol("slopeGsjXyColor", "gsj" ,"xy" ,"color");
  dem2SlopeProtocol("slopeGsjYxColor", "gsj" ,"yx" ,"color");
  dem2SlopeProtocol("slopeGsjXyGray", "gsj" ,"xy" ,"gray");
  dem2SlopeProtocol("slopeGsjYxGray", "gsj" ,"yx" ,"gray");  
  dem2SlopeProtocol("slopeMapboxXyColor", "mapbox" ,"xy" ,"color");
  dem2SlopeProtocol("slopeMapboxXyGray", "mapbox" ,"xy" ,"gray"); 
  //maplibregl.addProtocol("pmtiles",new Protocol().tile);

  // 地図の初期化処理  
  function initializeMap() {
    map = new maplibregl.Map({
      container: mapContainer,
      zoom: 5,
      center: [137,38.5],
      pitch: 0, //初期表示の傾斜角度
      maxPitch: 85, //maxPitch must be less than or equal to 85
      hash: true,
      attributionControl: false,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: $mapSources, //MapSources.jsで定義
        layers: $mapLayers //MapLayers.jsで定義
      }
    });
  }


  // 地図のロード完了後の処理
  function onMapLoad() {
    // 各種コントロールの追加
    addControls();

    // sky機能
    map.setSky({
        "sky-color": "#199EF3",
        "sky-horizon-blend": 0.5, //horizon-colorを地平線上どのくらいまでブレンドするか（値が大きいほど地平線上までブレンドする）
        "horizon-color": "#ffffff",
        "horizon-fog-blend": 0.5,//遠方をどのくらい霞ませるか（値が大きいほど強く霞む）
        "fog-color": "#0000ff",
        "fog-ground-blend": 0.9,//どのくらいの距離まで霞ませるか（値が大きいほど近くまで霞む）
        "atmosphere-blend": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1,
            10,
            1,
            12,
            0
        ]
    });

    //pitchの値をセット
    $pitch = map.getPitch();

    // マウスカーソルのスタイルをパンカーソルから矢印に変更
    map.getCanvas().style.cursor = 'default';
    
    updateTerrainLayers(map, $selectedDemSource, $demSources, contourInterval, maplibregl, dem2CsProtocol, $CsParameters, $selectedBaseLayer);
    updateBaseLayerVisibility(map, $selectedBaseLayer);
    updateMapViewParameters(map, maplibregl);

    initialLoadComplete = true;
  }

  // 各種コントロールの追加
  function addControls() {
    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true
      })
    );

    map.addControl(
      new maplibregl.AttributionControl({
        compact: false
      })
    );

    // フルスクリーンモードのオンオフ
    map.addControl(new maplibregl.FullscreenControl());

    // 現在位置表示
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: false
      },
      fitBoundsOptions: { maxZoom: 18 },
      trackUserLocation: true,
      showUserLocation: true
    }));
    
    // カスタムコントロールの追加
    map.addControl(new CustomControl(), 'top-right');

    // スケール表示
    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 200,
        unit: 'metric'
      })
    );
  }

  onMount(() => {
    initializeMap();

    map.on('load', () => {
      onMapLoad();
    });
           
    // sidebar非表示（画面サイズが小さい場合）
    map.on('click', () => {
      if (initialLoadComplete && window.innerWidth <= 768) {
        sidebarExternalToggle = false;
      }
    });
    map.on('move', () => {
      if (initialLoadComplete && window.innerWidth <= 768) {
          if (firstMove) { // initialLoadCompleteがtrueになった直後のmoveイベントは無視する
              sidebarExternalToggle = true;
              firstMove = false;
          } else {
              sidebarExternalToggle = false;
          }
      }
    })

    // リンク用の情報
    map.on('moveend', () => {
      updateMapViewParameters(map, maplibregl);
    });

    map.on('pitchend', () => {
      $pitch = map.getPitch();
    });

    if ($pitch) {
      map.setPitch($pitch);
    }

    // 右クリックで地図を移動して他の地図サービスにリンクするポップアップを表示
    map.on('contextmenu', function(e){
      removePopupLink();
      flyTo(e, map);
      map.once('moveend', () => {
        showPopupLink(e, map, maplibregl, $mapViewParameters);
      });
    });
    
    // 地図のクリックイベントリスナーを追加
    map.on('click', () => {
      removePopupLink();
    });
    
    // 地図が移動したときのイベントリスナーを追加
    map.on('move', () => {
      removePopupLink();
    });
    
    // 地図がズームされたときのイベントリスナーを追加
    map.on('zoom', () => {
      removePopupLink();
    });
  });

  //selectedDemSourceの値を監視してupdateTerrainLayersを実行
  $: {
    if ($selectedDemSource && initialLoadComplete) {
      updateTerrainLayers(map, $selectedDemSource, $demSources, contourInterval, maplibregl, dem2CsProtocol, $CsParameters, $selectedBaseLayer);
    }
  }

  //selectedBaseLayer、selectedDemSourceの値を監視してupdateBaseLayerVisibilityとupdateOverLayerVisibilityを実行
  $: {
    if ($selectedBaseLayer && $selectedDemSource && initialLoadComplete) {
      updateBaseLayerVisibility(map, $selectedBaseLayer);
      updateOverLayerVisibility(map, $selectedOverLayers);
    }
  }
    
  // selectedOverLayers、selectedDemSourceの値を監視してupdateOverLayerVisibilityを実行
  $: {
    if ($selectedOverLayers && $selectedDemSource && initialLoadComplete) {
      updateOverLayerVisibility(map, $selectedOverLayers);
    }
  }

  //pitchの値(slider)を監視してmap.setPitchを実行
  $: {
    if ($pitch && initialLoadComplete) {
      map.setPitch($pitch);
    }
  }

  let previousTerrainScale = $CsParameters.terrainScale;
  let previousredAndBlueIntensity = $CsParameters.redAndBlueIntensity;

  //CsParametersの値（CS立体図のパラメーター）を監視してCS立体図の表示を更新
  $: {
    if ($CsParameters && previousTerrainScale !== $CsParameters.terrainScale && previousredAndBlueIntensity || $CsParameters.redAndBlueIntensity && initialLoadComplete) {
      previousTerrainScale = $CsParameters.terrainScale;
      previousredAndBlueIntensity = $CsParameters.redAndBlueIntensity;
      updateCsLayer(map, $selectedDemSource, $demSources, dem2CsProtocol, $CsParameters, $selectedBaseLayer);
    }
  }
</script>

<div bind:this={mapContainer} style="width: 100%; height: 100%;"></div>
<div class="crosshair"></div> <!-- 十字マーク  --> 
<div class="sidebar">
  <Sidebar bind:sidebarExternalToggle={sidebarExternalToggle} />
</div>

<style>
.crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    transform: translate(-50%, -50%);
    pointer-events: none;
}
.crosshair::before, .crosshair::after {
    content: '';
    position: absolute;
    background: rgba(255, 0, 0, 0.5);
}
.crosshair::before {
    width: 2px;
    height: 100%;
    left: 50%;
    transform: translateX(-50%);
}
.crosshair::after {
    width: 100%;
    height: 2px;
    top: 50%;
    transform: translateY(-50%);
}
</style>
