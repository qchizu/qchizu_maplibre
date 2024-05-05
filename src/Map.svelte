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

  //Protocols
  import { demTranscoderProtocol } from "./protocols/demTranscoderProtocol.js";
  import { dem2ReliefProtocol } from "./protocols/dem2ReliefProtocol.js";
  import { dem2SlopeProtocol } from "./protocols/dem2SlopeProtocol.js";
  import { dem2CsProtocol } from "./protocols/dem2CsProtocol.js";

  //Functions
  import { updateBaseLayerVisibility, updateOverLayerVisibility, updateTerrainLayers } from './utils.js';

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
  dem2SlopeProtocol("slopeGsjXy", "gsj" ,"xy");
  dem2SlopeProtocol("slopeGsjYx", "gsj" ,"yx");
  dem2SlopeProtocol("slopeMapboxXy", "mapbox","xy");
  dem2CsProtocol("csGsjXy", "gsj", "xy");
  dem2CsProtocol("csGsjYx", "gsj", "yx");
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

    //pitchの値をセット
    $pitch = map.getPitch();
    
    updateTerrainLayers(map, $selectedDemSource, $demSources, contourInterval, maplibregl);
    updateBaseLayerVisibility(map, $selectedBaseLayer);
    updateMapViewParameters();

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

    // スケール表示
    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 200,
        unit: 'metric'
      })
    );
  }

  // リンク用の情報を更新
  function updateMapViewParameters() {
    var zoom = map.getZoom();
    var center = map.getCenter();
    var lat = center.lat.toFixed(6);
    var lon = center.lng.toFixed(6);
    var bearing = map.getBearing();
    var pitch = map.getPitch();
    $mapViewParameters = {
      zoom: zoom,
      lat: lat,
      lon: lon,
      bearing: bearing,
      pitch: pitch
    };
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
    map.on('moveend', updateMapViewParameters);

    map.on('pitchend', () => {
      $pitch = map.getPitch();
    });

    if ($pitch) {
      map.setPitch($pitch);
    }

  });

  //selectedDemSourceの値を監視してupdateTerrainLayersを実行
  $: {
    if ($selectedDemSource && initialLoadComplete) {
      updateTerrainLayers(map, $selectedDemSource, $demSources, contourInterval, maplibregl);
    }
  }

  //selectedBaseLayer、selectedDemSourceの値を監視してupdateBaseLayerVisibilityを実行
  $: {
    if ($selectedBaseLayer && $selectedDemSource && initialLoadComplete) {
      updateBaseLayerVisibility(map, $selectedBaseLayer);
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
</script>

<div bind:this={mapContainer} style="width: 100%; height: 100%;"></div>

<div class="sidebar">
  <Sidebar bind:sidebarExternalToggle={sidebarExternalToggle} />
</div>
