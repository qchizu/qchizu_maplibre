import { addProtocol } from 'maplibre-gl';
import { weightFile25, weightFile13, weightFile5, weightFile3, weightFile1 } from './weightFile';
import { weightSum25, weightSum13, weightSum5, weightSum3, weightSum1 } from './weightFile';
import { calculateTilePosition, getCalculateHeightFunction, calculatePixelResolution, calculateSlope } from './protocolUtils';

function dem2CsProtocol(
    protocol = 'cs', 
    encoding = 'gsj', 
    xyOrder = 'xy'
) {
    // エンコーディングに応じて適切な標高計算関数を取得
    const calculateHeight = getCalculateHeightFunction(encoding);

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
            
            // ★1ピクセルあたりの距離に応じてウェイトファイルを選択するように要変更↓
            const weightFile = zoomLevel === 17 ? weightFile25 : zoomLevel === 16 ? weightFile13 : zoomLevel === 15 ? weightFile5 : zoomLevel === 14 ? weightFile3 : weightFile1; // ウェイトファイルの選択
            const weightSumCheck = zoomLevel === 17 ? weightSum25 : zoomLevel === 16 ? weightSum13 : zoomLevel === 15 ? weightSum5 : zoomLevel === 14 ? weightSum3 : weightSum1; // ウェイトファイルの合計値
            const weightSum = weightFile.reduce((acc, row) => acc + row.reduce((acc, weight) => acc + weight, 0), 0);
            console.log(zoomLevel,weightSum, weightSumCheck);

            const weightFileRowsCols = weightFile.length; // weightFileの行数・列数
            const radius = Math.floor(weightFileRowsCols / 2); // ウェイトファイルの「半径」
            const buffer = Math.floor(weightFileRowsCols / 2 ) + 1; // タイルの周囲に追加するピクセル数（+1はsmoothedHeightsのbufferが1あるため）
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
                    {index: 0, src: baseTemplate + (tileX-1) + '/' + (tileY-1) + '.png'}, // 左上
                    {index: 1, src: baseTemplate + tileX + '/' + (tileY-1) + '.png'}, // 上
                    {index: 2, src: baseTemplate + (tileX+1) + '/' + (tileY-1) + '.png'}, // 右上
                    {index: 3, src: baseTemplate + (tileX-1) + '/' + tileY + '.png'}, // 左
                    {index: 4, src: url}, // 中央
                    {index: 5, src: baseTemplate + (tileX+1) + '/' + tileY + '.png'}, // 右
                    {index: 6, src: baseTemplate + (tileX-1) + '/' + (tileY+1) + '.png'}, // 左下
                    {index: 7, src: baseTemplate + tileX + '/' + (tileY+1) + '.png'}, // 下
                    {index: 8, src: baseTemplate + (tileX+1) + '/' + (tileY+1) + '.png'} // 右下
                ];
            } else if (xyOrder === 'yx') {
                tileImagesSrc = [
                    {index: 0, src: baseTemplate + (tileY-1) + '/' + (tileX-1) + '.png'}, // 左上
                    {index: 1, src: baseTemplate + (tileY-1) + '/' + tileX + '.png'}, // 上
                    {index: 2, src: baseTemplate + (tileY-1) + '/' + (tileX+1) + '.png'}, // 右上
                    {index: 3, src: baseTemplate + tileY + '/' + (tileX-1) + '.png'}, // 左
                    {index: 4, src: url}, // 中央
                    {index: 5, src: baseTemplate + tileY + '/' + (tileX+1) + '.png'}, // 右
                    {index: 6, src: baseTemplate + (tileY+1) + '/' + (tileX-1) + '.png'}, // 左下
                    {index: 7, src: baseTemplate + (tileY+1) + '/' + tileX + '.png'}, // 下
                    {index: 8, src: baseTemplate + (tileY+1) + '/' + (tileX+1) + '.png'} // 右下
                ];
            }

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

            // 傾斜と色を計算
            const mergedWidth = tileSize + buffer * 2;
            const mergedImageData = mergedCtx.getImageData(0, 0, mergedWidth, mergedWidth);

            // mergedImageDataの各ピクセルの標高を計算
            console.time('mergedHeights');
            const mergedHeights = [];
            for (let row = 0; row < mergedWidth; row++) {
                for (let col = 0; col < mergedWidth; col++) {
                    const index = (row * (mergedWidth) + col) * 4;
                    const height = calculateHeight(mergedImageData.data[index], mergedImageData.data[index + 1], mergedImageData.data[index + 2]);
                    mergedHeights.push(height);
                }
            }
            console.timeEnd('mergedHeights');
            // mergedHeightsのデータ数　＝　(mergedWidth) * (mergedWidth)

            // outputImageDataの各ピクセルの標高を平滑化（ウェイトファイルを使用）
            // 曲率の計算用に周辺に1ピクセル分余分に計算する
            // ★処理の高速化が必要
            // 試したこと
            // Float32Array（32ビットの浮動小数点数）への変換→逆効果（×1.5倍くらい遅くなった）
            console.time('smoothedHeights');
            const smoothedHeights = new Array((tileSize + buffer * 2) * (tileSize + buffer * 2));
            let index = 0;
            for (let row = buffer - 1; row < tileSize + buffer + 1; row++) {
                for (let col = buffer - 1; col < tileSize + buffer + 1; col++) {
                    let sum = 0;
                    for (let i = -radius; i <= radius; i++) {
                        const weightRow = weightFile[i + radius];
                        for (let j = -radius; j <= radius; j++) {
                            const mergedIndex = (row + i) * mergedWidth + (col + j);
                            const weight = weightRow[j + radius];
                            sum += mergedHeights[mergedIndex] * weight;
                        }
                    }
                    smoothedHeights[index++] = sum / weightSum;
                }
            }
            console.timeEnd('smoothedHeights');

            // 平滑化した標高から曲率を計算
            // const curvatures = [];
            console.time('curvatures');
            const cellSize = pixelLength;
            for (let row = 0; row < tileSize; row++) {
                for (let col = 0; col < tileSize; col++) {
                    // https://github.com/MIERUNE/csmap-py/blob/main/csmap/calc.py を参考にした　★計算式要検証
                    const index = ( (row + 1) * ( tileSize + 2 ) ) + (col + 1);
                    const z1 = smoothedHeights[index - ( tileSize + 2 ) - 1];
                    const z2 = smoothedHeights[index - ( tileSize + 2 )];
                    const z3 = smoothedHeights[index - ( tileSize + 2 ) + 1];
                    const z4 = smoothedHeights[index - 1];
                    const z5 = smoothedHeights[index];
                    const z6 = smoothedHeights[index + 1];
                    const z7 = smoothedHeights[index + ( tileSize + 2 ) - 1];
                    const z8 = smoothedHeights[index + ( tileSize + 2 )];
                    const z9 = smoothedHeights[index + ( tileSize + 2 ) + 1];
                    
                    const cellArea = cellSize * cellSize;
                    const r = ((z4 + z6) / 2 - z5) / cellArea;
                    const t = ((z2 + z8) / 2 - z5) / cellArea;
                    const curvature = -2 * (r + t);
                    // curvatures.push(curvature);

                    // 曲率に応じて色を設定（赤→黄→青に変化させる）し、タイルとして出力する
                    let red, green, blue;
                    if (curvature <= 0) {
                        red = Math.round(255 * (1 - Math.min(Math.abs(curvature*3), 1)));
                        green = Math.round(255 * (1 - Math.min(Math.abs(curvature*3), 1)));
                        blue = 255;
                    } else {
                        red = 255;
                        green = Math.round(255 * (1 - Math.min(curvature*3, 1)));
                        blue = Math.round(255 * (1 - Math.min(curvature*3, 1)));
                    }
                    
                    const outputIndex = (row * tileSize + col) * 4;
                    outputImageData.data[outputIndex] = red;
                    outputImageData.data[outputIndex + 1] = green;
                    outputImageData.data[outputIndex + 2] = blue;
                    outputImageData.data[outputIndex + 3] = 255;
                }       
            }
            console.timeEnd('curvatures');
            // 以下のコード傾斜量図作成用のため、いったんコメントアウト
/*             for (let row = 0; row < tileSize; row++) {
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
            }; */

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

export { dem2CsProtocol };
