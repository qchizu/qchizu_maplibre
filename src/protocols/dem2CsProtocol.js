import { addProtocol } from 'maplibre-gl';
import { calculateTilePosition, getCalculateHeightFunction, calculatePixelResolution, calculateSlope, generateColorImage, generateColorImageWithMidColor, blendImages, multiplyBlendImages } from './protocolUtils';
import * as tf from '@tensorflow/tfjs';

function dem2CsProtocol(
    protocol = 'cs', 
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

            // // console.time用の名前
            // const tileInfo = tileX + '-' + tileY + '-' + zoomLevel;
            // console.time(tileInfo + 'ガウシアンカーネル作成' );

            const tileSize = 256; // タイルのサイズ（ピクセル）
            const pixelLength = calculatePixelResolution(tileSize, zoomLevel, tileY); // 1ピクセルの実距離（メートル）

            // ガウシアンカーネル作成
            const minimumSigma = 1.6; // ガウシアンカーネルの最小標準偏差
            const sigma =  Math.max(3 / pixelLength, minimumSigma) * terrainScale;  // ガウシアンカーネルの標準偏差を計算(1mメッシュの場合、3m)
            const kernelRadius = Math.ceil(sigma * 3); // カーネルの半径を計算（μ ± 3σに入るデータの割合は0.997なので、標準偏差の3倍までとした）
            const kernelSize = [kernelRadius * 2 + 1, kernelRadius * 2 + 1]; // ガウシアンカーネルのサイズを定義

            // 色の調整用の出力
            // console.log('pixelLength:', pixelLength, 'terrainScale:', terrainScale, 'zoomLevel:', zoomLevel, 'sigma:', sigma);

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

            // console.timeEnd(tileInfo + 'ガウシアンカーネル作成' );
            // console.time(tileInfo + '画像読み込み')

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

            // console.timeEnd(tileInfo + '画像読み込み')
            // console.time(tileInfo + '画像結合' );

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

            // console.timeEnd(tileInfo + '画像結合' );

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

            // 無効値をマスクするためのバイナリマスクテンソルを作成
            const validMask = mergedHeightsTensor.notEqual(-99999);

            // 無効値を0に置き換えたテンソルを作成
            const maskedHeightsTensor = mergedHeightsTensor.where(validMask, 0);

            // カーネルの合計を計算
            const kernelSum = tf.conv2d(
                validMask.cast('float32').expandDims(2).expandDims(0),
                kernel.expandDims(2).expandDims(3),
                1,
                'valid'
            ).squeeze([0, 3]);

            // conv2d演算を行う
            let smoothedHeightsTensor = tf.conv2d(
                maskedHeightsTensor.expandDims(2).expandDims(0),
                kernel.expandDims(2).expandDims(3),
                1,
                'valid'
            ).squeeze([0, 3]);

            // カーネルの合計で割る
            smoothedHeightsTensor = smoothedHeightsTensor.div(kernelSum);

            // validMaskをsmoothedHeightsTensorのサイズに切り抜く
            const resizedValidMask = validMask.slice([buffer, buffer], [tileSize+2, tileSize+2]);

            // 無効値の位置を元に戻す
            smoothedHeightsTensor = smoothedHeightsTensor.where(resizedValidMask, smoothedHeightsTensor, -99999);

            const smoothedHeights = smoothedHeightsTensor.dataSync();

            //console.log('smoothedHeights:', smoothedHeights);

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
                    // 傾斜を計算 slopeは0から90の範囲(?)
                    const mergedIndex = ((row + buffer) * mergedWidth + (col + buffer));
                    let slope = calculateSlope(mergedHeights[mergedIndex], mergedHeights[mergedIndex + 1], mergedHeights[mergedIndex + mergedWidth], pixelLength);
                    slopes.push(slope);

                    // 曲率を計算　https://github.com/MIERUNE/csmap-py/blob/main/csmap/calc.py を参考にした
                    // https://help.arcgis.com/en/arcgisdesktop/10.0/help/index.html#/How_Curvature_works/00q90000000t000000/
                    // https://pro.arcgis.com/en/pro-app/latest/tool-reference/3d-analyst/curvature.htm
                    // https://www.esri.com/arcgis-blog/products/product/imagery/understanding-curvature-rasters/
                    const index = ((row + 1) * (tileSize + 2)) + (col + 1);
                    const z2 = smoothedHeights[index - (tileSize + 2)];
                    const z4 = smoothedHeights[index - 1];
                    const z5 = smoothedHeights[index];
                    const z6 = smoothedHeights[index + 1];
                    const z8 = smoothedHeights[index + (tileSize + 2)];
                    const cellArea = pixelLength * pixelLength;
                    const r = ((z4 + z6) / 2 - z5) / cellArea;
                    const t = ((z2 + z8) / 2 - z5) / cellArea;
                    if (mergedHeights[mergedIndex] == -99999) { // 無効値の場合の処理
                        curvatures.push(-1);
                    } else {
                        const curvature = -2 * (r + t); // general curvature
                        curvatures.push(curvature);
                    }
                }
            }
            
            // console.timeEnd(tileInfo + '曲率計算のloop');
            // console.time(tileInfo + 'CS立体図の作成');

            // 1-1 【立体図】の標高レイヤ（黒→白） mergedHeightsから切り出し
            const csRittaizuTensor = tf.tidy(() => {
                // curvatureTensor2Dの最小値、最大値を出力
                // const minCurvature = Math.min(...curvatures);
                // const maxCurvature = Math.max(...curvatures);
                //console.log('minCurvature:', minCurvature, 'maxCurvature:', maxCurvature);

                // テンソルの作成
                const mergedHeightsTensor2D = tf.tensor2d(mergedHeights, [mergedWidth, mergedWidth]);
                const heightTensor2D = mergedHeightsTensor2D.slice([buffer, buffer], [tileSize, tileSize]);
                const curvatureTensor2D = tf.tensor1d(curvatures, 'float32').reshape([tileSize, tileSize]);
                const slopeTensor2D = tf.tensor1d(slopes, 'float32').reshape([tileSize, tileSize]);

                // 曲率の係数（適切な色合いになるように調整するもの）
                // curvatureCoefficientの最適値　
                // (1,1.1),(2,1.1),(4,2.2),(8,3.2),(16,6),(32,18),(65,35),(126,80),(250,160),(500,400)
                // 最適値にフィットするように場合分けして近似式を求めたもの
                let curvatureCoefficient;
                if (pixelLength < 68) { // 68は２つの値が同じになるところ
                    curvatureCoefficient = Math.max(pixelLength / 2,1.1) * Math.sqrt(terrainScale) * redAndBlueIntensity;
                } else {
                    curvatureCoefficient = 0.188 * Math.pow(pixelLength,1.232) * Math.sqrt(terrainScale) * redAndBlueIntensity;
                }
                // console.log('pixelLength', pixelLength,'sigma', sigma, 'curvatureCoefficient:', curvatureCoefficient);
                
                // 1-1 【立体図】の標高レイヤ（黒→白）
                const rittaizuHeightLayerTensor = generateColorImage(0, 3000, { r: 100, g: 100, b: 100 }, { r: 255, g: 255, b: 255 }, heightTensor2D)

                // 1-2 【立体図】の曲率レイヤ（紺→白）
                const riittaizuCurvatureLayerTensor = generateColorImage(-0.25 / curvatureCoefficient, 0.05 / curvatureCoefficient, { r: 42, g: 92, b: 170 }, { r: 255, g: 255, b: 255 }, curvatureTensor2D);

                // 1-3 【立体図】の傾斜レイヤ（白→茶）
                const riittaizuSlopeLayerTensor = generateColorImage(0, 60, { r: 255, g: 255, b: 255 }, { r: 189, g: 74, b: 29 }, slopeTensor2D); ;
    
                // 2-1 【曲率図】の曲率レイヤ（青→黄→赤）
                // const kyokuritsuzuCurvatureLayerTensor = generateColorImageWithMidColor(-0.15 / curvatureCoefficient, 0.15 / curvatureCoefficient, { r: 50, g: 96, b: 207 }, { r: 255, g: 254, b: 190 }, { r: 230, g: 35, b: 30 }, curvatureTensor2D);
                const kyokuritsuzuCurvatureLayerTensor = generateColorImageWithMidColor(-0.20 / curvatureCoefficient, 0.20 / curvatureCoefficient, { r: 0, g: 0, b: 255 }, { r: 255, g: 255, b: 240 }, { r: 255, g: 0, b: 0 }, curvatureTensor2D);
                        
                // 2-2 【曲率図】の傾斜レイヤ（白→黒）
                const kyokuritsuzuSlopeLayerTensor = generateColorImage(0, 90, { r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }, slopeTensor2D);
                      
                // 1-1～3を重ね合わせて【立体図】の作成
                // const rittaizuTensor = blendImages(blendImages(rittaizuHeightLayerTensor, riittaizuCurvatureLayerTensor, 0.5), riittaizuSlopeLayerTensor, 0.33);

                // 2-1～3を重ね合わせて【曲率図】の作成
                // const kyokuritsuzuTensor = blendImages(kyokuritsuzuCurvatureLayerTensor, kyokuritsuzuSlopeLayerTensor, 0.5);

                // CS立体図の作成
                // const csRittaizuTensor = blendImages(rittaizuTensor, kyokuritsuzuTensor, 0.5); // 0の場合、立体図、1の場合、曲率図

                // CS立体図改良案
                const csRittaizuTensor = multiplyBlendImages(blendImages(blendImages(blendImages(rittaizuHeightLayerTensor, riittaizuCurvatureLayerTensor, 0.5), riittaizuSlopeLayerTensor, 0.5), kyokuritsuzuCurvatureLayerTensor, 0.5), kyokuritsuzuSlopeLayerTensor); // 0の場合、立体図、1の場合、曲率図

                return csRittaizuTensor;
            });

            // console.timeEnd(tileInfo + 'CS立体図の作成'); 
            // console.time(tileInfo + 'CS立体図の描画');

            await tf.browser.toPixels(csRittaizuTensor.reshape([tileSize, tileSize, 3]).div(tf.scalar(255)), outputCanvas);

            // 不要となったテンソルをメモリから解放
            csRittaizuTensor.dispose();

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
