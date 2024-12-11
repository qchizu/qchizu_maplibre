import { addProtocol } from 'maplibre-gl';
import { calculateTilePosition, getCalculateHeightFunction, calculatePixelResolution, calculateSlope } from './protocolUtils';

function dem2SlopeProtocol(
    protocol = 'slope', 
    encoding = 'gsj',  //  'gsj', 'mapbox', 'terrarium'
    xyOrder = 'xy',
    colorMode = 'color' // 'color', 'gray'
) {
    // エンコーディングに応じて適切な標高計算関数を取得
    const calculateHeight = getCalculateHeightFunction(encoding);

    // カラーモードに応じた色の計算関数を定義
    const colorProcessor = {
        color: (slope) => {
            if (slope >= 0 && slope < 15) {
                return [0, 0, 255, 255];  // 青
            } else if (slope >= 15 && slope < 30) {
                return [51, 194, 255, 255];  // 水色
            } else if (slope >= 30 && slope < 40) {
                return [182, 255, 143, 255];  // 緑
            } else if (slope >= 40 && slope < 45) {
                return [255, 200, 0, 255];  // 黄
            } else {
                return [255, 0, 0, 255];  // 赤
            }
        },
        gray: (slope) => {
            const alpha = Math.min(Math.max(slope * 3, 0), 255);
            return [0, 0, 0, alpha];
        }
    };

    const loadFn = async (params, abortController) => {
        // URLからズームレベル、タイルX、タイルYを抽出
        const url = params.url.replace(`${protocol}://`, '');
        const response = await fetch(url, { signal: abortController.signal });

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

            const tileSize = 256; // タイルのサイズ（ピクセル）

            // 1ピクセルあたりの距離を計算
            const pixelLength = calculatePixelResolution(tileSize, zoomLevel, tileY);

            // 周辺を含む9つのタイル画像のソース
            // index: 0 1 2
            //        3 4 5
            //        6 7 8
            const baseTemplate = url.substring(0, url.lastIndexOf(`/${zoomLevel}/`) + 1) + `${zoomLevel}/`;
            let tileImagesSrc = [];
            if (xyOrder === 'xy') {
            tileImagesSrc = [
                //{index: 0, src: baseTemplate + (tileX-1) + '/' + (tileY-1) + '.png'}, // 左上
                //{index: 1, src: baseTemplate + tileX + '/' + (tileY-1) + '.png'}, // 上
                //{index: 2, src: baseTemplate + (tileX+1) + '/' + (tileY-1) + '.png'}, // 右上
                //{index: 3, src: baseTemplate + (tileX-1) + '/' + tileY + '.png'}, // 左
                {index: 4, src: url}, // 中央
                {index: 5, src: baseTemplate + (tileX+1) + '/' + tileY + '.png'}, // 右
                //{index: 6, src: baseTemplate + (tileX-1) + '/' + (tileY+1) + '.png'}, // 左下
                {index: 7, src: baseTemplate + tileX + '/' + (tileY+1) + '.png'}, // 下
                {index: 8, src: baseTemplate + (tileX+1) + '/' + (tileY+1) + '.png'} // 右下
            ];
            } else if (xyOrder === 'yx') {
            tileImagesSrc = [
                //{index: 0, src: baseTemplate + (tileY-1) + '/' + (tileX-1) + '.png'}, // 左上
                //{index: 1, src: baseTemplate + (tileY-1) + '/' + tileX + '.png'}, // 上
                //{index: 2, src: baseTemplate + (tileY-1) + '/' + (tileX+1) + '.png'}, // 右上
                //{index: 3, src: baseTemplate + tileY + '/' + (tileX-1) + '.png'}, // 左
                {index: 4, src: url}, // 中央
                {index: 5, src: baseTemplate + tileY + '/' + (tileX+1) + '.png'}, // 右
                //{index: 6, src: baseTemplate + (tileY+1) + '/' + (tileX-1) + '.png'}, // 左下
                {index: 7, src: baseTemplate + (tileY+1) + '/' + tileX + '.png'}, // 下
                {index: 8, src: baseTemplate + (tileY+1) + '/' + (tileX+1) + '.png'} // 右下
            ];
            }

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
                try {
                    const response = await fetch(src, { signal: abortController.signal });
                    if (response.status === 200) {
                        const blob = await response.blob();
                        return { img: await createImageBitmap(blob), index };
                    } else {
                        return { img: null, index };
                    }
                } catch (error) {
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

            // 選択されたカラーモードの処理関数を取得
            const processColor = colorProcessor[colorMode];

            // 傾斜と色を計算
            const mergedImageData = mergedCtx.getImageData(0, 0, tileSize + buffer * 2, tileSize + buffer * 2);
            const mergedWidth = tileSize + buffer * 2;

            for (let row = 0; row < tileSize; row++) {
                for (let col = 0; col < tileSize; col++) {
                    const mergedIndex = ((row + buffer) * mergedWidth + (col + buffer)) * 4;
                    const outputIndex = (row * tileSize + col) * 4;
                                                
                    // RGB値を使用して高さを計算
                    let H00 = calculateHeight(mergedImageData.data[mergedIndex], mergedImageData.data[mergedIndex + 1], mergedImageData.data[mergedIndex + 2], mergedImageData.data[mergedIndex + 3]);
                    let H01 = calculateHeight(mergedImageData.data[mergedIndex + 4], mergedImageData.data[mergedIndex + 5], mergedImageData.data[mergedIndex + 6], mergedImageData.data[mergedIndex + 7]);
                    let H10 = calculateHeight(mergedImageData.data[mergedIndex + mergedWidth * 4], mergedImageData.data[mergedIndex + mergedWidth * 4 + 1], mergedImageData.data[mergedIndex + mergedWidth * 4 + 2], mergedImageData.data[mergedIndex + mergedWidth * 4 + 3]);
                    let slope = calculateSlope(H00, H01, H10, pixelLength);

                    // カラーモードに応じた色を取得して適用
                    const [r, g, b, a] = processColor(slope);
                    outputImageData.data[outputIndex] = r;
                    outputImageData.data[outputIndex + 1] = g;
                    outputImageData.data[outputIndex + 2] = b;
                    outputImageData.data[outputIndex + 3] = a;
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
