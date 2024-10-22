import maplibregl from "maplibre-gl";
import { showPopupLink, removePopupLink } from "./utils.js";
import { mapViewParameters } from './stores/MapViewParameters.js';
// リンク用カスタムコントロールクラスの定義
export class CustomControl {
    onAdd(map) {
        this.map = map;
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl';
        this.container.textContent = 'Link';
        this.container.title = '他の地図へのリンク';
        this.container.style.backgroundColor = 'white';
        this.container.addEventListener('mouseover', (e) => {
          this.container.style.backgroundColor = 'rgb(240, 240, 240)';
        });
        this.container.addEventListener('mouseout', (e) => {
          this.container.style.backgroundColor = 'white';
        });
        this.container.style.padding = '5px';
        this.container.style.cursor = 'pointer';
        this.container.style.borderRadius = '5px';
        this.container.style.outlineColor = 'rgba(0, 0, 0, 0.1)';
        this.container.style.outlineStyle = 'solid';
        this.container.style.outlineWidth = '2px';
        this.container.style.width = '29px';
        this.container.style.height = '29px';
        this.container.style.display = 'flex';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.boxSizing = 'border-box';
        this.container.addEventListener('click', (e) => {
            const center = map.getCenter();
            const syntheticEvent = {
                lngLat: center,
                point: map.project(center),
                originalEvent: e
            };
            removePopupLink();
            
            // mapViewParametersの値を取得
            let currentMapViewParameters;
            const unsubscribe = mapViewParameters.subscribe(value => {
                currentMapViewParameters = value;
            });
            unsubscribe();

            showPopupLink(syntheticEvent, map, maplibregl, currentMapViewParameters);
        });
  
        return this.container;
      }
      onRemove() {
          this.container.parentNode.removeChild(this.container);
          this.map = undefined;
      }
  }
