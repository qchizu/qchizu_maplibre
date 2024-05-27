import { writable } from 'svelte/store';
export const CsParameters = writable({
    terrainScale: 1,
    redAndBlueIntensity: 1,
});