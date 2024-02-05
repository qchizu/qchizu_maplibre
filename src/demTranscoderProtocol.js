// numPngProtocol.js, 2023-11-27　西岡 芳晴 ( NISHIOKA Yoshiharu )を一部修正
function demTranscoderProtocol(protocol = 'gsi', encoding = 'gsi') {
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
                const r2 = (r < 128) ? r : r - 256;
                const n = r2 * 65536 + g * 256 + b;
                const height = (n === -(2 ** 23) || a !== 255) ? 0 : 0.01 * n;
                const n2 = (height + 10000) * 10;

                data[i] = 0xff & (n2 >> 16);
                data[i + 1] = 0xff & (n2 >> 8);
                data[i + 2] = 0xff & n2;
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