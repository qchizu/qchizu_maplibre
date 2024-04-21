<script>
  import Map from './Map.svelte';
  import { mapViewParameters } from './MapViewParameters.js';

  function openStandardEdition() {
    const url = 'https://maps.qchizu.xyz/#' + ($mapViewParameters.zoom + 1) + '/' + $mapViewParameters.lat + '/' + $mapViewParameters.lon;
    window.open(url, '_blank');
  }
</script>

<div class="app-container">
  <header class="app-header">
      <span class="title-link">
        <a href="./#5/38.5/137/0/0">全国Ｑ地図MapLibre版</a>
      </span>
      
      <span class="link-item">
        <button
          on:click={() => window.open('https://info.qchizu.xyz/qchizu/maplibre_terrain/', '_blank')}
          title="全国Ｑ地図MapLibre版の説明へ">
           説明 
        </button>
      </span>

      <span class="link-item">
        <button
          on:click={openStandardEdition}
          title="全国Ｑ地図通常版で現在の場所を見る">
          通常版
        </button>
      </span>
  </header>

  <main class="map-container">
    <Map />
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  .app-header {
    height: 30px;
    background-color: rgb(51, 51, 51);
  }

  .title-link {
    background-color: rgb(230, 180, 34);
    font-size: 20px;
  }

  .title-link a {
    color: rgb(51, 51, 51);
    text-decoration: none;
  }

  .link-item {
    font-size: 15px;
    padding-left: 15px;
  }

  .map-container {
    position: absolute;
    top: 30px;
    bottom: 0;
    width: 100%;
  }
</style>