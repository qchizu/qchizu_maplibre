function png2ReliefProtocol(
    protocol = 'relief',  
    encoding = 'gsi', // 'gsi', 'gsj', 'mapbox', 'terrarium'
    gradation = true, //  true, false
    colorMap = [
        { limit: -99999, color: [255, 255, 255]}, // 無効値の色
        { limit: -99998, color: [83, 135, 148] }, //0m以下の色
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
    return (params, callback) => {
        const image = new Image();

        image.crossOrigin = 'anonymous';
        image.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const width = image.width;
            const height = image.height;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, width, height);

            //encodingに応じて標高を計算する関数
            function calculateHeight(encoding, r, g, b) {
                let h;
                if (encoding === 'gsi' || encoding === 'gsj') {
                    const x = Math.pow(2, 16) * r + Math.pow(2, 8) * g + b;
                    if (x < Math.pow(2, 23)) {
                        h = x * 0.01;
                    } else if (x === Math.pow(2, 23)) { //gsjの場合、a=0のときは無効値とされているが、タイルを見ると(r,g,b,a) = (128,0,0,0)となっているので、この処理で問題ない。
                        h = -99999;
                    } else {
                        h = (x - Math.pow(2, 24)) * 0.01;
                    }
                } else if (encoding === 'mapbox') {
                    h = (r * 256 * 256 + g * 256 + b) / 10 - 10000;
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
            canvas.toBlob(async (blob) => {
                callback(null, await blob.arrayBuffer(), null, null);
            });
        };
	    image.src = params.url.replace( protocol + '://https://', 'https://' );
        return { cancel: (_) => {} };
    };
}

export { png2ReliefProtocol };
