// numPngProtocol.js, 2023-11-27　西岡 芳晴 ( NISHIOKA Yoshiharu )を一部修正
function demTranscoderProtocol(protocol = 'gsi', encoding = 'gsi') {
        // 定数の事前計算
        const twoToThePowerOf23 = 2 ** 23;
        const twoToThePowerOf24 = 2 ** 24;
    return (params, callback) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                const n = r * 65536 + g * 256 + b;

                let height;
                if (n === twoToThePowerOf23 || a !== 255) { // || n === twoToThePowerOf23 + 1 モバイル版で(127,0,0)が(127,0,1)となる場合があるためその対処
                    height = 0;
                } else {
                    height = n < twoToThePowerOf23 ? 0.01 * n : 0.01 * (n - twoToThePowerOf24);
                }

                const n2 = (height + 10000) * 10;

                data[i] = n2 >> 16 & 0xff;
                data[i + 1] = n2 >> 8 & 0xff;
                data[i + 2] = n2 & 0xff;
                data[i + 3] = 255; //alphaが0だとterrainが正しく表示されない
            }

            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(async (blob) => {
                callback(null, await blob.arrayBuffer(), null, null);
            });
        };
        image.src = params.url.replace(protocol + '://https://', 'https://');
        return { cancel: _ => {} };
    }
};

export { demTranscoderProtocol };