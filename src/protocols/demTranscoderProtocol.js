// numPngProtocol.js, 2023-11-27　西岡 芳晴 ( NISHIOKA Yoshiharu )を一部修正

import { addProtocol } from 'maplibre-gl';

// DEMトランスコーダープロトコルを定義する関数
function demTranscoderProtocol(protocol = 'gsj', encoding = 'gsj') {
    // データをロードする非同期関数
    const loadFn = async (params, abortController) => {
        // プロトコル部分を削除してURLを取得
        const imageUrl = params.url.replace(`${protocol}://`, '');
        // 画像をフェッチ
        const response = await fetch(imageUrl, { signal: abortController.signal });

        // ステータスが200の場合
        if (response.status === 200) {
            // 画像をBlobとして取得
            const blob = await response.blob();
            // BlobをImageBitmapに変換
            const imageBitmap = await createImageBitmap(blob);

            // 画像の幅と高さを取得
            const width = imageBitmap.width;
            const height = imageBitmap.height;
            // オフスクリーンキャンバスを作成
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            // 画像をキャンバスに描画
            ctx.drawImage(imageBitmap, 0, 0);
            
            // 画像データを取得
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = new Uint8ClampedArray(imageData.data.buffer);
            
            // ピクセルをバイト操作で処理
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // 無効値(128,0,0)をチェック
                if ((r === 128 && g === 0 && b === 0) || a !== 255) {
                    // 無効値は0に変換
                    data[i] = 128;     // R
                    data[i + 1] = 0;   // G
                    data[i + 2] = 0;   // B
                    data[i + 3] = 255; // A
                    continue;
                }

                // RGBを符号付き高さ値に変換
                const bits24 = (r << 16) | (g << 8) | b;
                const height = ((bits24 << 8) >> 8) * 0.01; // 符号を保持

                // Terrariumエンコーディングに変換
                const terrainValue = height + 32768;
                
                // 値を適切に制限
                const encodedR = Math.min(255, Math.max(0, Math.floor(terrainValue / 256)));
                const encodedG = Math.min(255, Math.max(0, Math.floor(terrainValue % 256)));
                const encodedB = Math.min(255, Math.max(0, Math.floor((terrainValue - Math.floor(terrainValue)) * 256)));

                // エンコードされた値を保存
                data[i] = encodedR;
                data[i + 1] = encodedG;
                data[i + 2] = encodedB;
                data[i + 3] = 255;
            }

            // 画像データをキャンバスに戻す
            ctx.putImageData(imageData, 0, 0);

            // キャンバスをBlobに変換して返す
            return canvas.convertToBlob().then(async (blob) => {
                return { data: await blob.arrayBuffer() };
            });
        }
        
        // ステータスが200でない場合はnullを返す
        return { data: null };
    };

    // プロトコルを追加
    addProtocol(protocol, loadFn);
}

// demTranscoderProtocol関数をエクスポート
export { demTranscoderProtocol };