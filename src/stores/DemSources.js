import { writable } from 'svelte/store';
export const demSources = writable({
        "gsjMixed": {
            name: "産総研統合",
            tiles: ['https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png'],
            encoding: "gsj",
            attribution: '<a href="https://gbank.gsj.jp/seamless/elev/" target="_blank">産総研地質調査総合センター</a>',
            maxzoom: 17,
            tileSize: 256,
        },
        "gsi10B": {
            name: "地理院10B",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
            maxzoom: 14,
            tileSize: 256,
        },
        "qchizu5A": {
            name: "Q地図5A",
            tiles: ['https://mapdata.qchizu.xyz/94dem/99gsi/5A/01_g/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_99gsi" target="_blank">Q地図タイル(測量法に基づく国土地理院長承認(使用)R5JHs727)</a>',
            maxzoom: 15,
            tileSize: 256,
        },
        "gsi5A": {
            name: "地理院5A",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
            maxzoom: 15,
            tileSize: 256,
        },
        "gsi5B": {
            name: "地理院5B",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
            maxzoom: 15,
            tileSize: 256,
        },
        "gsi5C": {
            name: "地理院5C",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
            maxzoom: 15,
            tileSize: 256,
        },
        "qchizu1A": {
            name: "Q地図1A",
            tiles: ['https://mapdata.qchizu.xyz/94dem/99gsi/1A/01_g/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_99gsi" target="_blank">Q地図タイル(測量法に基づく国土地理院長承認(使用)R5JHs727)</a>',
            maxzoom: 17,
            tileSize: 256,
        },
        "gsiNotoDsm": {
            name: "能登DSM",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/20240102noto_1mDSM/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.gsi.go.jp/johofukyu/johofukyu240122_00001.html" target="_blank">国土地理院</a>',
            maxzoom: 15,
            tileSize: 256,
        },
        "qchizuNotoE": {
            name: "能登東部",
            tiles: ['https://mapdata.qchizu.xyz/94dem/17p/ishikawa_f_01_g/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_17p_ishikawa_f" target="_blank">Ｑ地図タイル</a>(<a href="https://www.geospatial.jp/ckan/dataset/aac-disaster-20240101-dem" target="_blank">朝日航洋㈱</a>(<a href="https://www.geospatial.jp/ckan/dataset/2024-notoeast-pc" target="_blank">AIGID</a>(石川県測量成果))使用)',
            maxzoom: 17,
            tileSize: 256,
        },
        "qchizuNotoW": {
            name: "能登西部",
            tiles: ['https://mapdata.qchizu.xyz/94dem/17p/ishikawa_f_02_g/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_17p_ishikawa_f" target="_blank">Ｑ地図タイル</a>(<a href="https://www.geospatial.jp/ckan/dataset/2024-notowest-ground" target="_blank">AIGID</a>(石川県測量成果))を使用)',
            maxzoom: 17,
            tileSize: 256,
        },
});