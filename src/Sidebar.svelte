<script>
    import Button from './Button.svelte';
    import { demSources } from './stores/DemSources.js';
    import { selectedBaseLayer } from './stores/SelectedBaseLayer.js';
    import { selectedOverLayers } from './stores/SelectedOverLayers';
    import { selectedDemSource } from './stores/SelectedDemSource.js';
    import { pitch } from './stores/Pitch.js';

    const baseLayers = [
        { id: 'gsi_std', label: '標準地図' },
        { id: 'gsi_pale', label: '淡色地図' },
        { id: 'gsi_seamlessphoto', label: '写真' },
        { id: 'relief', label: '段彩図◆' },
        { id: 'cs', label: 'CS立体図◆' },
        { id: 'white-background', label: '背景なし' },
        { id: 'p17_ishikawa_f_01', label: '能登写真(2020,2022)' },
        { id: 'ishikawa_cs', label: '能登CS立体図' },
        { id: 'ishikawa_rrim', label: '能登赤色立体地図' },
    ];

    // オブジェクトから配列に変換（プルダウンリスト用）
    let demSourcesArray = Object.entries($demSources).map(([key, value]) => ({
        id: key,
        name: value.name
    }));

    // サイドバーの開閉（親から操作可能）
    export let sidebarExternalToggle;
    let isInteracting = false;
    let sidebarVisible = sidebarExternalToggle;

    // isInteracting:false、isInteracting:falseの場合、サイドバーを閉じる
    $: if (!isInteracting && !sidebarExternalToggle) {
        sidebarVisible = false;
    }

    // サイドバーの開閉を反転する関数
    function toggleSidebar() {
        sidebarVisible = !sidebarVisible;
        sidebarExternalToggle = sidebarVisible;
    }

    // チェックボックスの状態を更新する関数
    function updateSelection({ target }) {
        selectedOverLayers.update(current => {
            // Setを複製して更新
            const updated = new Set(current);
            if (target.checked) {
                updated.add(target.value);
            } else {
                updated.delete(target.value);
            }
            return Array.from(updated);
        });
    }
</script>
    
<div class={sidebarVisible ? 'sidebar' : 'sidebar sidebar-hidden'}>
    <div class="close-sidebar-button">
        <Button text="閉じる⇐" title="サイドバーを閉じます" onClick={toggleSidebar} />
    </div>

    <!-- 配列をもとにDEMソースのプルダウンリストを作成 -->
    <fieldset>
        <legend>標高データ</legend>
        <select bind:value={$selectedDemSource}>
            {#each demSourcesArray as source}
            <option value={source.id}>{source.name}</option>
            {/each}
        </select>
        <div class="note">
            ◆印の描画に反映
        </div>
    </fieldset>

    <fieldset>
        <legend>背景（基図）</legend>
        {#each baseLayers as layer}
          <div>
            <input
              type="radio"
              id="{layer.id}"
              value="{layer.id}"
              name="baseMap"
              bind:group="{$selectedBaseLayer}"
            />
            <label class="layer-label" for="{layer.id}">{layer.label}</label>
          </div>
        {/each}
    </fieldset>

    <fieldset>
        <legend>重ね合わせ</legend>
        <div>
          <input type="checkbox" id="slope" value="slope" name="overlay" on:change={updateSelection}/>
          <label class="layer-label" for="slope">傾斜量図◆</label>
        </div>
        <div>
          <input type="checkbox" id="hillshade" value="hillshade" name="overlay" on:change={updateSelection}/>
          <label class="layer-label" for="hillshade">陰影◆</label>
        </div>
        <div>
          <input type="checkbox" id="contours" value="contours" name="overlay" on:change={updateSelection}/>
          <label class="layer-label" for="contours">等高線◆</label>
        </div>
    </fieldset>

    <!--操作中はisInteractingをtrueにし、サイドバーが閉じないように設定-->    
    <fieldset on:mousedown={() => isInteracting = true} on:mouseup={() => isInteracting = false} on:touchstart={() => isInteracting = true} on:touchend={() => isInteracting = false}>
        <legend>視点（pitch）</legend>
            <div>
                <input class="slider" type="range" min="0" max="85" step="1" bind:value={$pitch}/>
            </div>
            <div class="slider-labels">
                <span>垂直</span>
                <span>水平</span>
            </div>
            <div class="note pc-only">
                ※「Ctrl+ドラッグ」や「右上の方位マークのドラッグ」でも変更可
            </div>
            <div class="note mobile-only">
                ※右上の方位マークのドラッグでも変更可
            </div>
            <div class="note">
                ※右上の山マーククリックで地形を立体表示◆
            </div>
    </fieldset>

</div>

<div class="open-sidebar-button" class:open-sidebar-button-hidden={sidebarVisible} on:click={toggleSidebar}>
    <img src="layer_map.png" alt="Map Icon">
    <div class="label">地図</div>
</div>
  
<style>
    .sidebar {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 170px;
        left: 0;
        padding: 10px;
        bottom: 0px;
        background-color: rgba(51, 51, 51, 0.5); /* 背景色 */
        transition: transform 0.3s ease-in-out;
        transform: translateX(0%);
        overflow-y: auto; /* スクロールを有効にする */
        max-height: 100vh; /* 最大高さを画面の高さに設定 */
    }

    .sidebar-hidden {
        transform: translateX(-100%);
    }

    .close-sidebar-button {
        display: flex;
        justify-content: flex-end;
    }

    .open-sidebar-button {
        position: absolute;
        width: 40px;
        height: 40px;
        left: 20px;
        top: 20px;
        border-radius: 6px;
        border: 2px solid rgba(51, 51, 51, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        cursor: pointer;
    }

    .open-sidebar-button img {
        width: 100%;
        height: auto;
    }

    .open-sidebar-button-hidden {
        display: none;
    }

    .label {
        position: absolute;
        bottom: 0;
        width: 100%;
        font-size: 11px;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        text-align: center;
    }

    .layer-label {
        font-size: 14px;
    }

    fieldset {
        background-color: rgba(229, 229, 229, 1);
        border-width: 4px;
        border-color: rgba(230, 180, 34, 1);
        border-radius: 5px;
        margin-top: 10px;
    }

    legend {
        font-weight: bold;
        background-color: rgba(229, 229, 229, 1);
    }

    .slider {
        width: 100%;
    }

    .slider-labels {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
    }
    .note {
        font-size: 11px;
    }

    .pc-only {
        display: none; /* デフォルトでは非表示 */
    }

    .mobile-only {
        display: none; /* デフォルトでは非表示 */
    }

    @media (min-width: 769px) {
        .pc-only {
        display: block; /* PC版でのみ表示 */
        }
    }

    @media (max-width: 768px) {
        .mobile-only {
        display: block; /* mobile版でのみ表示 */
        }
    }
</style>
