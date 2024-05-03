import { readable } from 'svelte/store';
export const mapSources = readable({
    gsi_std: {
        type: "raster",
        tiles: ["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        tileSize: 256,
        maxzoom: 18,
    },
    gsi_pale: {
        type: "raster",
        tiles: ["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        tileSize: 256,
        maxzoom: 18,
    },
    gsi_seamlessphoto: {
        type: "raster",
        tiles: ["https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg"],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
        tileSize: 256,
        maxzoom: 18,
    },
    p17_ishikawa_f_01: {
        type: "raster",
        tiles: ["https://mapdata.qchizu2.xyz/17p/ishikawa_f_01/{z}/{x}/{y}.png"],
        attribution: '<a target="_blank" href="https://info.qchizu.xyz">Q地図タイル</a>(AIGID<a target="_blank"href="https://www.geospatial.jp/ckan/dataset/2024-notoeast-ortho">1</a>、<a target="_blank"href="https://www.geospatial.jp/ckan/dataset/2024-notowest-ortho">2</a>(石川県)複製)',
        tileSize: 256,
        maxzoom: 19,
    },
    ishikawa_cs: {
        type: "raster",
        tiles: ["https://www2.ffpri.go.jp/soilmap/tile/cs_noto/{z}/{x}/{y}.png"],
        attribution: '<a target="_blank" href="https://www.geospatial.jp/ckan/dataset/2024-notowest-mtopo">森林総研</a>(石川県))',
        tileSize: 256,
        maxzoom: 17,
    },
    ishikawa_rrim: {
        type: "raster",
        tiles: ["https://xs489works.xsrv.jp/raster-tiles/pref-ishikawa/notowest-red-tiles/{z}/{x}/{y}.png"],
        attribution: '<a target="_blank" href="https://github.com/shi-works/noto-hanto-earthquake-2024-notowest-3d-terrain-map-on-maplibre-gl-js">shi-works</a>(<a target="_blank"href="https://www.geospatial.jp/ckan/dataset/2024-notowest-mtopo">AIGID</a>(石川県))',
        tileSize: 256,
        maxzoom: 18,
    },
});