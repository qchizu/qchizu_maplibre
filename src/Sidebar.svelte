<script>
    import Button from './Button.svelte';
    import { demSources } from './stores/DemSources.js';
    import { selectedBaseLayer } from './stores/SelectedBaseLayer.js';
    import { selectedOverLayers } from './stores/SelectedOverLayers';
    import { selectedDemSource } from './stores/SelectedDemSource.js';
    import { pitch } from './stores/Pitch.js';
    import { CsParameters } from './stores/CsParameters';

    // 背景（基図）の選択肢
    const baseLayers = [
        { id: 'gsi_std', label: '標準地図', showSettings: false },
        { id: 'gsi_pale', label: '淡色地図', showSettings: false },
        { id: 'gsi_seamlessphoto', label: '写真', showSettings: false },
        { id: 'open_street_map', label: 'OpenStreetMap', showSettings: false },
        { id: 'relief', label: '段彩図◆', showSettings: false },
        { id: 'cs', label: 'CS立体図(試験版)◆', showSettings: true },
        { id: 'white-background', label: '背景なし', showSettings: false },
        { id: 'p17_ishikawa_f_01', label: '能登写真(2020,2022)', showSettings: false },
        { id: 'ishikawa_cs', label: '能登CS立体図', showSettings: false },
        { id: 'ishikawa_rrim', label: '能登赤色立体地図', showSettings: false },
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
    <div class="settings-section">
        <h1 class="settings-title">標高データ</h1>
        <div class="settings-item margin">
            <select bind:value={$selectedDemSource}>
                {#each demSourcesArray as source}
                <option value={source.id}>{source.name}</option>
                {/each}
            </select>
            <div class="note">
                ◆印の描画に反映
            </div>
        </div>
    </div>

    <div class="settings-section">
        <h1 class="settings-title">背景（基図）</h1>
        <div class="settings-item-no-margin">
            {#each baseLayers as layer}
            <div class="choice-elements-group"> <!-- 選択肢(チェックボックスorラジオボタン)+設定 -->
                <label class="choice-element"> <!-- 選択肢(チェックボックスorラジオボタン) -->
                    <input
                        type="radio"
                        id="{layer.id}"
                        value="{layer.id}"
                        name="baseMap"
                        bind:group="{$selectedBaseLayer}"
                    />
                    <span>
                        {layer.label}
                    </span>
                </label>
                <!--CS立体図の設定-->
                {#if layer.id === 'cs' && $selectedBaseLayer === 'cs'}
                <div class="params-settings">
                    <div class="params-setting-item">
                        <div class="params-setting-title">表現する地形のスケール　係数: {$CsParameters.terrainScale}</div>
                        <input class="slider" type="range" min="0.2" max="2" step="0.2" bind:value={$CsParameters.terrainScale} />
                        <div class="slider-labels">
                            <span>小</span>
                            <span>大</span>
                        </div>
                    </div>
                    <div class="params-setting-item">
                        <div class="params-setting-title">赤・青の濃度<br>係数: {$CsParameters.redAndBlueIntensity}</div>
                        <input class="slider" type="range" min="0.2" max="2" step="0.2" bind:value={$CsParameters.redAndBlueIntensity} />
                        <div class="slider-labels">
                            <span>薄</span>
                            <span>濃</span>
                        </div>
                    </div>
                </div>
                {/if}
            </div>
            {/each}
        </div>
    </div>

    <div class="settings-section">
        <h1 class="settings-title">重ね合わせ</h1>
        <div class="settings-item">
            <div class="choice-elements-group">
                <label class="choice-element">
                    <input type="checkbox" id="slope" value="slope" name="overlay" on:change={updateSelection}/>
                    <span>傾斜量図◆</span>
                </label>
            </div>
            <div class="choice-elements-group">
                <label class="choice-element">
                    <input type="checkbox" id="hillshade" value="hillshade" name="overlay" on:change={updateSelection}/>
                    <span>陰影◆</span>
                </label>
            </div>
            <div class="choice-elements-group">
                <label class="choice-element">
                    <input type="checkbox" id="contours" value="contours" name="overlay" on:change={updateSelection}/>
                    <span>等高線◆</span>
                </label>
            </div>
        </div>
    </div>

        
    <div class="settings-section">
        <h1 class="settings-title">視点（pitch）</h1>
        <div class="settings-item margin">
            <div>
                <!--操作中はisInteractingをtrueにし、サイドバーが閉じないように設定-->
                <input class="slider" type="range" min="0" max="85" step="1" bind:value={$pitch}  on:mousedown={() => isInteracting = true} on:mouseup={() => isInteracting = false} on:touchstart={() => isInteracting = true} on:touchend={() => isInteracting = false}/>
            </div>
            <div class="slider-labels">
                <span>垂直</span>
                <span>水平</span>
            </div>
            <div class="note pc-only">
                ※「Ctrl+ドラッグ」「右クリックでドラッグ」「右上の方位マークのドラッグ」でも変更可
            </div>
            <div class="note mobile-only">
                ※右上の方位マークのドラッグでも変更可
            </div>
            <div class="note">
                ※右上の山マーククリックで地形を立体表示◆
            </div>
        </div>
    </div>

</div>

<div class="open-sidebar-button" class:open-sidebar-button-hidden={sidebarVisible} on:click={toggleSidebar}>
    <img src="layer_map.png" alt="Map Icon">
    <div class="open-sidebar-button-label">地図</div>
</div>
  
<style>
    .sidebar {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 170px;
        left: 0;
        padding: 0;
        background-color: rgba(255, 255, 255, 1);
        border-right: 2px solid rgba(51, 51, 51, 0.8);
        transition: transform 0.3s ease-in-out;
        transform: translateX(0%);
        overflow-y: auto; /* スクロールを有効にする */
        max-height: 100vh; /* 最大高さを画面の高さに設定 */
    }

    .sidebar-hidden {
        transform: translateX(-100%);
    }

    .close-sidebar-button {
        margin: 10px;
        text-align: right;
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

    .open-sidebar-button-label {
        position: absolute;
        bottom: 0;
        width: 100%;
        font-size: 11px;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        text-align: center;
    }

    .open-sidebar-button-hidden {
        display: none;
    }

    .settings-section {
        margin: 10px 0;
    }

    .settings-title {
        background-color: rgba(51, 51, 51, 1);
        color: white;
        font-size: 15px;
        margin: 0;
        padding: 0 10px;
    }

    .margin {
        margin: 5px 10px;
    }

    .params-setting-item {
        margin: 0 5px 0 20px;
        border-top: 1px solid #ccc;
    }

    .params-setting-title {
        font-size: 14px;
        color: rgb(0,80,112)
    }

    .slider {
        width: 100%;
    }

    .slider-labels {
        display: flex;
        justify-content: space-between;
        font-size: small;
    }

    .note {
        font-size: 11px;
    }

    /* ラジオボタンとチェックボックスの共通スタイル */
    .choice-elements-group {
        display: flex;
        flex-direction: column;
        font-size: 14px;
        border-bottom: 1px solid #ccc;
    }

    .choice-element {
        margin: 3px 0;
    }

    .choice-elements-group label {
        display: flex;
        align-items: flex-start;
    }

    .choice-element input[type="radio"],
    .choice-element input[type="checkbox"] {
        margin-right: 10px;
    }

    .choice-elements-group label span {
        flex: 1;
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
