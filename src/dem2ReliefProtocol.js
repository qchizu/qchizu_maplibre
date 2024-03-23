import { addProtocol } from 'maplibre-gl';

function dem2ReliefProtocol(
    protocol = 'relief',  
    encoding = 'gsi', // 'gsi', 'gsj', 'mapbox', 'terrarium'
    gradation = true, //  true, false
    colorMap = [
        { limit: -99999, color: [255, 255, 255]}, // 無効値の色
        { limit: -99998, color: [83, 135, 148] }, //0m未満の色
        { limit: 0, color: [83, 135, 148] }, //0m未満の色（以下同じ）
        { limit: 1, color: [0, 204, 204] },
        { limit: 10, color: [128, 215, 255] },
        { limit: 30, color: [191, 255, 191] },
        { limit: 60, color: [117, 255, 117] },
        { limit: 140, color: [73, 179, 2] },
        { limit: 300, color: [255, 255, 0] },
        { limit: 600, color: [253, 164, 32] },
        { limit: 900, color: [217, 109, 0] },
        { limit: 1100, color: [163, 87, 10] },
        { limit: 1500, color: [148, 107, 64] },
        { limit: 2000, color: [143, 132, 122] },
        { limit: 2500, color: [187, 181, 175] },
        { limit: 3000, color: [230, 229, 227] },
        { limit: Infinity, color: [255, 255, 255] }
    ]
) {
    const loadFn = async (params, abortController) => {
        const imageUrl = params.url.replace(`${protocol}://`, '');
        const response = await fetch(imageUrl, { signal: abortController.signal });

        if (response.status === 200) {
            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);

            const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageBitmap, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // 定数の事前計算
            const twoToThePowerOf23 = 2 ** 23;
            const twoToThePowerOf24 = 2 ** 24;

            //encodingに応じて標高を計算する関数
            function calculateHeight(encoding, r, g, b) {
                let h;
                if (encoding === 'gsi' || encoding === 'gsj') {
                    const x = r * 65536 + g * 256 + b;
                    if (x === twoToThePowerOf23) {
                        h = -99999;
                    } else {
                        h = x < twoToThePowerOf23 ? 0.01 * x : 0.01 * (x - twoToThePowerOf24);
                    }
                } else if (encoding === 'mapbox') {
                    h = (r * 65536 + g * 256 + b) / 10 - 10000;
                } else if (encoding === 'terrarium') {
                    h =  r * 256 + g + b / 256 - 32768;
                }
                return h;
            }

            for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];

                let h;

                h = calculateHeight(encoding, r, g, b);

                let [R, G, B] = [255, 255, 255]; // デフォルトの色

                if (gradation === true) {   // グラデーションを有効にする場合
                    let color1, color2;
                    let limit1, limit2;
                    for (let j = 0; j < colorMap.length - 1; j++) {
                        if (h < colorMap[j + 1].limit) {
                            color1 = colorMap[j].color;
                            color2 = colorMap[j + 1].color;
                            limit1 = colorMap[j].limit;
                            limit2 = colorMap[j + 1].limit;
                            break;
                        }
                    }
                    if (color1 && color2) {
                        const ratio = (h - limit1) / (limit2 - limit1);
                        R = color1[0] + ratio * (color2[0] - color1[0]);
                        G = color1[1] + ratio * (color2[1] - color1[1]);
                        B = color1[2] + ratio * (color2[2] - color1[2]);
                    } else {
                        [R, G, B] = colorMap[colorMap.length - 1].color;
                    }
                } else {  // グラデーションを無効にする場合
                    for (const colorInfo of colorMap) {
                        if (h < colorInfo.limit) {
                            [R, G, B] = colorInfo.color;
                            break;
                        }
                    }
                }

                imageData.data[i] = R;
                imageData.data[i + 1] = G;
                imageData.data[i + 2] = B;
            }

            ctx.putImageData(imageData, 0, 0);

            return canvas.convertToBlob().then(async (blob) => {
                // console.log(blob); // コンソールにblob情報を出力

                // Blobから画像のURLを生成
                // const imageUrl = URL.createObjectURL(blob);
            
                // 画像URLをブラウザのコンソールに出力
                // console.log(imageUrl);
            
                // (オプション) 新しいタブで画像を開く
                // window.open(imageUrl);
                
                return { data: await blob.arrayBuffer() };
            });
        } else {
            return { data: null }; // return null or other appropriate value
        }
    };

    // プロトコルを追加
    addProtocol(protocol, loadFn);
}

export { dem2ReliefProtocol };
