import * as tf from '@tensorflow/tfjs';

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
            return (r, g, b ,a) => {
                const x = r * 65536 + g * 256 + b;
                const twoToThePowerOf23 = 8388608; // 2 ** 23
                const twoToThePowerOf24 = 16777216; // 2 ** 24
                const u = 0.01; // 標高分解能
                if (x < twoToThePowerOf23 && a !== 0) {
                    return x * u;
                    // 0.1m単位で返す場合
                    // return parseFloat((x * u).toFixed(1));
                } else if (x === twoToThePowerOf23 || a === 0) {
                    return -99999;
                } else {
                    return (x - twoToThePowerOf24) * u;
                    // 0.1m単位で返す場合
                    // return parseFloat(((x - twoToThePowerOf24) * u).toFixed(1));
                }
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

export function generateColorImage(minValue, maxValue, minColor, maxColor, tensor2D) {
    // 範囲内に収める
    const clippedValue = tensor2D.clipByValue(minValue, maxValue);
  
    // 値を0から1の範囲に正規化
    const normalizedValue = clippedValue.sub(minValue).div(maxValue - minValue);
  
    // minColorからmaxColorにかけて色を変化させる
    const rDiff = maxColor.r - minColor.r;
    const gDiff = maxColor.g - minColor.g;
    const bDiff = maxColor.b - minColor.b;
    const rChannel = normalizedValue.mul(rDiff).add(minColor.r).round();
    const gChannel = normalizedValue.mul(gDiff).add(minColor.g).round();
    const bChannel = normalizedValue.mul(bDiff).add(minColor.b).round();
  
    // RGBカラーの3次元Tensorを作成
    const rgbTensor = tf.stack([rChannel, gChannel, bChannel], -1);
  
    return rgbTensor;
}

export function generateColorImageWithMidColor(minValue, maxValue, minColor, midColor, maxColor, tensor) {
    // 範囲内に収める
    const clippedValue = tensor.clipByValue(minValue, maxValue);
  
    // 値を0から1の範囲に正規化
    const normalizedValue = clippedValue.sub(minValue).div(maxValue - minValue);
  
    // 色の変化を計算
    const rDiff1 = midColor.r - minColor.r;
    const gDiff1 = midColor.g - minColor.g;
    const bDiff1 = midColor.b - minColor.b;
    const rDiff2 = maxColor.r - midColor.r;
    const gDiff2 = maxColor.g - midColor.g;
    const bDiff2 = maxColor.b - midColor.b;
  
    // 中間色を考慮して色を変化させる
    const rChannel = tf.where(
      normalizedValue.lessEqual(0.5),
      normalizedValue.mul(2).mul(rDiff1).add(minColor.r),
      normalizedValue.sub(0.5).mul(2).mul(rDiff2).add(midColor.r)
    ).round();
  
    const gChannel = tf.where(
      normalizedValue.lessEqual(0.5),
      normalizedValue.mul(2).mul(gDiff1).add(minColor.g),
      normalizedValue.sub(0.5).mul(2).mul(gDiff2).add(midColor.g)
    ).round();
  
    const bChannel = tf.where(
      normalizedValue.lessEqual(0.5),
      normalizedValue.mul(2).mul(bDiff1).add(minColor.b),
      normalizedValue.sub(0.5).mul(2).mul(bDiff2).add(midColor.b)
    ).round();
  
    // RGBカラーの3次元Tensorを作成
    const rgbTensor = tf.stack([rChannel, gChannel, bChannel], -1);
  
    return rgbTensor;
}

export function blendImages(baseImage, overlayImage, alpha) {
    // image1とimage2が同じ形状であることを確認
    if (!baseImage.shape.every((dim, i) => dim === overlayImage.shape[i])) {
      throw new Error('両方の画像は同じ形状である必要があります');
    }
  
    // alphaをテンソルに変換
    const alphaTensor = tf.scalar(alpha);
  
    // 画像をブレンド
    const blendedImage = baseImage.mul(tf.scalar(1).sub(alphaTensor)).add(overlayImage.mul(alphaTensor));
  
    return blendedImage;
}

// 乗算による重ね合わせ
export function multiplyBlendImages(baseImage, overlayImage) {
    // image1とimage2が同じ形状であることを確認
    if (!baseImage.shape.every((dim, i) => dim === overlayImage.shape[i])) {
      throw new Error('両方の画像は同じ形状である必要があります');
    }
  
    // オーバーレイ画像を255で割る
    const overlayNormalized = overlayImage.div(tf.scalar(255));
  
    // 画像を乗算でブレンド
    const blendedImage = baseImage.mul(overlayNormalized);
  
    return blendedImage;
  }