// maplibre-gl-gsi-terrain
// 【参考】https://qiita.com/Kanahiro/items/1e9c1a4ad6be76b27f0f

// 'fast-png'パッケージから'encode'関数をインポート。これは画像データをPNG形式にエンコードするために使用。
import MapLibreGL from "maplibre-gl";
import { encode as fastPngEncode } from 'https://cdn.jsdelivr.net/npm/fast-png@6.1.0/+esm';

// RGB値を元に地形の高さを計算し、その高さに対応する新たなRGB値を返す関数
const gsidem2terrainrgb = (r, g, b) => {
    // まず、RGB値を元に地形の高さを計算
    let height = r * 655.36 + g * 2.56 + b * 0.01;

    // 特定のRGB値(128, 0, 0)は高さ0として扱う
    if (r === 128 && g === 0 && b === 0) {
        height = 0;
    } else if (r >= 128) {
        // Rが128以上の場合は、地形の高さから一定値を引く
        height -= 167772.16;
    }

    // 地形の高さに基準値を加算し、さらにスケーリング
    height += 100000;
    height *= 10;

    // 新たなRGB値を計算
    const tB = (height / 256 - Math.floor(height / 256)) * 256;
    const tG =
        (Math.floor(height / 256) / 256 -
            Math.floor(Math.floor(height / 256) / 256)) *
        256;
    const tR =
        (Math.floor(Math.floor(height / 256) / 256) / 256 -
            Math.floor(Math.floor(Math.floor(height / 256) / 256) / 256)) *
        256;

    // 新たなRGB値を返す
    return [tR, tG, tB];
};

// 地形データを扱うためのプロトコルをmaplibreglに追加
MapLibreGL.addProtocol('gsidem', (params, callback) => {
    // 新しい画像を作成
    const image = new Image();
    image.crossOrigin = '';

    image.onload = () => {
        // キャンバスを作成し、画像のサイズに合わせる
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        // 2Dコンテキストを取得し、画像を描画
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);

        // 画像のピクセルデータを取得
        const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
        );

        // すべてのピクセルについて、RGB値を変換
        for (let i = 0; i < imageData.data.length / 4; i++) {
            const tRGB = gsidem2terrainrgb(
                imageData.data[i * 4],
                imageData.data[i * 4 + 1],
                imageData.data[i * 4 + 2],
            );
            imageData.data[i * 4] = tRGB[0];
            imageData.data[i * 4 + 1] = tRGB[1];
            imageData.data[i * 4 + 2] = tRGB[2];
        }

        // fast-pngのencode関数を使用して画像データをPNG形式にエンコード
        const pngData = fastPngEncode({
            width: canvas.width,
            height: canvas.height,
            data: imageData.data,
        });

        // PNGデータをArrayBufferとしてcallback関数に渡す
        callback(null, pngData.buffer, null, null);

        /*
        // 変換後の画像データをキャンバスに戻す
        context.putImageData(imageData, 0, 0);

        // キャンバスからblobを作成し、そのblobをArrayBufferとしてcallback関数に渡す
        canvas.toBlob((blob) =>
            blob.arrayBuffer().then((arr) => callback(null, arr, null, null)),
        );
        */
    };

    // 画像のURLを取得し、gsidemプロトコル部分を除去してからimage.srcに設定
    image.src = params.url.replace('gsidem://', '');

    // キャンセル処理を返す(今回は特に何もしない)
    return { cancel: () => { } };
});

