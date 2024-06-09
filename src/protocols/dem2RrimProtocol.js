import { addProtocol } from 'maplibre-gl';
import { calculateTilePosition, getCalculateHeightFunction, calculatePixelResolution, calculateSlope, generateColorImage, generateColorImageWithMidColor, blendImages, multiplyBlendImages } from './protocolUtils';
import * as tf from '@tensorflow/tfjs';

function dem2RrimProtocol(
    protocol = 'rrim', 
    encoding = 'gsj', //今度の作業　gsj→numpngに変更
    xyOrder = 'xy', // タイルのURLにおけるXYの順序 {z}/{x}/{y}.pngの場合は'xy'、{z}/{y}/{x}.pngの場合は'yx'
    terrainScale = 1, // 表現する地形の規模の調整
    redAndBlueIntensity = 1,// 赤・青の濃度　今後の作業　調整できるようにする
    // 今後の作業　出力図の種類も設定できるようにする
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

            // console.time用の名前
            // const tileInfo = tileX + '-' + tileY + '-' + zoomLevel;
            // console.time(tileInfo + '画像読み込み、ガウシアンカーネル作成' );

            const tileSize = 256; // タイルのサイズ（ピクセル）
            const pixelLength = calculatePixelResolution(tileSize, zoomLevel, tileY); // 1ピクセルの実距離（メートル）


            // 色の調整用の出力
            // console.log('pixelLength:', pixelLength, 'terrainScale:', terrainScale, 'zoomLevel:', zoomLevel, 'sigma:', sigma);

            const buffer = 3; // タイルの周囲に追加するピクセル数（+1はsmoothedHeightsのbufferが1あるため）

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
                    // 不要になったImageを解放
                    img.close();
                }
            });

            const mergedWidth = tileSize + buffer * 2;
            const mergedImageData = mergedCtx.getImageData(0, 0, mergedWidth, mergedWidth);

            // console.timeEnd(tileInfo + '画像読み込み、ガウシアンカーネル作成' );

            // mergedImageDataの各ピクセルの標高を計算
            // console.time(tileInfo + 'mergedHeights計算');
            const mergedHeights = [];
            for (let row = 0; row < mergedWidth; row++) {
                for (let col = 0; col < mergedWidth; col++) {
                    const index = (row * (mergedWidth) + col) * 4;
                    const height = calculateHeight(mergedImageData.data[index], mergedImageData.data[index + 1], mergedImageData.data[index + 2], mergedImageData.data[index + 3]);
                    mergedHeights.push(height);
                }
            }

            // console.timeEnd(tileInfo + 'mergedHeights計算');
            // mergedHeightsのデータ数　＝　(mergedWidth) * (mergedWidth)
            // outputImageDataの各ピクセルの標高を平滑化（ウェイトファイルを使用）
            // 曲率の計算用に周辺に1ピクセル分余分に計算する

            // console.time(tileInfo + '平滑化畳み込み計算');
            const mergedHeightsTensor = tf.keep(tf.tensor(mergedHeights, [mergedWidth, mergedWidth]));

            // カーネルの定義
            const kernels = [
                [ 0, 0, 0, 0, 0, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0],
                [ 3, 2, 1, 0, 0, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0],
            ];

            // 畳み込み処理の実行
            const convResults = tf.conv2d(mergedHeightsTensor, kernels, [1, 1], 'valid');

            console.log('convResults:', convResults.length);
            
            // 最大値の計算
            const maxResults = convResults.map(result => tf.max(result, [1, 2]));
            
            // 結果の平均を計算
            const outputData = tf.mean(tf.stack(maxResults), 0);

            const ridgeValleyParameter = outputData.dataSync();

            console.log('ridgeValleyParameter:', ridgeValleyParameter);

            //console.log('smoothedHeights:', smoothedHeights);

            // 不要となったテンソルをメモリから解放
            mergedHeightsTensor.dispose();

            // console.timeEnd(tileInfo + '平滑化畳み込み計算');

            // 平滑化した標高から曲率を計算し、CS立体図を作成
            const curvatures = [];
            // slopesの2次元配列を作成
            const slopes = [];
            
            // console.time(tileInfo + '曲率計算のloop');
            for (let row = 0; row < tileSize; row++) {
                for (let col = 0; col < tileSize; col++) {
                    // 傾斜を計算 slopeは0から90の範囲(?)
                    const mergedIndex = ((row + buffer) * mergedWidth + (col + buffer));
                    let slope = calculateSlope(mergedHeights[mergedIndex], mergedHeights[mergedIndex + 1], mergedHeights[mergedIndex + mergedWidth], pixelLength);
                    slopes.push(slope);
                }
            }
            
            // console.timeEnd(tileInfo + '曲率計算のloop');
            // console.time(tileInfo + 'CS立体図の作成');

            // 1-1 【立体図】の標高レイヤ（黒→白） mergedHeightsから切り出し
            const rrimTensor = tf.tidy(() => {
                // テンソルの作成
                const ridgeValleyParameterTensor2D = tf.tensor2d(ridgeValleyParameter, [tileSize, tileSize]);
                const slopesTensor2D = tf.tensor1d(slopes, 'float32').reshape([tileSize, tileSize]);
                
                // 1-1 【立体図】の標高レイヤ（黒→白）
                const ridgeValleyLayerTensor = generateColorImage(0, 3000, { r: 100, g: 100, b: 100 }, { r: 255, g: 255, b: 255 }, ridgeValleyParameterTensor2D);

                // 1-2 【立体図】の曲率レイヤ（紺→白）
                const slopesLayerTensor = generateColorImage(-0.25, 0.05, { r: 42, g: 92, b: 170 }, { r: 255, g: 255, b: 255 }, slopesTensor2D);
                // CS立体図改良案
                const rrimTensor = blendImages(ridgeValleyLayerTensor, slopesLayerTensor, 0.5);

                return rrimTensor;
            });

            // console.timeEnd(tileInfo + 'CS立体図の作成'); 
            // console.time(tileInfo + 'CS立体図の描画');

            await tf.browser.toPixels(rrimTensor.reshape([tileSize, tileSize, 3]).div(tf.scalar(255)), outputCanvas);

            // 不要となったテンソルをメモリから解放
            rrimTensor.dispose();

            // console.timeEnd(tileInfo + 'CS立体図の描画');
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

export { dem2RrimProtocol };
