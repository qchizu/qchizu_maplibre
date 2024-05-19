import { addProtocol } from 'maplibre-gl';
import { calculateTilePosition, getCalculateHeightFunction, calculatePixelResolution, calculateSlope, generateColorImage, generateColorImageWithMidColor, blendImages } from './protocolUtils';
import * as tf from '@tensorflow/tfjs';

function dem2CsProtocol(
    protocol = 'cs', 
    encoding = 'gsj', 
    xyOrder = 'xy',
    terrainScale = 1, // 表現する地形の規模の調整
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
/*             const tileInfo = tileX + '-' + tileY + '-' + zoomLevel;
            console.log('tileInfo:', tileInfo); */

            // console.time(tileInfo + '画像読み込み、ガウシアンカーネル作成' );

            const tileSize = 256; // タイルのサイズ（ピクセル）
            const pixelLength = calculatePixelResolution(tileSize, zoomLevel, tileY); // 1ピクセルの実距離（メートル）

            // メッシュサイズ1mの場合、25x25(25=12*2+1)のカーネルを使用するとして、メッシュサイズに応じたカーネルサイズを計算
            const colorCoefficient = zoomLevel >= 15 ? 6 : (3 * 2 ** (15 - zoomLevel)); // 色の係数

            // ガウシアンカーネル作成
            const sigma =  3 / pixelLength * terrainScale;  // ガウシアンカーネルの標準偏差を計算(1mメッシュの場合、3m)
            const kernelRadius = Math.ceil(sigma * 3); // カーネルの半径を計算（μ ± 3σに入るデータの割合は0.997なので、標準偏差の3倍までとした）
            const kernelSize = [kernelRadius * 2 + 1, kernelRadius * 2 + 1]; // ガウシアンカーネルのサイズを定義

            // tf.tidy()は、TensorFlow.jsのメモリ管理のメソッドで、この中で生成されたテンソルは、処理が終わったら自動的に解放される。
            const kernel = tf.tidy(() => {
                // tf.meshgridは、2Dグリッドの座標を生成
                const [x, y] = tf.meshgrid(
                    tf.linspace(-kernelRadius, kernelRadius, kernelSize[0]), //引数は、開始値、終了値、要素数
                    tf.linspace(-kernelRadius, kernelRadius, kernelSize[1])
                );

                const kernel = tf.exp(tf.neg(tf.add(x.square(), y.square()).div(tf.scalar(2 * sigma * sigma)))); // ガウシアンカーネルの計算式を適用。
                
                return kernel
                // return kernel.div(kernel.sum()); カーネルの合計が1になるように正規化すると干渉縞が発生する
            });

            const buffer = kernelRadius + 1; // タイルの周囲に追加するピクセル数（+1はsmoothedHeightsのbufferが1あるため）

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
            const smoothedHeightsTensor = tf.conv2d(
                mergedHeightsTensor.expandDims(2).expandDims(0),
                kernel.expandDims(2).expandDims(3),
                1,
                'valid'
            ).squeeze([0, 3]).div(kernel.sum());
            const smoothedHeights = smoothedHeightsTensor.dataSync();
            // 不要となったテンソルをメモリから解放
            mergedHeightsTensor.dispose();
            smoothedHeightsTensor.dispose();

            // console.timeEnd(tileInfo + '平滑化畳み込み計算');

            // 平滑化した標高から曲率を計算し、CS立体図を作成
            const curvatures = [];
            // slopesの2次元配列を作成
            const slopes = [];
            
            // console.time(tileInfo + '曲率計算のloop');
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
                    
                    const cellArea = pixelLength * pixelLength;
                    const r = ((z4 + z6) / 2 - z5) / cellArea;
                    const t = ((z2 + z8) / 2 - z5) / cellArea;
                    const curvature = -2 * (r + t);
                    curvatures.push(curvature); // 確認用なので、実際の処理では不要

                    const mergedIndex = ((row + buffer) * mergedWidth + (col + buffer));
                    //console.log('mergedIndex:', mergedIndex, 'row:', row, 'col:', col, 'buffer:', buffer);
                    // 傾斜を計算 slopeは0から90の範囲(?) 
                    let slope = calculateSlope(mergedHeights[mergedIndex], mergedHeights[mergedIndex + 1], mergedHeights[mergedIndex + mergedWidth], pixelLength);
                    slopes.push(slope);
                }       
            }

            // console.timeEnd(tileInfo + '曲率計算のloop');
            // console.time(tileInfo + 'CS立体図の作成');

            // 1-1 【立体図】の標高レイヤ（黒→白） mergedHeightsから切り出し
            const csRittaizu = tf.tidy(() => {

                const mergedHeightsTensor2D = tf.tensor2d(mergedHeights, [mergedWidth, mergedWidth]);
                const heightTensor2D = mergedHeightsTensor2D.slice([buffer, buffer], [tileSize, tileSize]);
                let rittaizuHeightLayerTensor = generateColorImage(0, 500, { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, heightTensor2D)

                // slopeTensor2Dの値に係数をかける
                

                // 1-2 【立体図】の曲率レイヤ（紺→白）紺色は、RGB(42, 92, 170)（瑠璃色）とし、曲率0の場合も薄く着色されるよう最小値と最大値を調整した
                const curvatureCoefficient = Math.sqrt(terrainScale); // 曲率の係数（terrainScaleの平方根）
                const curvaturesWithCoefficient = curvatures.map(curvature => curvature * curvatureCoefficient);
                const curvatureWithCoefficientTensor2D = tf.tensor1d(curvaturesWithCoefficient, 'float32').reshape([tileSize, tileSize]);
                const riittaizuCurvatureLayerTensor = generateColorImage(-0.4, 0.05, { r: 42, g: 92, b: 170 }, { r: 255, g: 255, b: 255 }, curvatureWithCoefficientTensor2D);

                // 1-3 【立体図】の傾斜レイヤ（白→茶）茶色は、RGB(189, 74, 29)(樺色)とした。
                const slopeTensor2D = tf.tensor1d(slopes, 'float32').reshape([tileSize, tileSize]);
                const riittaizuSlopeLayerTensor = generateColorImage(0, 40, { r: 255, g: 255, b: 255 }, { r: 189, g: 74, b: 29 }, slopeTensor2D); ;
    
                // 2-1 【曲率図】の曲率レイヤ（青→黄→赤）
                const kyokuritsuzuCurvatureLayerTensor = generateColorImageWithMidColor(-0.2, 0.2, { r: 0, g: 0, b: 255 }, { r: 255, g: 255, b: 230 }, { r: 255, g: 0, b: 0 }, curvatureWithCoefficientTensor2D);
                        
                // 2-2 【曲率図】の傾斜レイヤ（白→黒）
                const kyokuritsuzuSlopeLayerTensor = generateColorImage(0, 40, { r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }, slopeTensor2D);
                      
                // 1-1～3を重ね合わせて【立体図】の作成
                let rittaizuTensor = blendImages(blendImages(rittaizuHeightLayerTensor, riittaizuCurvatureLayerTensor, 0.5), riittaizuSlopeLayerTensor, 0.5);
                // console.log('rittaizuTensor:', rittaizuTensor);

                // 2-1～3を重ね合わせて【曲率図】の作成
                let kyokuritsuzuTensor = blendImages(kyokuritsuzuCurvatureLayerTensor, kyokuritsuzuSlopeLayerTensor, 0.5);

                // CS立体図の作成
                let csRittaizu = blendImages(rittaizuTensor, kyokuritsuzuTensor, 0.8); // 0の場合、立体図、1の場合、曲率図
                return csRittaizu;
            });

            // console.timeEnd(tileInfo + 'CS立体図の作成'); 
            // console.time(tileInfo + 'CS立体図の描画');

            await tf.browser.toPixels(csRittaizu.reshape([tileSize, tileSize, 3]).div(tf.scalar(255)), outputCanvas);
            csRittaizu.dispose();
            // 不要となったテンソルをメモリから解放
            csRittaizu.dispose();

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

export { dem2CsProtocol };



