// numPngProtocol.js, 2023-11-27　西岡 芳晴 ( NISHIOKA Yoshiharu )
function makeNumPngProtocol( protocol = 'numpng', 
		factor = 0.01, invalidValue = -( 2 ** 23 ) ){
	return ( params, callback ) => {
	    const image = new Image();

	    image.crossOrigin = 'anonymous';
	    image.onload = function(){
	        const canvas = document.createElement( 'canvas' );
	        const ctx = canvas.getContext( '2d' );

	        canvas.width = image.width;
	        canvas.height = image.height;
	        ctx.drawImage( image, 0, 0 );
	        const imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );
	        for ( let i = 0; i < imageData.data.length; i += 4 ) {
				const [ r, g, b, a ] = imageData.data.slice( i, i + 4 );
				const r2 = ( r < 128 ) ? r : r - 256;
				const n = r2 * 65536 + g * 256 + b;
				const height = ( n == invalidValue || a !== 255 ) ? 0 : factor * n;
				const n2 = ( height + 10000 ) * 10;

	            imageData.data.set( [ 0xff & n2 >> 16, 0xff & n2 >> 8, 0xff & n2, 255 ], i );
	        }
	        ctx.putImageData( imageData, 0, 0 );
	        canvas.toBlob( async blob => {
	        	callback( null, await blob.arrayBuffer(), null, null );
	        } );
	    };
	    image.src = params.url.replace( protocol + '://', 'https://' );
	    return { cancel: _ => {} };
	}
};

export { makeNumPngProtocol };
	
