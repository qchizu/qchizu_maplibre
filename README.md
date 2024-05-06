# 全国Ｑ地図MapLibre版

このページでは、主に技術的な情報を記載しています。使用方法など、一般利用者向けの情報は、以下のURLで公開しています。
https://info.qchizu.xyz/qchizu/maplibre_terrain/

## 概要
オープンソースの地図ライブラリであるMapLibre GL JSを使った「全国Ｑ地図MapLibre版」は、2024年1月7日に公開を開始し、現在、地形表示に特化して順次、機能追加を進めています。

URL（地図ページ）
https://maps.qchizu.xyz/maplibre

URL（紹介ページ）
https://info.qchizu.xyz/qchizu/maplibre_terrain/

## 開発の背景
地理院地図をベースに開発した全国Ｑ地図（通常版）では、独自にタイル化したラスタータイルの地形図を中心に公開を行っていますが、地形の立体表示や大量のベクトルデータの表示は困難でした。
そこで、これらのデータの表示・公開のため、オープンソースの地図ライブラリであるMapLibre GL JSを使った全国Ｑ地図MapLibre版を開発し公開しました。

## できること
航空レーザによる詳細な標高データを使って、様々な地形表現ができるため、とにかく地形がよく分かります。

### 1. 地形を立体的に表示できます
地形の立体表示と平面表示を切り替えられます。

### 2. 等高線や段彩図、陰影図、傾斜量図を表示できます
標高データから等高線や段彩図、陰影図、傾斜量図を生成して表示できます。

### 3. 地形表現に利用する標高データの切り替えが可能です
立体的表示や等高線などの表示に利用する標高データの切り替えが可能です。

## ファイル構成

JavaScriptのフレームワークとして、Svelteを利用しています。

### ルートディレクトリ
- `.gitignore` : gitの追跡対象外とするファイル/ディレクトリを指定
- `index.html` : サイトのエントリーポイントとなるHTMLファイル
- `package.json` : プロジェクトの依存関係やスクリプトを管理
- `README.md` : 本ファイル。プロジェクトの説明や構成を記載
- `vite.config.js` : Viteの設定ファイル

### src/
- `App.svelte` : SvelteのルートコンポーネントファイルApp
- `Button.svelte` : ボタンのSvelteコンポーネント
- `main.js` : Svelteアプリのエントリーポイント。App.svelteをマウントする
- `Map.svelte` : 地図を表示するSvelteコンポーネント
- `Sidebar.svelte` : サイドバーを表示するSvelteコンポーネント
- `utils.js` : 描画を更新する関数を定義

### src/protocols/
- `dem2ReliefProtocol.js` : DEMデータから段彩図を作成するプロトコル
- `dem2SlopeProtocol.js` : DEMデータから傾斜量図を作成するプロトコル
- `demTranscoderProtocol.js` : DEMデータの形式を変換（gsj→mapbox）するプロトコル
- `protocolUtils.js` : protocolから共通して利用する関数を定義

### src/stores/
- `MapSources.js` : 地図のソースを定義
- `MapLayers.js` : 地図のレイヤーを定義
- `MapViewParameters.js` : 地図表示のパラメーター（中心座標、ズームレベルなど）を管理するストア 
- `Pitch.js` : 地図の傾きを管理するストア
- `SelectedBaseLayer.js` : 選択されたベースマップレイヤーを管理するストア
- `SelectedDemSource.js` : 選択されたDEMソースを管理するストア
- `SelectedOverLayers.js` : 選択されたオーバーレイレイヤーを管理するストア
- `DemSources.js` : DEMソースの定義

### public/
- `layer_map.png` : 地図ボタンで使用する画像

## 動作の仕組み

### PNG標高タイル（産総研、国土地理院方式の標高タイル）の利用
PNG標高タイルは、0.01mの標高分解能で-83,886.07～83,886.07mまでの範囲を表現可能で、無効値も明確に定義されている[^1]という点で優れた規格ですが、MapLibre GL JSではサポートされていません。
そこで、本サイトでは、MapLibre GL JSのaddProtocolという仕組み[^2]を利用して、タイルをmapbox形式に変換しています。具体的には、自作のprotocol（demTranscoderProtocol.js）で変換し、立体表示と陰影表示に利用しています。

### 立体表示、陰影表示
MapLibre GL JSの機能[^3]を利用しています。

### 等高線
maplibre-contourという等高線を表示できるプラグイン[^4]を一部改良して、PNG標高タイルを処理できるようにして利用しています。
改良したプラグインは、maplibre-contour-adding-PNG-Elevation-Tileという名前でGitHubで公開しています[^5]。

### 段彩図
MapLibre GL JSのaddProtocolを利用して、標高タイルから標高値を計算し、標高値に応じて塗り分けて表示しています。

### 傾斜量図
MapLibre GL JSのaddProtocolを利用して、標高タイルから標高値を計算し、さらに隣接するピクセルの標高値から傾斜量を計算し、傾斜量に応じて塗り分けて表示しています。
なお、addProtocolは、タイルを１枚ごとに変換する仕組みですが、傾斜量図を作成するprotocolは、隣接するタイル（具体的には右、右下、下のタイル）をあわせて読み込んで処理するようにしています。これは、隣接するピクセル（具体的には右、右下、下のピクセル）の標高値を用いて計算する傾斜量図を、タイル境界によらずシームレスに表示するためです。

## 標高タイル
本サイトでは、国土地理院、産総研が配信している標高タイルに加えて、独自に作成した以下の標高タイルを利用しています。

### Q地図5A、Q地図1A
国土地理院の基盤地図情報（標高）を加工したものです。なお、国土地理院から測量成果の使用承認を受けています。
作成手順
1. 株式会社エコリスの「基盤地図情報 標高DEMデータ変換ツール」を用いてJPGIS(GML)形式をGeoTIFF形式に変換。
2. Pythonを用いた自作プログラムでRGBの画像に変換。
3. gdal2tilesでタイルに変換。

### 能登東部
朝日航洋株式会社が公開するGeoTIFF形式の標高データを加工したものです。
作成手順は、上記2～3と同じです。

### 能登西部
G空間情報センターが公開するグランドデータを加工したものです。
作成手順
1. GMTを用いてグランドデータからTIN（不整三角モデル）によりグリッドデータ（GeoTIFF形式）を作成。

以降は、上記1～3と同じです。

なお、これらの標高タイルの詳細は、G空間情報センターのページで公開しており[^6]、他のウェブサイトから利用することも可能です。

## 今後の開発計画

### CS立体図
feature/dem2CsmapProtocolブランチで、標高タイルからCS立体図を作成するaddProtocolの作成作業中です。

[^1]:国土地理院の資料に分かりやすい記載があります。
令和２年度調査研究年報[「3次元地図データをウェブ地図に表示するための技術的検討」](https://www.gsi.go.jp/common/000235797.pdf)

[^2]:https://maplibre.org/maplibre-gl-js/docs/API/functions/addProtocol/

[^3]:https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/

[^4]:https://github.com/onthegomap/maplibre-contour

[^5]:https://github.com/qchizu/maplibre-contour-adding-PNG-Elevation-Tile

[^6]:基盤地図情報1m・5mメッシュDEM　標高データ（PNG標高タイル） https://www.geospatial.jp/ckan/dataset/qchizu_94dem_99gsi
石川県能登地方　標高データ（PNG標高タイル） https://www.geospatial.jp/ckan/dataset/qchizu_94dem_17p_ishikawa_f
