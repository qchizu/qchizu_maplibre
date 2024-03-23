import { addProtocol } from 'maplibre-gl';

function dem2SlopeProtocol(
    protocol = 'slope', 
    encoding = 'gsi', 
    xyOrder = 'xy'
) {
    // エンコーディングに応じて適切な標高計算関数を取得
    const calculateHeight = getCalculateHeightFunction(encoding);

    const loadFn = async (params, abortController) => {
        // URLからズームレベル、タイルX、タイルYを抽出
        const url = params.url.replace(`${protocol}://`, '');
        const response = await fetch(url, { signal: abortController.signal });
        console.log(url);

        if (response.status === 200) {
            const regex = /\/(\d+)\/(\d+)\/(\d+)\.png$/;
            const match = url.match(regex);
            const zoomLevel = parseInt(match[1], 10);
            let tileX, tileY;
            if (xyOrder === 'xy') {
                tileX = parseInt(match[2], 10);
                tileY = parseInt(match[3], 10);
            } else if (xyOrder === 'yx') {
                tileX = parseInt(match[3], 10);
                tileY = parseInt(match[2], 10);
            }

            // 1ピクセルあたりの距離を計算
            const pixelLength = calculatePixelLength(zoomLevel, tileY);

            // 周辺を含む9つのタイル画像のソース
            const baseTemplate = url.substring(0, url.lastIndexOf(`/${zoomLevel}/`) + 1) + `${zoomLevel}/`;
            let tileImagesSrc = [];
            if (xyOrder === 'xy') {
                tileImagesSrc = [
                    {index: 4, src: url}, // 中央
                    {index: 5, src: baseTemplate + (tileX+1) + '/' + tileY + '.png'}, // 右
                    {index: 7, src: baseTemplate + tileX + '/' + (tileY+1) + '.png'}, // 下
                    {index: 8, src: baseTemplate + (tileX+1) + '/' + (tileY+1) + '.png'}  // 右下
                ];
            } else if (xyOrder === 'yx') {
                tileImagesSrc = [
                    {index: 4, src: url}, // 中央
                    {index: 5, src: baseTemplate + tileY + '/' + (tileX+1) + '.png'}, // 右
                    {index: 7, src: baseTemplate + (tileY+1) + '/' + tileX + '.png'}, // 下
                    {index: 8, src: baseTemplate + (tileY+1) + '/' + (tileX+1) + '.png'}  // 右下
                ];
            }

            const tileSize = 256; // タイルのサイズ（ピクセル）
            const buffer = 1; // 中央から読み込む範囲（ピクセル）

            // 結合用のキャンバスを作成
            const mergedCanvas = new OffscreenCanvas(tileSize + buffer * 2, tileSize + buffer * 2);
            const mergedCtx = mergedCanvas.getContext('2d');

            // 出力用のキャンバスを作成
            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);
            const outputCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
            const outputCtx = outputCanvas.getContext('2d');
            outputCtx.drawImage(imageBitmap, 0, 0);
            
            const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);

            outputCtx.putImageData(outputImageData, 0, 0);

            // tileImagesSrcに含まれる画像を非同期で読み込む
            const imagePromises = tileImagesSrc.map(async ({ index, src }) => {
                const response = await fetch(src, { signal: abortController.signal });
                if (response.status === 200) {
                    const blob = await response.blob();
                    return { img: await createImageBitmap(blob), index };
                } else {
                    return { img: null, index };
                }
            });

            // すべてのタイルが読み込まれたら処理を続行
            const images = await Promise.all(imagePromises);
            images.forEach(({ img, index }) => {
                if (img) {
                    // タイルの描画位置を計算
                    const { sx, sy, sWidth, sHeight, dx, dy } = calculateTilePosition(index, tileSize, buffer);
                    // タイルをCanvasに描画
                    mergedCtx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, sWidth, sHeight);
                }
            });

            // 傾斜と色を計算
            const mergedImageData = mergedCtx.getImageData(0, 0, tileSize + buffer * 2, tileSize + buffer * 2);
            const mergedWidth = tileSize + buffer * 2;

            for (let row = 0; row < tileSize; row++) {
                for (let col = 0; col < tileSize; col++) {
                    const mergedIndex = ((row + buffer) * mergedWidth + (col + buffer)) * 4;
                    const outputIndex = (row * tileSize + col) * 4;
                                                
                    // RGB値を使用して高さを計算
                    let H00 = calculateHeight(mergedImageData.data[mergedIndex], mergedImageData.data[mergedIndex + 1], mergedImageData.data[mergedIndex + 2]);
                    let H01 = calculateHeight(mergedImageData.data[mergedIndex + 4], mergedImageData.data[mergedIndex + 5], mergedImageData.data[mergedIndex + 6]);
                    let H10 = calculateHeight(mergedImageData.data[mergedIndex + mergedWidth * 4], mergedImageData.data[mergedIndex + mergedWidth * 4 + 1], mergedImageData.data[mergedIndex + mergedWidth * 4 + 2]);
                    let slope = calculateSlope(H00, H01, H10, pixelLength);
                    let alpha = Math.min(Math.max(slope * 3, 0), 255); // alpha値は0から255の範囲に収める

                    outputImageData.data[outputIndex] = 0;
                    outputImageData.data[outputIndex + 1] = 0;
                    outputImageData.data[outputIndex + 2] = 0;
                    outputImageData.data[outputIndex + 3] = alpha;
                }
            };

            outputCtx.putImageData(outputImageData, 0, 0);

            return outputCanvas.convertToBlob().then(async (blob) => {
                return { data: await blob.arrayBuffer() };
            });

        
        } else {
            // Log an error or handle it appropriately
            return { data: null }; // return null or other appropriate value
        }
    };

    // Add the protocol
    addProtocol(protocol, loadFn);
}

export { dem2SlopeProtocol };

// タイルの位置を計算する関数
function calculateTilePosition(index, tileSize, buffer) {
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
function getCalculateHeightFunction(encoding) {
    switch (encoding) {
        case 'gsj':
        case 'gsi':
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

// タイルのピクセル長さを計算する関数
function calculatePixelLength(zoomLevel1, tileY1) {
    // 度数法から弧度法へ変換
    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // 弧度法から度数法へ変換
    function toDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    // タイルがカバーする緯度範囲を求める
    const n = 2 ** zoomLevel1;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileY1 / n)));
    const latDeg = toDegrees(latRad);

    // タイルがカバーする緯度の中心での1度あたりの距離（約111.32km/度、地球の半径を6371kmと仮定）
    const latLengthPerDegree = 111.32 * 1000; // メートル単位

    // ズームレベル7でのタイル1辺あたりの度数
    const degreesPerTile = 360 / n;

    // タイルの実際の長さを計算（緯度による補正を考慮）
    const pixelLength = latLengthPerDegree * degreesPerTile * Math.cos(toRadians(latDeg)) / 256;

    return pixelLength;
}

// 斜面を計算する関数
// 産業技術総合研究所のシームレス傾斜量図の計算式を使用した。
// https://gbank.gsj.jp/seamless/slope/
function calculateSlope(H00, H01, H10, pixelLength) {
    let dx = H00 - H01;
    let dy = H00 - H10;
    let slope = Math.atan(Math.sqrt(dx * dx + dy * dy) / pixelLength) * (180 / Math.PI);
    return slope;
}

