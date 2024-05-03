// numPngProtocol.js, 2023-11-27　西岡 芳晴 ( NISHIOKA Yoshiharu )を一部修正

import { addProtocol } from 'maplibre-gl';
function demTranscoderProtocol(protocol = 'gsj', encoding = 'gsj') {
    const twoToThePowerOf23 = 2 ** 23;
    const twoToThePowerOf24 = 2 ** 24;

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
                data[i + 3] = 255;  //alphaが0だとterrainが正しく表示されない
            }

            ctx.putImageData(imageData, 0, 0);

            return canvas.convertToBlob().then(async (blob) => {
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

export { demTranscoderProtocol };