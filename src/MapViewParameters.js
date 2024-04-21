import { writable } from 'svelte/store';
export const mapViewParameters = writable({
    zoom: 5,
    lat: 36.1,
    lon: 140.08,
    bearing: 0,
    pitch: 0
});