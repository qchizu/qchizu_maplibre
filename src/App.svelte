<script>
  import Button from './Button.svelte';
  import Map from './Map.svelte';
  import { mapViewParameters } from './stores/MapViewParameters.js';

  // スクリーンサイズが小さい場合の対応用
  $: isSmallScreen = window.innerWidth <= 400;

  function openStandardEdition() {
    const url = 'https://maps.qchizu.xyz/#' + ($mapViewParameters.zoom + 1) + '/' + $mapViewParameters.lat + '/' + $mapViewParameters.lon;
    window.open(url, '_blank');
  }
</script>

<div class="app-container">
  <header class="app-header">
      <span class="title-link">
        {#if isSmallScreen}
        <a href="./#5/38.5/137/0/0">全国Ｑ地図ML版</a>
        {:else}
        <a href="./#5/38.5/137/0/0">全国Ｑ地図MapLibre版</a>
        {/if}
      </span>

      <Button text="説明" title="全国Ｑ地図MapLibre版の説明へ" onClick={() => window.open('https://info.qchizu.xyz/qchizu/maplibre_terrain/', '_blank')} />

      <Button text="通常版" title="全国Ｑ地図通常版で現在の場所を見る" onClick={openStandardEdition} />
  </header>

  <main class="map-container">
    <Map />
  </main>
</div>

<style>
  :global(body) {
    font-family:  "BIZ UDPGothic", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
    line-height: 1.5;
    margin: 0;
    padding: 0;
  }

  .app-header {
    display: flex;
    align-items: center;
    height: 27px;
    background-color: rgb(51, 51, 51);
    border-bottom: 3px solid rgb(230, 180, 34);
  }

  .title-link {
    background-color: rgb(230, 180, 34);
    font-size: 20px;
    padding: 0px 10px;
  }

  .title-link a {
    color: rgb(51, 51, 51);
    text-decoration: none;
  }

  .map-container {
    position: absolute;
    top: 30px;
    bottom: 0;
    width: 100%;
  }
</style>