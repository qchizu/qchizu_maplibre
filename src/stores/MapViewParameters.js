import { writable } from 'svelte/store';
export const mapViewParameters = writable({
    zoom: 5,
    lng: 140.08,
    lat: 36.10,
    bearing: 0,
    pitch: 0,
    cameraLng: 140.08, 
    cameraLat: 36.1, 
    cameraAltitude: 0.00,
    targetAltitude: 0.00,
    bearing360: 0.0,
});