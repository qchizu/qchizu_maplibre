import { writable } from 'svelte/store';
export const demSources = writable({
/*         "localhost": {
            name: "localhost",
            tiles: ['http://localhost:8000/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: 'Q地図タイル',
            maxzoom: 19,
            tileSize: 256,
        }, */
        "gsjLand17": {
            name: "産総研陸域(-ZL17)",
            tiles: ['https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png'],
            encoding: "gsj",
            attribution: '<a href="https://gbank.gsj.jp/seamless/elev/" target="_blank">産総研地質調査総合センター</a>',
            maxzoom: 17,
            tileSize: 256,
        },
        "gsjLand19": {
            name: "産総研陸域(-ZL19)",
            tiles: ['https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png'],
            encoding: "gsj",
            attribution: '<a href="https://gbank.gsj.jp/seamless/elev/" target="_blank">産総研地質調査総合センター</a>',
            maxzoom: 19,
            tileSize: 256,
        },
        "qchizuInt18": {
            name: "Q地図統合(-ZL18)",
            tiles: ['https://mapdata.qchizu2.xyz/03_dem/51_int/all_9999/int_01/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_int" target="_blank">Q地図タイル</a>',
            maxzoom: 18,
            tileSize: 256,
        },
        "qchizuInt17": {
            name: "Q地図統合(-ZL17)",
            tiles: ['https://mapdata.qchizu2.xyz/03_dem/51_int/all_9999/int_01/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_int" target="_blank">Q地図タイル</a>',
            maxzoom: 17,
            tileSize: 256,
        },
        "qchizuInt16": {
            name: "Q地図統合(-ZL16)",
            tiles: ['https://mapdata.qchizu2.xyz/03_dem/51_int/all_9999/int_01/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_int" target="_blank">Q地図タイル</a>',
            maxzoom: 16,
            tileSize: 256,
        },
        "qchizuInt15": {
            name: "Q地図統合(-ZL15)",
            tiles: ['https://mapdata.qchizu2.xyz/03_dem/51_int/all_9999/int_01/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_int" target="_blank">Q地図タイル</a>',
            maxzoom: 15,
            tileSize: 256,
        },
        "qchizu1A": {
            name: "Q地図1A(-ZL17)",
            tiles: ['https://mapdata.qchizu2.xyz/03_dem/52_gsi/all_9999/1_01/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_99gsi" target="_blank">Q地図タイル(測量法に基づく国土地理院長承認(使用)R5JHs727)</a>',
            maxzoom: 17,
            tileSize: 256,
        },
        "gsi10B": {
            name: "地理院10B(-ZL14)",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
            maxzoom: 14,
            tileSize: 256,
        },
        "gsi5A": {
            name: "地理院5A(-ZL15)",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
            maxzoom: 15,
            tileSize: 256,
        },
        "gsi5B": {
            name: "地理院5B(-ZL15)",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
            maxzoom: 15,
            tileSize: 256,
        },
        "gsi5C": {
            name: "地理院5C(-ZL15)",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
            maxzoom: 15,
            tileSize: 256,
        },
        "qchizuNoto2024": {
            name: "能登2024(-ZL18)",
            tiles: ['https://mapdata.qchizu2.xyz/03_dem/59_rinya/noto/2024_0pt5_01/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_17p_ishikawa_f" target="_blank">Ｑ地図タイル</a>(<a href="https://www.geospatial.jp/ckan/dataset/2024noto_dem" target="_blank">林野庁・国土地理院</a>)',
            maxzoom: 18,
            tileSize: 256,
        },
        "qchizuNotoE": {
            name: "能登東部(-ZL17)",
            tiles: ['https://mapdata.qchizu.xyz/94dem/17p/ishikawa_f_01_g/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_17p_ishikawa_f" target="_blank">Ｑ地図タイル</a>(<a href="https://www.geospatial.jp/ckan/dataset/aac-disaster-20240101-dem" target="_blank">朝日航洋㈱</a>(<a href="https://www.geospatial.jp/ckan/dataset/2024-notoeast-pc" target="_blank">AIGID</a>(石川県測量成果))使用)',
            maxzoom: 17,
            tileSize: 256,
        },
        "qchizuNotoW": {
            name: "能登西部(-ZL17)",
            tiles: ['https://mapdata.qchizu.xyz/94dem/17p/ishikawa_f_02_g/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.geospatial.jp/ckan/dataset/qchizu_94dem_17p_ishikawa_f" target="_blank">Ｑ地図タイル</a>(<a href="https://www.geospatial.jp/ckan/dataset/2024-notowest-ground" target="_blank">AIGID</a>(石川県測量成果))を使用)',
            maxzoom: 17,
            tileSize: 256,
        },
        "gsiNotoDsm": {
            name: "能登DSM(-ZL15)",
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/20240102noto_1mDSM/{z}/{x}/{y}.png'],
            encoding: "gsj",
            attribution: '<a href="https://www.gsi.go.jp/johofukyu/johofukyu240122_00001.html" target="_blank">国土地理院</a>',
            maxzoom: 15,
            tileSize: 256,
        }
});