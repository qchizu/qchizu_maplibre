import { readable } from 'svelte/store';
export const mapLayers = readable([
    {
        id: "gsi_std",
        type: "raster",
        source: "gsi_std",
        layout: {
            visibility: "none",
        },
    },
    {
        id: "gsi_pale",
        type: "raster",
        source: "gsi_pale",
        layout: {
            visibility: "none",
        },
    },
    {
        id: "gsi_seamlessphoto",
        type: "raster",
        source: "gsi_seamlessphoto",
        layout: {
            visibility: "none",
        },
    },
    {
        id: "open_street_map",
        type: "raster",
        source: "open_street_map",
        layout: {
            visibility: "none",
        },
    },
    //白い背景　レイヤーがないと地形の立体表示時に表示が乱れる
    {
        id: "white-background",
        type: "background",
        paint: {
            "background-color": "#ffffff",
        },
        layout: {
            visibility: "none",
        },
    },
    {
        id: "p17_ishikawa_f_01",
        type: "raster",
        source: "p17_ishikawa_f_01",
        layout: {
            visibility: "none",
        },
    },
    {
        id: "ishikawa_cs",
        type: "raster",
        source: "ishikawa_cs",
        layout: {
            visibility: "none",
        },
    },
    {
        id: "ishikawa_rrim",
        type: "raster",
        source: "ishikawa_rrim",
        layout: {
            visibility: "none",
        },
    },
])