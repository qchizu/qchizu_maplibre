import { writable } from 'svelte/store';

// 外部タイル設定用のストア
export const externalTileConfig = writable({
    tiles: '',
    encoding: 'gsj',  // デフォルト値
    attribution: '',
    maxzoom: 18,      // デフォルト値
    tileSize: 256     // デフォルト値
});

// 外部タイル設定を更新する関数
export function updateExternalTileSource(demSourcesStore) {
    // 購読して値を直接取得するアプローチ
    let currentConfig;
    
    // 一時的な購読を作成して現在の値を取得
    const unsubscribe = externalTileConfig.subscribe(value => {
        currentConfig = value;
    });
    
    // 購読を解除
    unsubscribe();
    
    // demSourcesストアを更新
    demSourcesStore.update(sources => {
        // 配列にする
        const tilesArray = currentConfig.tiles ? [currentConfig.tiles] : [''];
        
        // 既存のオブジェクトを変更
        sources.gaibu = {
            ...sources.gaibu,
            name: "外部タイル",
            isExternal: true,
            tiles: tilesArray,
            encoding: currentConfig.encoding,
            attribution: currentConfig.attribution || '外部タイル',
            maxzoom: currentConfig.maxzoom || 18,
            tileSize: currentConfig.tileSize || 256
        };
        
        return sources;
    });
}