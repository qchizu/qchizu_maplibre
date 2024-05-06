// タイルの位置を計算する関数
export function calculateTilePosition(index, tileSize, buffer) {
    let sx, sy, sWidth, sHeight, dx, dy;
    const col = index % 3;
    const row = Math.floor(index / 3);

    if (index === 4) { // 中央のタイル
        return { sx: 0, sy: 0, sWidth: tileSize, sHeight: tileSize, dx: buffer, dy: buffer };
    } else {
        sx = (col === 0) ? tileSize - buffer : 0;
        sWidth = (col === 1) ? tileSize : buffer;
        dx = (col === 2) ? tileSize + buffer : col * buffer;

        sy = (row === 0) ? tileSize - buffer : 0;
        sHeight = (row === 1) ? tileSize : buffer;
        dy = (row === 2) ? tileSize + buffer : row * buffer;

        return { sx, sy, sWidth, sHeight, dx, dy };
    }
}

// エンコーディングに応じた標高計算関数を返す関数
export function getCalculateHeightFunction(encoding) {
    switch (encoding) {
        case 'gsi':
        case 'gsj':
            return (r, g, b) => {
                const x = r * 65536 + g * 256 + b;
                const twoToThePowerOf23 = 8388608; // 2 ** 23
                const twoToThePowerOf24 = 16777216; // 2 ** 24
                if (x === twoToThePowerOf23) {
                    return -99999;
                }
                return x < twoToThePowerOf23 ? 0.01 * x : 0.01 * (x - twoToThePowerOf24);
            };
        case 'mapbox':
            return (r, g, b) => (r * 65536 + g * 256 + b) / 10 - 10000;
        case 'terrarium':
            return (r, g, b) => r * 256 + g + b / 256 - 32768;
        default:
            throw new Error('Unsupported encoding type');
    }
}

// ピクセルサイズ（解像度）（m/pixel）を計算する関数
// @sw1227様のページを参考にした。
// https://qiita.com/sw1227/items/c926da2dc74d762c7c43
export function calculatePixelResolution(tileSize, zoomLevel, tileY) {
    const L = 85.05112878; // Web Mercatorの最大緯度
    const y = 256 * tileY + tileSize/2;  // タイルの中心のPixel coordinate 
    const lat = (180/Math.PI) * Math.asin(Math.tanh(
      - Math.PI / (1 << (zoomLevel + 7)) * y + Math.atanh(Math.sin(L * Math.PI/180))
    ));
    const deg2rad = deg => deg / 180 * Math.PI; // 度数法から弧度法（ラジアン）への変換
    const resolution = 156543.04 * Math.cos(deg2rad(lat)) / (1 << zoomLevel)
    return resolution;
}

// 傾斜量を計算する関数
// 産業技術総合研究所のシームレス傾斜量図の計算式を使用した。
// https://gbank.gsj.jp/seamless/slope/
// ↓H00,H01,H10の位置関係↓
// H00 H01
// H10
export function calculateSlope(H00, H01, H10, pixelLength) {
    let dx = H00 - H01;
    let dy = H00 - H10;
    let slope = Math.atan(Math.sqrt(dx * dx + dy * dy) / pixelLength) * (180 / Math.PI);
    return slope;
}
