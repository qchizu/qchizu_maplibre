/*
https://github.com/onthegomap/maplibre-contour
https://unpkg.com/maplibre-contour@0.0.4/dist/index.js　からダウンロードし、一部改変
変更箇所は★でコメント（encoding gsi）
*/
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.mlcontour = factory());
})(this, (function () { 'use strict';

  /* eslint-disable */

  var shared, worker, mlcontour;
  // define gets called three times: one for each chunk. we rely on the order
  // they're imported to know which is which
  function define(_, chunk) {
    if (!shared) {
      shared = chunk;
    } else if (!worker) {
      worker = chunk;
    } else {
      var workerBundleString =
        "var sharedChunk = {}; (" +
        shared +
        ")(sharedChunk); (" +
        worker +
        ")(sharedChunk);";

      var sharedChunk = {};
      shared(sharedChunk);
      mlcontour = chunk(sharedChunk);
      if (typeof window !== "undefined") {
        mlcontour.workerUrl = window.URL.createObjectURL(
          new Blob([workerBundleString], { type: "text/javascript" })
        );
      }
    }
  }


  define(['exports'], (function (exports) { 'use strict';

  /*
  Adapted from d3-contour https://github.com/d3/d3-contour

  Copyright 2012-2023 Mike Bostock

  Permission to use, copy, modify, and/or distribute this software for any purpose
  with or without fee is hereby granted, provided that the above copyright notice
  and this permission notice appear in all copies.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
  FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
  OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
  TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
  THIS SOFTWARE.
  */
  class Fragment {
      constructor(start, end) {
          this.start = start;
          this.end = end;
          this.points = [];
          this.append = this.append.bind(this);
          this.prepend = this.prepend.bind(this);
      }
      append(x, y) {
          this.points.push(Math.round(x), Math.round(y));
      }
      prepend(x, y) {
          this.points.splice(0, 0, Math.round(x), Math.round(y));
      }
      lineString() {
          return this.toArray();
      }
      isEmpty() {
          return this.points.length < 2;
      }
      appendFragment(other) {
          this.points.push(...other.points);
          this.end = other.end;
      }
      toArray() {
          return this.points;
      }
  }
  const CASES = [
      [],
      [
          [
              [1, 2],
              [0, 1],
          ],
      ],
      [
          [
              [2, 1],
              [1, 2],
          ],
      ],
      [
          [
              [2, 1],
              [0, 1],
          ],
      ],
      [
          [
              [1, 0],
              [2, 1],
          ],
      ],
      [
          [
              [1, 2],
              [0, 1],
          ],
          [
              [1, 0],
              [2, 1],
          ],
      ],
      [
          [
              [1, 0],
              [1, 2],
          ],
      ],
      [
          [
              [1, 0],
              [0, 1],
          ],
      ],
      [
          [
              [0, 1],
              [1, 0],
          ],
      ],
      [
          [
              [1, 2],
              [1, 0],
          ],
      ],
      [
          [
              [0, 1],
              [1, 0],
          ],
          [
              [2, 1],
              [1, 2],
          ],
      ],
      [
          [
              [2, 1],
              [1, 0],
          ],
      ],
      [
          [
              [0, 1],
              [2, 1],
          ],
      ],
      [
          [
              [1, 2],
              [2, 1],
          ],
      ],
      [
          [
              [0, 1],
              [1, 2],
          ],
      ],
      [],
  ];
  function index(width, x, y, point) {
      x = x * 2 + point[0];
      y = y * 2 + point[1];
      return x + y * (width + 1) * 2;
  }
  function ratio(a, b, c) {
      return (b - a) / (c - a);
  }
  /**
   * Generates contour lines from a HeightTile
   *
   * @param interval Vertical distance between contours
   * @param tile The input height tile, where values represent the height at the top-left of each pixel
   * @param extent Vector tile extent (default 4096)
   * @param buffer How many pixels into each neighboring tile to include in a tile
   * @returns an object where keys are the elevation, and values are a list of `[x1, y1, x2, y2, ...]`
   * contour lines in tile coordinates
   */
  function generateIsolines(interval, tile, extent = 4096, buffer = 1) {
      if (!interval) {
          return {};
      }
      const multiplier = extent / (tile.width - 1);
      let tld, trd, bld, brd;
      let r, c;
      const segments = {};
      const fragmentByStartByLevel = new Map();
      const fragmentByEndByLevel = new Map();
      function interpolate(point, threshold, accept) {
          if (point[0] === 0) {
              // left
              accept(multiplier * (c - 1), multiplier * (r - ratio(bld, threshold, tld)));
          }
          else if (point[0] === 2) {
              // right
              accept(multiplier * c, multiplier * (r - ratio(brd, threshold, trd)));
          }
          else if (point[1] === 0) {
              // top
              accept(multiplier * (c - ratio(trd, threshold, tld)), multiplier * (r - 1));
          }
          else {
              // bottom
              accept(multiplier * (c - ratio(brd, threshold, bld)), multiplier * r);
          }
      }
      // Most marching-squares implementations (d3-contour, gdal-contour) make one pass through the matrix per threshold.
      // This implementation makes a single pass through the matrix, building up all of the contour lines at the
      // same time to improve performance.
      for (r = 1 - buffer; r < tile.height + buffer; r++) {
          trd = tile.get(0, r - 1);
          brd = tile.get(0, r);
          let minR = Math.min(trd, brd);
          let maxR = Math.max(trd, brd);
          for (c = 1 - buffer; c < tile.width + buffer; c++) {
              tld = trd;
              bld = brd;
              trd = tile.get(c, r - 1);
              brd = tile.get(c, r);
              const minL = minR;
              const maxL = maxR;
              minR = Math.min(trd, brd);
              maxR = Math.max(trd, brd);
              if (isNaN(tld) || isNaN(trd) || isNaN(brd) || isNaN(bld)) {
                  continue;
              }
              const min = Math.min(minL, minR);
              const max = Math.max(maxL, maxR);
              const start = Math.ceil(min / interval) * interval;
              const end = Math.floor(max / interval) * interval;
              for (let threshold = start; threshold <= end; threshold += interval) {
                  const tl = tld > threshold;
                  const tr = trd > threshold;
                  const bl = bld > threshold;
                  const br = brd > threshold;
                  for (const segment of CASES[(tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0)]) {
                      let fragmentByStart = fragmentByStartByLevel.get(threshold);
                      if (!fragmentByStart)
                          fragmentByStartByLevel.set(threshold, (fragmentByStart = new Map()));
                      let fragmentByEnd = fragmentByEndByLevel.get(threshold);
                      if (!fragmentByEnd)
                          fragmentByEndByLevel.set(threshold, (fragmentByEnd = new Map()));
                      const start = segment[0];
                      const end = segment[1];
                      const startIndex = index(tile.width, c, r, start);
                      const endIndex = index(tile.width, c, r, end);
                      let f, g;
                      if ((f = fragmentByEnd.get(startIndex))) {
                          fragmentByEnd.delete(startIndex);
                          if ((g = fragmentByStart.get(endIndex))) {
                              fragmentByStart.delete(endIndex);
                              if (f === g) {
                                  // closing a ring
                                  interpolate(end, threshold, f.append);
                                  if (!f.isEmpty()) {
                                      let list = segments[threshold];
                                      if (!list) {
                                          segments[threshold] = list = [];
                                      }
                                      list.push(f.lineString());
                                  }
                              }
                              else {
                                  // connecting 2 segments
                                  f.appendFragment(g);
                                  fragmentByEnd.set((f.end = g.end), f);
                              }
                          }
                          else {
                              // adding to the end of f
                              interpolate(end, threshold, f.append);
                              fragmentByEnd.set((f.end = endIndex), f);
                          }
                      }
                      else if ((f = fragmentByStart.get(endIndex))) {
                          fragmentByStart.delete(endIndex);
                          // extending the start of f
                          interpolate(start, threshold, f.prepend);
                          fragmentByStart.set((f.start = startIndex), f);
                      }
                      else {
                          // starting a new fragment
                          const newFrag = new Fragment(startIndex, endIndex);
                          interpolate(start, threshold, newFrag.append);
                          interpolate(end, threshold, newFrag.append);
                          fragmentByStart.set(startIndex, newFrag);
                          fragmentByEnd.set(endIndex, newFrag);
                      }
                  }
              }
          }
      }
      for (const [level, fragmentByStart] of fragmentByStartByLevel.entries()) {
          let list = null;
          for (const value of fragmentByStart.values()) {
              if (!value.isEmpty()) {
                  if (list == null) {
                      list = segments[level] || (segments[level] = []);
                  }
                  list.push(value.lineString());
              }
          }
      }
      return segments;
  }

  let num = 0;
  /**
   * LRU Cache for CancelablePromises.
   * The underlying request is only canceled when all callers have canceled their usage of it.
   */
  class AsyncCache {
      constructor(maxSize = 100) {
          this.size = () => this.items.size;
          this.get = (key, supplier) => this.getCancelable(key, (key) => ({
              value: supplier(key),
              cancel: () => { },
          })).value;
          this.getCancelable = (key, supplier) => {
              let result = this.items.get(key);
              if (!result) {
                  const value = supplier(key);
                  result = {
                      cancel: value.cancel,
                      item: value.value,
                      lastUsed: ++num,
                      waiting: 1,
                  };
                  this.items.set(key, result);
                  this.prune();
              }
              else {
                  result.lastUsed = ++num;
                  result.waiting++;
              }
              const items = this.items;
              const value = result.item.then((r) => r, (e) => {
                  items.delete(key);
                  return Promise.reject(e);
              });
              let canceled = false;
              return {
                  value,
                  cancel: () => {
                      if (result && result.cancel && !canceled) {
                          canceled = true;
                          if (--result.waiting <= 0) {
                              result.cancel();
                              items.delete(key);
                          }
                      }
                  },
              };
          };
          this.clear = () => this.items.clear();
          this.maxSize = maxSize;
          this.items = new Map();
      }
      prune() {
          if (this.items.size > this.maxSize) {
              let minKey;
              let minUse = Infinity;
              this.items.forEach((value, key) => {
                  if (value.lastUsed < minUse) {
                      minUse = value.lastUsed;
                      minKey = key;
                  }
              });
              if (typeof minKey !== "undefined") {
                  this.items.delete(minKey);
              }
          }
      }
  }

  function sortedEntries(object) {
      const entries = Object.entries(object);
      entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return entries;
  }
  function encodeThresholds(thresholds) {
      return sortedEntries(thresholds)
          .map(([key, value]) => [key, ...(typeof value === "number" ? [value] : value)].join("*"))
          .join("~");
  }
  function decodeThresholds(thresholds) {
      return Object.fromEntries(thresholds
          .split("~")
          .map((part) => part.split("*").map(Number))
          .map(([key, ...values]) => [key, values]));
  }
  function encodeOptions({ thresholds, ...rest }) {
      return sortedEntries({ thresholds: encodeThresholds(thresholds), ...rest })
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join("&");
  }
  function decodeOptions(options) {
      return Object.fromEntries(options
          .replace(/^.*\?/, "")
          .split("&")
          .map((part) => {
          const parts = part.split("=").map(decodeURIComponent);
          const k = parts[0];
          let v = parts[1];
          switch (k) {
              case "thresholds":
                  v = decodeThresholds(v);
                  break;
              case "extent":
              case "multiplier":
              case "overzoom":
              case "buffer":
                  v = Number(v);
          }
          return [k, v];
      }));
  }
  function encodeIndividualOptions(options) {
      return sortedEntries(options)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join(",");
  }
  function getOptionsForZoom(options, zoom) {
      const { thresholds, ...rest } = options;
      let levels = [];
      let maxLessThanOrEqualTo = -Infinity;
      Object.entries(thresholds).forEach(([zString, value]) => {
          const z = Number(zString);
          if (z <= zoom && z > maxLessThanOrEqualTo) {
              maxLessThanOrEqualTo = z;
              levels = typeof value === "number" ? [value] : value;
          }
      });
      return {
          levels,
          ...rest,
      };
  }
  function map({ cancel, value }, mapper) {
      return { cancel, value: value.then(mapper) };
  }
  function copy(src) {
      const dst = new ArrayBuffer(src.byteLength);
      new Uint8Array(dst).set(new Uint8Array(src));
      return dst;
  }
  function prepareDemTile(promise, copy) {
      return map(promise, ({ data, ...rest }) => {
          let newData = data;
          if (copy) {
              newData = new Float32Array(data.length);
              newData.set(data);
          }
          return { ...rest, data: newData, transferrables: [newData.buffer] };
      });
  }
  function prepareContourTile(promise) {
      return map(promise, ({ arrayBuffer }) => {
          const clone = copy(arrayBuffer);
          return {
              arrayBuffer: clone,
              transferrables: [clone],
          };
      });
  }
  let supportsOffscreenCanvas = null;
  function offscreenCanvasSupported() {
      if (supportsOffscreenCanvas == null) {
          supportsOffscreenCanvas =
              typeof OffscreenCanvas !== "undefined" &&
                  new OffscreenCanvas(1, 1).getContext("2d") &&
                  typeof createImageBitmap === "function";
      }
      return supportsOffscreenCanvas || false;
  }
  let useVideoFrame = null;
  function shouldUseVideoFrame() {
      if (useVideoFrame == null) {
          useVideoFrame = false;
          // if webcodec is supported, AND if the browser mangles getImageData results
          // (ie. safari with increased privacy protections) then use webcodec VideoFrame API
          if (offscreenCanvasSupported() && typeof VideoFrame !== "undefined") {
              const size = 5;
              const canvas = new OffscreenCanvas(5, 5);
              const context = canvas.getContext("2d", { willReadFrequently: true });
              if (context) {
                  for (let i = 0; i < size * size; i++) {
                      const base = i * 4;
                      context.fillStyle = `rgb(${base},${base + 1},${base + 2})`;
                      context.fillRect(i % size, Math.floor(i / size), 1, 1);
                  }
                  const data = context.getImageData(0, 0, size, size).data;
                  for (let i = 0; i < size * size * 4; i++) {
                      if (i % 4 !== 3 && data[i] !== i) {
                          useVideoFrame = true;
                          break;
                      }
                  }
              }
          }
      }
      return useVideoFrame || false;
  }
  function withTimeout(timeoutMs, { value, cancel }) {
      let reject = () => { };
      const timeout = setTimeout(() => {
          cancel();
          reject(new Error("timed out"));
      }, timeoutMs);
      const cancelPromise = new Promise((_, rej) => {
          reject = rej;
      });
      return {
          value: Promise.race([
              cancelPromise,
              (async () => {
                  try {
                      return await value;
                  }
                  finally {
                      clearTimeout(timeout);
                  }
              })(),
          ]),
          cancel: () => {
              clearTimeout(timeout);
              cancel();
          },
      };
  }

  let offscreenCanvas;
  let offscreenContext;
  let canvas;
  let canvasContext;
  /**
   * Parses a `raster-dem` image into a DemTile using Webcoded VideoFrame API.
   */
  function decodeImageModern(blob, encoding) {
      let canceled = false;
      const promise = createImageBitmap(blob).then((img) => {
          if (canceled)
              return null;
          return decodeImageUsingOffscreenCanvas(img, encoding);
      });
      return {
          value: promise,
          cancel: () => {
              canceled = true;
          },
      };
  }
  function decodeImageUsingOffscreenCanvas(img, encoding) {
      if (!offscreenCanvas) {
          offscreenCanvas = new OffscreenCanvas(img.width, img.height);
          offscreenContext = offscreenCanvas.getContext("2d", {
              willReadFrequently: true,
          });
      }
      return getElevations(img, encoding, offscreenCanvas, offscreenContext);
  }
  /**
   * Parses a `raster-dem` image into a DemTile using webcodec VideoFrame API which works
   * even when browsers disable/degrade the canvas getImageData API as a privacy protection.
   */
  function decodeImageVideoFrame(blob, encoding) {
      let canceled = false;
      const promise = createImageBitmap(blob).then(async (img) => {
          var _a, _b, _c;
          if (canceled)
              return null;
          const vf = new VideoFrame(img, { timestamp: 0 });
          try {
              // formats we can handle: BGRX, BGRA, RGBA, RGBX
              const valid = ((_a = vf === null || vf === void 0 ? void 0 : vf.format) === null || _a === void 0 ? void 0 : _a.startsWith("BGR")) || ((_b = vf === null || vf === void 0 ? void 0 : vf.format) === null || _b === void 0 ? void 0 : _b.startsWith("RGB"));
              if (!valid) {
                  throw new Error(`Unrecognized format: ${vf === null || vf === void 0 ? void 0 : vf.format}`);
              }
              const swapBR = (_c = vf === null || vf === void 0 ? void 0 : vf.format) === null || _c === void 0 ? void 0 : _c.startsWith("BGR");
              const size = vf.allocationSize();
              const data = new Uint8ClampedArray(size);
              await vf.copyTo(data);
              if (swapBR) {
                  for (let i = 0; i < data.length; i += 4) {
                      const tmp = data[i];
                      data[i] = data[i + 2];
                      data[i + 2] = tmp;
                  }
              }
              return decodeParsedImage(img.width, img.height, encoding, data);
          }
          catch (e) {
              if (canceled)
                  return null;
              // fall back to offscreen canvas
              return decodeImageUsingOffscreenCanvas(img, encoding);
          }
          finally {
              vf.close();
          }
      });
      return {
          value: promise,
          cancel: () => {
              canceled = true;
          },
      };
  }
  /**
   * Parses a `raster-dem` image into a DemTile using `<img>` element drawn to a `<canvas>`.
   * Only works on the main thread, but works across all browsers.
   */
  function decodeImageOld(blob, encoding) {
      if (!canvas) {
          canvas = document.createElement("canvas");
          canvasContext = canvas.getContext("2d", {
              willReadFrequently: true,
          });
      }
      let canceled = false;
      const img = new Image();
      const value = new Promise((resolve, reject) => {
          img.onload = () => {
              if (!canceled)
                  resolve(img);
              URL.revokeObjectURL(img.src);
              img.onload = null;
          };
          img.onerror = () => reject(new Error("Could not load image."));
          img.src = blob.size ? URL.createObjectURL(blob) : "";
      }).then((img) => getElevations(img, encoding, canvas, canvasContext));
      return {
          value,
          cancel: () => {
              canceled = true;
              img.src = "";
          },
      };
  }
  /**
   * Parses a `raster-dem` image in a worker that doesn't support OffscreenCanvas and createImageBitmap
   * by running decodeImageOld on the main thread and returning the result.
   */
  function decodeImageOnMainThread(blob, encoding) {
      return self.actor.send("decodeImage", [], undefined, blob, encoding);
  }
  function isWorker() {
      return (
      // @ts-ignore
      typeof WorkerGlobalScope !== "undefined" &&
          typeof self !== "undefined" &&
          // @ts-ignore
          self instanceof WorkerGlobalScope);
  }
  const defaultDecoder = shouldUseVideoFrame()
      ? decodeImageVideoFrame
      : offscreenCanvasSupported()
          ? decodeImageModern
          : isWorker()
              ? decodeImageOnMainThread
              : decodeImageOld;
  function getElevations(img, encoding, canvas, canvasContext) {
      canvas.width = img.width;
      canvas.height = img.height;
      if (!canvasContext)
          throw new Error("failed to get context");
      canvasContext.drawImage(img, 0, 0, img.width, img.height);
      const rgba = canvasContext.getImageData(0, 0, img.width, img.height).data;
      return decodeParsedImage(img.width, img.height, encoding, rgba);
  }
  function decodeParsedImage(width, height, encoding, input) {
      let decoder; //★変更箇所　encodingにgsiを追加
      if (encoding === "mapbox") {
          decoder = (r, g, b) => -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
      } else if (encoding === "gsi") {
        decoder = (r, g, b) => {
            const gsiX = r * 256 * 256 + g * 256 + b;
            if (gsiX === 2 ** 23) return 0;
            return gsiX > 2 ** 23 ? (gsiX - 2 ** 24) * 0.01 : gsiX * 0.01;
        };
      } else {
          decoder = (r, g, b) => r * 256 + g + b / 256 - 32768;
      }
      const data = new Float32Array(width * height);
      for (let i = 0; i < input.length; i += 4) {
          data[i / 4] = decoder(input[i], input[i + 1], input[i + 2]);
      }
      return { width, height, data };
  }

  const MIN_VALID_M = -12000;
  const MAX_VALID_M = 9000;
  function defaultIsValid(number) {
      return !isNaN(number) && number >= MIN_VALID_M && number <= MAX_VALID_M;
  }
  /** A tile containing elevation values aligned to a grid. */
  class HeightTile {
      constructor(width, height, get) {
          /**
           * Splits this tile into a `1<<subz` x `1<<subz` grid and returns the tile at coordinates `subx, suby`.
           */
          this.split = (subz, subx, suby) => {
              if (subz === 0)
                  return this;
              const by = 1 << subz;
              const dx = (subx * this.width) / by;
              const dy = (suby * this.height) / by;
              return new HeightTile(this.width / by, this.height / by, (x, y) => this.get(x + dx, y + dy));
          };
          /**
           * Returns a new tile scaled up by `factor` with pixel values that are subsampled using
           * bilinear interpolation between the original height tile values.
           *
           * The original and result tile are assumed to represent values taken at the center of each pixel.
           */
          this.subsamplePixelCenters = (factor) => {
              const lerp = (a, b, f) => isNaN(a) ? b : isNaN(b) ? a : a + (b - a) * f;
              if (factor <= 1)
                  return this;
              const sub = 0.5 - 1 / (2 * factor);
              const blerper = (x, y) => {
                  const dx = x / factor - sub;
                  const dy = y / factor - sub;
                  const ox = Math.floor(dx);
                  const oy = Math.floor(dy);
                  const a = this.get(ox, oy);
                  const b = this.get(ox + 1, oy);
                  const c = this.get(ox, oy + 1);
                  const d = this.get(ox + 1, oy + 1);
                  const fx = dx - ox;
                  const fy = dy - oy;
                  const top = lerp(a, b, fx);
                  const bottom = lerp(c, d, fx);
                  return lerp(top, bottom, fy);
              };
              return new HeightTile(this.width * factor, this.height * factor, blerper);
          };
          /**
           * Assumes the input tile represented measurements taken at the center of each pixel, and
           * returns a new tile where values are the height at the top-left of each pixel by averaging
           * the 4 adjacent pixel values.
           */
          this.averagePixelCentersToGrid = (radius = 1) => new HeightTile(this.width + 1, this.height + 1, (x, y) => {
              let sum = 0, count = 0, v = 0;
              for (let newX = x - radius; newX < x + radius; newX++) {
                  for (let newY = y - radius; newY < y + radius; newY++) {
                      if (!isNaN((v = this.get(newX, newY)))) {
                          count++;
                          sum += v;
                      }
                  }
              }
              return count === 0 ? NaN : sum / count;
          });
          /** Returns a new tile with elevation values scaled by `multiplier`. */
          this.scaleElevation = (multiplier) => multiplier === 1
              ? this
              : new HeightTile(this.width, this.height, (x, y) => this.get(x, y) * multiplier);
          /**
           * Precompute every value from `-bufer, -buffer` to `width + buffer, height + buffer` and serve them
           * out of a `Float32Array`. Until this method is called, all `get` requests are lazy and call all previous
           * methods in the chain up to the root DEM tile.
           */
          this.materialize = (buffer = 2) => {
              const stride = this.width + 2 * buffer;
              const data = new Float32Array(stride * (this.height + 2 * buffer));
              let idx = 0;
              for (let y = -buffer; y < this.height + buffer; y++) {
                  for (let x = -buffer; x < this.width + buffer; x++) {
                      data[idx++] = this.get(x, y);
                  }
              }
              return new HeightTile(this.width, this.height, (x, y) => data[(y + buffer) * stride + x + buffer]);
          };
          this.get = get;
          this.width = width;
          this.height = height;
      }
      /** Construct a height tile from raw DEM pixel values */
      static fromRawDem(demTile) {
          return new HeightTile(demTile.width, demTile.height, (x, y) => {
              const value = demTile.data[y * demTile.width + x];
              return defaultIsValid(value) ? value : NaN;
          });
      }
      /**
       * Construct a height tile from a DEM tile plus it's 8 neighbors, so that
       * you can request `x` or `y` outside the bounds of the original tile.
       *
       * @param neighbors An array containing tiles: `[nw, n, ne, w, c, e, sw, s, se]`
       */
      static combineNeighbors(neighbors) {
          if (neighbors.length !== 9) {
              throw new Error("Must include a tile plus 8 neighbors");
          }
          const mainTile = neighbors[4];
          if (!mainTile) {
              return undefined;
          }
          const width = mainTile.width;
          const height = mainTile.height;
          return new HeightTile(width, height, (x, y) => {
              let gridIdx = 0;
              if (y < 0) {
                  y += height;
              }
              else if (y < height) {
                  gridIdx += 3;
              }
              else {
                  y -= height;
                  gridIdx += 6;
              }
              if (x < 0) {
                  x += width;
              }
              else if (x < width) {
                  gridIdx += 1;
              }
              else {
                  x -= width;
                  gridIdx += 2;
              }
              const grid = neighbors[gridIdx];
              return grid ? grid.get(x, y) : NaN;
          });
      }
  }

  function getDefaultExportFromCjs (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  var ieee754$1 = {};

  /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

  ieee754$1.read = function (buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = (nBytes * 8) - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? (nBytes - 1) : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];

    i += d;

    e = s & ((1 << (-nBits)) - 1);
    s >>= (-nBits);
    nBits += eLen;
    for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

    m = e & ((1 << (-nBits)) - 1);
    e >>= (-nBits);
    nBits += mLen;
    for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : ((s ? -1 : 1) * Infinity)
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
  };

  ieee754$1.write = function (buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = (nBytes * 8) - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
    var i = isLE ? 0 : (nBytes - 1);
    var d = isLE ? 1 : -1;
    var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }

      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = ((value * c) - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

    e = (e << mLen) | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

    buffer[offset + i - d] |= s * 128;
  };

  var pbf = Pbf;

  var ieee754 = ieee754$1;

  function Pbf(buf) {
      this.buf = ArrayBuffer.isView && ArrayBuffer.isView(buf) ? buf : new Uint8Array(buf || 0);
      this.pos = 0;
      this.type = 0;
      this.length = this.buf.length;
  }

  Pbf.Varint  = 0; // varint: int32, int64, uint32, uint64, sint32, sint64, bool, enum
  Pbf.Fixed64 = 1; // 64-bit: double, fixed64, sfixed64
  Pbf.Bytes   = 2; // length-delimited: string, bytes, embedded messages, packed repeated fields
  Pbf.Fixed32 = 5; // 32-bit: float, fixed32, sfixed32

  var SHIFT_LEFT_32 = (1 << 16) * (1 << 16),
      SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32;

  // Threshold chosen based on both benchmarking and knowledge about browser string
  // data structures (which currently switch structure types at 12 bytes or more)
  var TEXT_DECODER_MIN_LENGTH = 12;
  var utf8TextDecoder = typeof TextDecoder === 'undefined' ? null : new TextDecoder('utf8');

  Pbf.prototype = {

      destroy: function() {
          this.buf = null;
      },

      // === READING =================================================================

      readFields: function(readField, result, end) {
          end = end || this.length;

          while (this.pos < end) {
              var val = this.readVarint(),
                  tag = val >> 3,
                  startPos = this.pos;

              this.type = val & 0x7;
              readField(tag, result, this);

              if (this.pos === startPos) this.skip(val);
          }
          return result;
      },

      readMessage: function(readField, result) {
          return this.readFields(readField, result, this.readVarint() + this.pos);
      },

      readFixed32: function() {
          var val = readUInt32(this.buf, this.pos);
          this.pos += 4;
          return val;
      },

      readSFixed32: function() {
          var val = readInt32(this.buf, this.pos);
          this.pos += 4;
          return val;
      },

      // 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)

      readFixed64: function() {
          var val = readUInt32(this.buf, this.pos) + readUInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
          this.pos += 8;
          return val;
      },

      readSFixed64: function() {
          var val = readUInt32(this.buf, this.pos) + readInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
          this.pos += 8;
          return val;
      },

      readFloat: function() {
          var val = ieee754.read(this.buf, this.pos, true, 23, 4);
          this.pos += 4;
          return val;
      },

      readDouble: function() {
          var val = ieee754.read(this.buf, this.pos, true, 52, 8);
          this.pos += 8;
          return val;
      },

      readVarint: function(isSigned) {
          var buf = this.buf,
              val, b;

          b = buf[this.pos++]; val  =  b & 0x7f;        if (b < 0x80) return val;
          b = buf[this.pos++]; val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
          b = buf[this.pos++]; val |= (b & 0x7f) << 14; if (b < 0x80) return val;
          b = buf[this.pos++]; val |= (b & 0x7f) << 21; if (b < 0x80) return val;
          b = buf[this.pos];   val |= (b & 0x0f) << 28;

          return readVarintRemainder(val, isSigned, this);
      },

      readVarint64: function() { // for compatibility with v2.0.1
          return this.readVarint(true);
      },

      readSVarint: function() {
          var num = this.readVarint();
          return num % 2 === 1 ? (num + 1) / -2 : num / 2; // zigzag encoding
      },

      readBoolean: function() {
          return Boolean(this.readVarint());
      },

      readString: function() {
          var end = this.readVarint() + this.pos;
          var pos = this.pos;
          this.pos = end;

          if (end - pos >= TEXT_DECODER_MIN_LENGTH && utf8TextDecoder) {
              // longer strings are fast with the built-in browser TextDecoder API
              return readUtf8TextDecoder(this.buf, pos, end);
          }
          // short strings are fast with our custom implementation
          return readUtf8(this.buf, pos, end);
      },

      readBytes: function() {
          var end = this.readVarint() + this.pos,
              buffer = this.buf.subarray(this.pos, end);
          this.pos = end;
          return buffer;
      },

      // verbose for performance reasons; doesn't affect gzipped size

      readPackedVarint: function(arr, isSigned) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readVarint(isSigned));
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readVarint(isSigned));
          return arr;
      },
      readPackedSVarint: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readSVarint());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readSVarint());
          return arr;
      },
      readPackedBoolean: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readBoolean());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readBoolean());
          return arr;
      },
      readPackedFloat: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readFloat());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readFloat());
          return arr;
      },
      readPackedDouble: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readDouble());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readDouble());
          return arr;
      },
      readPackedFixed32: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readFixed32());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readFixed32());
          return arr;
      },
      readPackedSFixed32: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed32());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readSFixed32());
          return arr;
      },
      readPackedFixed64: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readFixed64());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readFixed64());
          return arr;
      },
      readPackedSFixed64: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed64());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readSFixed64());
          return arr;
      },

      skip: function(val) {
          var type = val & 0x7;
          if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
          else if (type === Pbf.Bytes) this.pos = this.readVarint() + this.pos;
          else if (type === Pbf.Fixed32) this.pos += 4;
          else if (type === Pbf.Fixed64) this.pos += 8;
          else throw new Error('Unimplemented type: ' + type);
      },

      // === WRITING =================================================================

      writeTag: function(tag, type) {
          this.writeVarint((tag << 3) | type);
      },

      realloc: function(min) {
          var length = this.length || 16;

          while (length < this.pos + min) length *= 2;

          if (length !== this.length) {
              var buf = new Uint8Array(length);
              buf.set(this.buf);
              this.buf = buf;
              this.length = length;
          }
      },

      finish: function() {
          this.length = this.pos;
          this.pos = 0;
          return this.buf.subarray(0, this.length);
      },

      writeFixed32: function(val) {
          this.realloc(4);
          writeInt32(this.buf, val, this.pos);
          this.pos += 4;
      },

      writeSFixed32: function(val) {
          this.realloc(4);
          writeInt32(this.buf, val, this.pos);
          this.pos += 4;
      },

      writeFixed64: function(val) {
          this.realloc(8);
          writeInt32(this.buf, val & -1, this.pos);
          writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
          this.pos += 8;
      },

      writeSFixed64: function(val) {
          this.realloc(8);
          writeInt32(this.buf, val & -1, this.pos);
          writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
          this.pos += 8;
      },

      writeVarint: function(val) {
          val = +val || 0;

          if (val > 0xfffffff || val < 0) {
              writeBigVarint(val, this);
              return;
          }

          this.realloc(4);

          this.buf[this.pos++] =           val & 0x7f  | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
          this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
          this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
          this.buf[this.pos++] =   (val >>> 7) & 0x7f;
      },

      writeSVarint: function(val) {
          this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2);
      },

      writeBoolean: function(val) {
          this.writeVarint(Boolean(val));
      },

      writeString: function(str) {
          str = String(str);
          this.realloc(str.length * 4);

          this.pos++; // reserve 1 byte for short string length

          var startPos = this.pos;
          // write the string directly to the buffer and see how much was written
          this.pos = writeUtf8(this.buf, str, this.pos);
          var len = this.pos - startPos;

          if (len >= 0x80) makeRoomForExtraLength(startPos, len, this);

          // finally, write the message length in the reserved place and restore the position
          this.pos = startPos - 1;
          this.writeVarint(len);
          this.pos += len;
      },

      writeFloat: function(val) {
          this.realloc(4);
          ieee754.write(this.buf, val, this.pos, true, 23, 4);
          this.pos += 4;
      },

      writeDouble: function(val) {
          this.realloc(8);
          ieee754.write(this.buf, val, this.pos, true, 52, 8);
          this.pos += 8;
      },

      writeBytes: function(buffer) {
          var len = buffer.length;
          this.writeVarint(len);
          this.realloc(len);
          for (var i = 0; i < len; i++) this.buf[this.pos++] = buffer[i];
      },

      writeRawMessage: function(fn, obj) {
          this.pos++; // reserve 1 byte for short message length

          // write the message directly to the buffer and see how much was written
          var startPos = this.pos;
          fn(obj, this);
          var len = this.pos - startPos;

          if (len >= 0x80) makeRoomForExtraLength(startPos, len, this);

          // finally, write the message length in the reserved place and restore the position
          this.pos = startPos - 1;
          this.writeVarint(len);
          this.pos += len;
      },

      writeMessage: function(tag, fn, obj) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeRawMessage(fn, obj);
      },

      writePackedVarint:   function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedVarint, arr);   },
      writePackedSVarint:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSVarint, arr);  },
      writePackedBoolean:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedBoolean, arr);  },
      writePackedFloat:    function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFloat, arr);    },
      writePackedDouble:   function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedDouble, arr);   },
      writePackedFixed32:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFixed32, arr);  },
      writePackedSFixed32: function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSFixed32, arr); },
      writePackedFixed64:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFixed64, arr);  },
      writePackedSFixed64: function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSFixed64, arr); },

      writeBytesField: function(tag, buffer) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeBytes(buffer);
      },
      writeFixed32Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeFixed32(val);
      },
      writeSFixed32Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeSFixed32(val);
      },
      writeFixed64Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeFixed64(val);
      },
      writeSFixed64Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeSFixed64(val);
      },
      writeVarintField: function(tag, val) {
          this.writeTag(tag, Pbf.Varint);
          this.writeVarint(val);
      },
      writeSVarintField: function(tag, val) {
          this.writeTag(tag, Pbf.Varint);
          this.writeSVarint(val);
      },
      writeStringField: function(tag, str) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeString(str);
      },
      writeFloatField: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeFloat(val);
      },
      writeDoubleField: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeDouble(val);
      },
      writeBooleanField: function(tag, val) {
          this.writeVarintField(tag, Boolean(val));
      }
  };

  function readVarintRemainder(l, s, p) {
      var buf = p.buf,
          h, b;

      b = buf[p.pos++]; h  = (b & 0x70) >> 4;  if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 3;  if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 10; if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 17; if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 24; if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x01) << 31; if (b < 0x80) return toNum(l, h, s);

      throw new Error('Expected varint not more than 10 bytes');
  }

  function readPackedEnd(pbf) {
      return pbf.type === Pbf.Bytes ?
          pbf.readVarint() + pbf.pos : pbf.pos + 1;
  }

  function toNum(low, high, isSigned) {
      if (isSigned) {
          return high * 0x100000000 + (low >>> 0);
      }

      return ((high >>> 0) * 0x100000000) + (low >>> 0);
  }

  function writeBigVarint(val, pbf) {
      var low, high;

      if (val >= 0) {
          low  = (val % 0x100000000) | 0;
          high = (val / 0x100000000) | 0;
      } else {
          low  = ~(-val % 0x100000000);
          high = ~(-val / 0x100000000);

          if (low ^ 0xffffffff) {
              low = (low + 1) | 0;
          } else {
              low = 0;
              high = (high + 1) | 0;
          }
      }

      if (val >= 0x10000000000000000 || val < -0x10000000000000000) {
          throw new Error('Given varint doesn\'t fit into 10 bytes');
      }

      pbf.realloc(10);

      writeBigVarintLow(low, high, pbf);
      writeBigVarintHigh(high, pbf);
  }

  function writeBigVarintLow(low, high, pbf) {
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos]   = low & 0x7f;
  }

  function writeBigVarintHigh(high, pbf) {
      var lsb = (high & 0x07) << 4;

      pbf.buf[pbf.pos++] |= lsb         | ((high >>>= 3) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f;
  }

  function makeRoomForExtraLength(startPos, len, pbf) {
      var extraLen =
          len <= 0x3fff ? 1 :
          len <= 0x1fffff ? 2 :
          len <= 0xfffffff ? 3 : Math.floor(Math.log(len) / (Math.LN2 * 7));

      // if 1 byte isn't enough for encoding message length, shift the data to the right
      pbf.realloc(extraLen);
      for (var i = pbf.pos - 1; i >= startPos; i--) pbf.buf[i + extraLen] = pbf.buf[i];
  }

  function writePackedVarint(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeVarint(arr[i]);   }
  function writePackedSVarint(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeSVarint(arr[i]);  }
  function writePackedFloat(arr, pbf)    { for (var i = 0; i < arr.length; i++) pbf.writeFloat(arr[i]);    }
  function writePackedDouble(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeDouble(arr[i]);   }
  function writePackedBoolean(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeBoolean(arr[i]);  }
  function writePackedFixed32(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed32(arr[i]);  }
  function writePackedSFixed32(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed32(arr[i]); }
  function writePackedFixed64(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed64(arr[i]);  }
  function writePackedSFixed64(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed64(arr[i]); }

  // Buffer code below from https://github.com/feross/buffer, MIT-licensed

  function readUInt32(buf, pos) {
      return ((buf[pos]) |
          (buf[pos + 1] << 8) |
          (buf[pos + 2] << 16)) +
          (buf[pos + 3] * 0x1000000);
  }

  function writeInt32(buf, val, pos) {
      buf[pos] = val;
      buf[pos + 1] = (val >>> 8);
      buf[pos + 2] = (val >>> 16);
      buf[pos + 3] = (val >>> 24);
  }

  function readInt32(buf, pos) {
      return ((buf[pos]) |
          (buf[pos + 1] << 8) |
          (buf[pos + 2] << 16)) +
          (buf[pos + 3] << 24);
  }

  function readUtf8(buf, pos, end) {
      var str = '';
      var i = pos;

      while (i < end) {
          var b0 = buf[i];
          var c = null; // codepoint
          var bytesPerSequence =
              b0 > 0xEF ? 4 :
              b0 > 0xDF ? 3 :
              b0 > 0xBF ? 2 : 1;

          if (i + bytesPerSequence > end) break;

          var b1, b2, b3;

          if (bytesPerSequence === 1) {
              if (b0 < 0x80) {
                  c = b0;
              }
          } else if (bytesPerSequence === 2) {
              b1 = buf[i + 1];
              if ((b1 & 0xC0) === 0x80) {
                  c = (b0 & 0x1F) << 0x6 | (b1 & 0x3F);
                  if (c <= 0x7F) {
                      c = null;
                  }
              }
          } else if (bytesPerSequence === 3) {
              b1 = buf[i + 1];
              b2 = buf[i + 2];
              if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80) {
                  c = (b0 & 0xF) << 0xC | (b1 & 0x3F) << 0x6 | (b2 & 0x3F);
                  if (c <= 0x7FF || (c >= 0xD800 && c <= 0xDFFF)) {
                      c = null;
                  }
              }
          } else if (bytesPerSequence === 4) {
              b1 = buf[i + 1];
              b2 = buf[i + 2];
              b3 = buf[i + 3];
              if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
                  c = (b0 & 0xF) << 0x12 | (b1 & 0x3F) << 0xC | (b2 & 0x3F) << 0x6 | (b3 & 0x3F);
                  if (c <= 0xFFFF || c >= 0x110000) {
                      c = null;
                  }
              }
          }

          if (c === null) {
              c = 0xFFFD;
              bytesPerSequence = 1;

          } else if (c > 0xFFFF) {
              c -= 0x10000;
              str += String.fromCharCode(c >>> 10 & 0x3FF | 0xD800);
              c = 0xDC00 | c & 0x3FF;
          }

          str += String.fromCharCode(c);
          i += bytesPerSequence;
      }

      return str;
  }

  function readUtf8TextDecoder(buf, pos, end) {
      return utf8TextDecoder.decode(buf.subarray(pos, end));
  }

  function writeUtf8(buf, str, pos) {
      for (var i = 0, c, lead; i < str.length; i++) {
          c = str.charCodeAt(i); // code point

          if (c > 0xD7FF && c < 0xE000) {
              if (lead) {
                  if (c < 0xDC00) {
                      buf[pos++] = 0xEF;
                      buf[pos++] = 0xBF;
                      buf[pos++] = 0xBD;
                      lead = c;
                      continue;
                  } else {
                      c = lead - 0xD800 << 10 | c - 0xDC00 | 0x10000;
                      lead = null;
                  }
              } else {
                  if (c > 0xDBFF || (i + 1 === str.length)) {
                      buf[pos++] = 0xEF;
                      buf[pos++] = 0xBF;
                      buf[pos++] = 0xBD;
                  } else {
                      lead = c;
                  }
                  continue;
              }
          } else if (lead) {
              buf[pos++] = 0xEF;
              buf[pos++] = 0xBF;
              buf[pos++] = 0xBD;
              lead = null;
          }

          if (c < 0x80) {
              buf[pos++] = c;
          } else {
              if (c < 0x800) {
                  buf[pos++] = c >> 0x6 | 0xC0;
              } else {
                  if (c < 0x10000) {
                      buf[pos++] = c >> 0xC | 0xE0;
                  } else {
                      buf[pos++] = c >> 0x12 | 0xF0;
                      buf[pos++] = c >> 0xC & 0x3F | 0x80;
                  }
                  buf[pos++] = c >> 0x6 & 0x3F | 0x80;
              }
              buf[pos++] = c & 0x3F | 0x80;
          }
      }
      return pos;
  }

  var Pbf$1 = /*@__PURE__*/getDefaultExportFromCjs(pbf);

  /*
  Adapted from vt-pbf https://github.com/mapbox/vt-pbf

  The MIT License (MIT)

  Copyright (c) 2015 Anand Thakker

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  */
  var GeomType;
  (function (GeomType) {
      GeomType[GeomType["UNKNOWN"] = 0] = "UNKNOWN";
      GeomType[GeomType["POINT"] = 1] = "POINT";
      GeomType[GeomType["LINESTRING"] = 2] = "LINESTRING";
      GeomType[GeomType["POLYGON"] = 3] = "POLYGON";
  })(GeomType || (GeomType = {}));
  /**
   * Enodes and serializes a mapbox vector tile as an array of bytes.
   */
  function encodeVectorTile(tile) {
      const pbf = new Pbf$1();
      for (const id in tile.layers) {
          const layer = tile.layers[id];
          if (!layer.extent) {
              layer.extent = tile.extent;
          }
          pbf.writeMessage(3, writeLayer, { ...layer, id });
      }
      return pbf.finish();
  }
  function writeLayer(layer, pbf) {
      if (!pbf)
          throw new Error("pbf undefined");
      pbf.writeVarintField(15, 2);
      pbf.writeStringField(1, layer.id || "");
      pbf.writeVarintField(5, layer.extent || 4096);
      const context = {
          keys: [],
          values: [],
          keycache: {},
          valuecache: {},
      };
      for (const feature of layer.features) {
          context.feature = feature;
          pbf.writeMessage(2, writeFeature, context);
      }
      for (const key of context.keys) {
          pbf.writeStringField(3, key);
      }
      for (const value of context.values) {
          pbf.writeMessage(4, writeValue, value);
      }
  }
  function writeFeature(context, pbf) {
      const feature = context.feature;
      if (!feature || !pbf)
          throw new Error();
      pbf.writeMessage(2, writeProperties, context);
      pbf.writeVarintField(3, feature.type);
      pbf.writeMessage(4, writeGeometry, feature);
  }
  function writeProperties(context, pbf) {
      const feature = context.feature;
      if (!feature || !pbf)
          throw new Error();
      const keys = context.keys;
      const values = context.values;
      const keycache = context.keycache;
      const valuecache = context.valuecache;
      for (const key in feature.properties) {
          let value = feature.properties[key];
          let keyIndex = keycache[key];
          if (value === null)
              continue; // don't encode null value properties
          if (typeof keyIndex === "undefined") {
              keys.push(key);
              keyIndex = keys.length - 1;
              keycache[key] = keyIndex;
          }
          pbf.writeVarint(keyIndex);
          const type = typeof value;
          if (type !== "string" && type !== "boolean" && type !== "number") {
              value = JSON.stringify(value);
          }
          const valueKey = `${type}:${value}`;
          let valueIndex = valuecache[valueKey];
          if (typeof valueIndex === "undefined") {
              values.push(value);
              valueIndex = values.length - 1;
              valuecache[valueKey] = valueIndex;
          }
          pbf.writeVarint(valueIndex);
      }
  }
  function command(cmd, length) {
      return (length << 3) + (cmd & 0x7);
  }
  function zigzag(num) {
      return (num << 1) ^ (num >> 31);
  }
  function writeGeometry(feature, pbf) {
      if (!pbf)
          throw new Error();
      const geometry = feature.geometry;
      const type = feature.type;
      let x = 0;
      let y = 0;
      for (const ring of geometry) {
          let count = 1;
          if (type === GeomType.POINT) {
              count = ring.length / 2;
          }
          pbf.writeVarint(command(1, count)); // moveto
          // do not write polygon closing path as lineto
          const length = ring.length / 2;
          const lineCount = type === GeomType.POLYGON ? length - 1 : length;
          for (let i = 0; i < lineCount; i++) {
              if (i === 1 && type !== 1) {
                  pbf.writeVarint(command(2, lineCount - 1)); // lineto
              }
              const dx = ring[i * 2] - x;
              const dy = ring[i * 2 + 1] - y;
              pbf.writeVarint(zigzag(dx));
              pbf.writeVarint(zigzag(dy));
              x += dx;
              y += dy;
          }
          if (type === GeomType.POLYGON) {
              pbf.writeVarint(command(7, 1)); // closepath
          }
      }
  }
  function writeValue(value, pbf) {
      if (!pbf)
          throw new Error();
      if (typeof value === "string") {
          pbf.writeStringField(1, value);
      }
      else if (typeof value === "boolean") {
          pbf.writeBooleanField(7, value);
      }
      else if (typeof value === "number") {
          if (value % 1 !== 0) {
              pbf.writeDoubleField(3, value);
          }
          else if (value < 0) {
              pbf.writeSVarintField(6, value);
          }
          else {
              pbf.writeVarintField(5, value);
          }
      }
  }

  /**
   * Caches, decodes, and processes raster tiles in the current thread.
   */
  class LocalDemManager {
      constructor(demUrlPattern, cacheSize, encoding, maxzoom, timeoutMs) {
          this.loaded = Promise.resolve();
          this.decodeImage = defaultDecoder;
          this.fetchAndParseTile = (z, x, y, timer) => {
              const self = this;
              const url = this.demUrlPattern
                  .replace("{z}", z.toString())
                  .replace("{x}", x.toString())
                  .replace("{y}", y.toString());
              timer === null || timer === void 0 ? void 0 : timer.useTile(url);
              return this.parsedCache.getCancelable(url, () => {
                  const tile = self.fetchTile(z, x, y, timer);
                  let canceled = false;
                  let alsoCancel = () => { };
                  return {
                      value: tile.value.then(async (response) => {
                          if (canceled)
                              throw new Error("canceled");
                          const result = self.decodeImage(response.data, self.encoding);
                          alsoCancel = result.cancel;
                          const mark = timer === null || timer === void 0 ? void 0 : timer.marker("decode");
                          const value = await result.value;
                          mark === null || mark === void 0 ? void 0 : mark();
                          return value;
                      }),
                      cancel: () => {
                          canceled = true;
                          alsoCancel();
                          tile.cancel();
                      },
                  };
              });
          };
          this.tileCache = new AsyncCache(cacheSize);
          this.parsedCache = new AsyncCache(cacheSize);
          this.contourCache = new AsyncCache(cacheSize);
          this.timeoutMs = timeoutMs;
          this.demUrlPattern = demUrlPattern;
          this.encoding = encoding;
          this.maxzoom = maxzoom;
      }
      fetchTile(z, x, y, timer) {
          const url = this.demUrlPattern
              .replace("{z}", z.toString())
              .replace("{x}", x.toString())
              .replace("{y}", y.toString());
          timer === null || timer === void 0 ? void 0 : timer.useTile(url);
          return this.tileCache.getCancelable(url, () => {
              let cancel = () => { };
              const options = {};
              try {
                  const controller = new AbortController();
                  options.signal = controller.signal;
                  cancel = () => controller.abort();
              }
              catch (e) {
                  // ignore
              }
              timer === null || timer === void 0 ? void 0 : timer.fetchTile(url);
              const mark = timer === null || timer === void 0 ? void 0 : timer.marker("fetch");
              return withTimeout(this.timeoutMs, {
                  value: fetch(url, options).then(async (response) => {
                      mark === null || mark === void 0 ? void 0 : mark();
                      if (!response.ok) {
                          throw new Error(`Bad response: ${response.status} for ${url}`);
                      }
                      return {
                          data: await response.blob(),
                          expires: response.headers.get("expires") || undefined,
                          cacheControl: response.headers.get("cache-control") || undefined,
                      };
                  }),
                  cancel,
              });
          });
      }
      fetchDem(z, x, y, options, timer) {
          const zoom = Math.min(z - (options.overzoom || 0), this.maxzoom);
          const subZ = z - zoom;
          const div = 1 << subZ;
          const newX = Math.floor(x / div);
          const newY = Math.floor(y / div);
          const { value, cancel } = this.fetchAndParseTile(zoom, newX, newY, timer);
          const subX = x % div;
          const subY = y % div;
          return {
              value: value.then((tile) => HeightTile.fromRawDem(tile).split(subZ, subX, subY)),
              cancel,
          };
      }
      fetchContourTile(z, x, y, options, timer) {
          const { levels, multiplier = 1, buffer = 1, extent = 4096, contourLayer = "contours", elevationKey = "ele", levelKey = "level", subsampleBelow = 100, } = options;
          // no levels means less than min zoom with levels specified
          if (!levels || levels.length === 0) {
              return {
                  cancel() { },
                  value: Promise.resolve({ arrayBuffer: new ArrayBuffer(0) }),
              };
          }
          const key = [z, x, y, encodeIndividualOptions(options)].join("/");
          return this.contourCache.getCancelable(key, () => {
              const max = 1 << z;
              let canceled = false;
              const neighborPromises = [];
              for (let iy = y - 1; iy <= y + 1; iy++) {
                  for (let ix = x - 1; ix <= x + 1; ix++) {
                      neighborPromises.push(iy < 0 || iy >= max
                          ? null
                          : this.fetchDem(z, (ix + max) % max, iy, options, timer));
                  }
              }
              const value = Promise.all(neighborPromises.map((n) => n === null || n === void 0 ? void 0 : n.value)).then(async (neighbors) => {
                  let virtualTile = HeightTile.combineNeighbors(neighbors);
                  if (!virtualTile || canceled) {
                      return { arrayBuffer: new Uint8Array().buffer };
                  }
                  const mark = timer === null || timer === void 0 ? void 0 : timer.marker("isoline");
                  if (virtualTile.width >= subsampleBelow) {
                      virtualTile = virtualTile.materialize(2);
                  }
                  else {
                      while (virtualTile.width < subsampleBelow) {
                          virtualTile = virtualTile.subsamplePixelCenters(2).materialize(2);
                      }
                  }
                  virtualTile = virtualTile
                      .averagePixelCentersToGrid()
                      .scaleElevation(multiplier)
                      .materialize(1);
                  const isolines = generateIsolines(levels[0], virtualTile, extent, buffer);
                  mark === null || mark === void 0 ? void 0 : mark();
                  const result = encodeVectorTile({
                      extent,
                      layers: {
                          [contourLayer]: {
                              features: Object.entries(isolines).map(([eleString, geom]) => {
                                  const ele = Number(eleString);
                                  return {
                                      type: GeomType.LINESTRING,
                                      geometry: geom,
                                      properties: {
                                          [elevationKey]: ele,
                                          [levelKey]: Math.max(...levels.map((l, i) => (ele % l === 0 ? i : 0))),
                                      },
                                  };
                              }),
                          },
                      },
                  });
                  mark === null || mark === void 0 ? void 0 : mark();
                  return { arrayBuffer: result.buffer };
              });
              return {
                  value,
                  cancel() {
                      canceled = true;
                      neighborPromises.forEach((n) => n && n.cancel());
                  },
              };
          });
      }
  }

  const perf = typeof performance !== "undefined" ? performance : undefined;
  const timeOrigin = perf
      ? perf.timeOrigin || new Date().getTime() - perf.now()
      : new Date().getTime();
  function getResourceTiming(url) {
      var _a;
      return JSON.parse(JSON.stringify(((_a = perf === null || perf === void 0 ? void 0 : perf.getEntriesByName) === null || _a === void 0 ? void 0 : _a.call(perf, url)) || []));
  }
  function now() {
      return perf ? perf.now() : new Date().getTime();
  }
  function flatten(input) {
      const result = [];
      for (const list of input) {
          result.push(...list);
      }
      return result;
  }
  /** Utility for tracking how long tiles take to generate, and where the time is going. */
  class Timer {
      constructor(name) {
          this.marks = {};
          this.urls = [];
          this.fetched = [];
          this.resources = [];
          this.tilesFetched = 0;
          this.timeOrigin = timeOrigin;
          this.finish = (url) => {
              this.markFinish();
              const get = (type) => {
                  const all = this.marks[type] || [];
                  const max = Math.max(...all.map((ns) => Math.max(...ns)));
                  const min = Math.min(...all.map((ns) => Math.min(...ns)));
                  return Number.isFinite(max) ? max - min : undefined;
              };
              const duration = get("main") || 0;
              const fetch = get("fetch");
              const decode = get("decode");
              const process = get("isoline");
              return {
                  url,
                  tilesUsed: this.tilesFetched,
                  origin: this.timeOrigin,
                  marks: this.marks,
                  resources: [
                      ...this.resources,
                      ...flatten(this.fetched.map(getResourceTiming)),
                  ],
                  duration,
                  fetch,
                  decode,
                  process,
                  wait: duration - (fetch || 0) - (decode || 0) - (process || 0),
              };
          };
          this.error = (url) => ({ ...this.finish(url), error: true });
          this.marker = (category) => {
              var _a;
              if (!this.marks[category]) {
                  this.marks[category] = [];
              }
              const marks = [now()];
              (_a = this.marks[category]) === null || _a === void 0 ? void 0 : _a.push(marks);
              return () => marks.push(now());
          };
          this.useTile = (url) => {
              if (this.urls.indexOf(url) < 0) {
                  this.urls.push(url);
                  this.tilesFetched++;
              }
          };
          this.fetchTile = (url) => {
              if (this.fetched.indexOf(url) < 0) {
                  this.fetched.push(url);
              }
          };
          this.addAll = (timings) => {
              var _a;
              this.tilesFetched += timings.tilesUsed;
              const offset = timings.origin - this.timeOrigin;
              for (const category in timings.marks) {
                  const key = category;
                  const ourList = this.marks[key] || (this.marks[key] = []);
                  ourList.push(...(((_a = timings.marks[key]) === null || _a === void 0 ? void 0 : _a.map((ns) => ns.map((n) => n + offset))) || []));
              }
              this.resources.push(...timings.resources.map((rt) => applyOffset(rt, offset)));
          };
          this.markFinish = this.marker(name);
      }
  }
  const startOrEnd = /(Start$|End$|^start|^end)/;
  function applyOffset(obj, offset) {
      const result = {};
      for (const key in obj) {
          if (obj[key] !== 0 && startOrEnd.test(key)) {
              result[key] = Number(obj[key]) + offset;
          }
          else {
              result[key] = obj[key];
          }
      }
      return result;
  }

  let id = 0;
  /**
   * Utility for sending messages to a remote instance of `<T>` running in a web worker
   * from the main thread, or in the main thread running from a web worker.
   */
  class Actor {
      constructor(dest, dispatcher, timeoutMs = 20000) {
          this.callbacks = {};
          this.cancels = {};
          this.dest = dest;
          this.timeoutMs = timeoutMs;
          this.dest.onmessage = async ({ data }) => {
              const message = data;
              if (message.type === "cancel") {
                  const cancel = this.cancels[message.id];
                  delete this.cancels[message.id];
                  if (cancel) {
                      cancel();
                  }
              }
              else if (message.type === "response") {
                  const callback = this.callbacks[message.id];
                  delete this.callbacks[message.id];
                  if (callback) {
                      callback(message.error ? new Error(message.error) : undefined, message.response, message.timings);
                  }
              }
              else if (message.type === "request") {
                  const timer = new Timer("worker");
                  const handler = dispatcher[message.name];
                  const request = handler.apply(handler, [...message.args, timer]);
                  const url = `${message.name}_${message.id}`;
                  if (message.id && request) {
                      this.cancels[message.id] = request.cancel;
                      try {
                          const response = await request.value;
                          const transferrables = response === null || response === void 0 ? void 0 : response.transferrables;
                          this.postMessage({
                              id: message.id,
                              type: "response",
                              response,
                              timings: timer.finish(url),
                          }, transferrables);
                      }
                      catch (e) {
                          this.postMessage({
                              id: message.id,
                              type: "response",
                              error: (e === null || e === void 0 ? void 0 : e.toString()) || "error",
                              timings: timer.finish(url),
                          });
                      }
                      delete this.cancels[message.id];
                  }
              }
          };
      }
      postMessage(message, transferrables) {
          this.dest.postMessage(message, transferrables || []);
      }
      /** Invokes a method by name with a set of arguments in the remote context. */
      send(name, transferrables, timer, ...args) {
          const thisId = ++id;
          const value = new Promise((resolve, reject) => {
              this.postMessage({ id: thisId, type: "request", name, args }, transferrables);
              this.callbacks[thisId] = (error, result, timings) => {
                  timer === null || timer === void 0 ? void 0 : timer.addAll(timings);
                  if (error)
                      reject(error);
                  else
                      resolve(result);
              };
          });
          return withTimeout(this.timeoutMs, {
              value,
              cancel: () => {
                  delete this.callbacks[thisId];
                  this.postMessage({ id: thisId, type: "cancel" });
              },
          });
      }
  }

  exports.Actor = Actor;
  exports.HeightTile = HeightTile;
  exports.LocalDemManager = LocalDemManager;
  exports.Timer = Timer;
  exports.decodeOptions = decodeOptions;
  exports.decodeParsedImage = decodeParsedImage;
  exports.defaultDecoder = defaultDecoder;
  exports.encodeOptions = encodeOptions;
  exports.generateIsolines = generateIsolines;
  exports.getOptionsForZoom = getOptionsForZoom;
  exports.prepareContourTile = prepareContourTile;
  exports.prepareDemTile = prepareDemTile;

  }));

  define(['./shared'], (function (actor) { 'use strict';

  const noManager = (managerId) => ({
      cancel() { },
      value: Promise.reject(new Error(`No manager registered for ${managerId}`)),
  });
  /**
   * Receives messages from an actor in the web worker.
   */
  class WorkerDispatch {
      constructor() {
          /** There is one worker shared between all managers in the main thread using the plugin, so need to store each of their configurations. */
          this.managers = {};
          this.init = (message) => {
              this.managers[message.managerId] = new actor.LocalDemManager(message.demUrlPattern, message.cacheSize, message.encoding, message.maxzoom, message.timeoutMs);
              return { cancel() { }, value: Promise.resolve() };
          };
          this.fetchTile = (managerId, z, x, y, timer) => { var _a; return ((_a = this.managers[managerId]) === null || _a === void 0 ? void 0 : _a.fetchTile(z, x, y, timer)) || noManager(managerId); };
          this.fetchAndParseTile = (managerId, z, x, y, timer) => {
              var _a;
              return actor.prepareDemTile(((_a = this.managers[managerId]) === null || _a === void 0 ? void 0 : _a.fetchAndParseTile(z, x, y, timer)) ||
                  noManager(managerId), true);
          };
          this.fetchContourTile = (managerId, z, x, y, options, timer) => {
              var _a;
              return actor.prepareContourTile(((_a = this.managers[managerId]) === null || _a === void 0 ? void 0 : _a.fetchContourTile(z, x, y, options, timer)) ||
                  noManager(managerId));
          };
      }
  }

  const g = typeof self !== "undefined"
      ? self
      : typeof window !== "undefined"
          ? window
          : global;
  g.actor = new actor.Actor(g, new WorkerDispatch());

  }));

  define(['./shared'], (function (actor) { 'use strict';

  const CONFIG = { workerUrl: "" };

  let _actor;
  let id = 0;
  class MainThreadDispatch {
      constructor() {
          this.decodeImage = (blob, encoding) => actor.prepareDemTile(actor.defaultDecoder(blob, encoding), false);
      }
  }
  function defaultActor() {
      if (!_actor) {
          const worker = new Worker(CONFIG.workerUrl);
          const dispatch = new MainThreadDispatch();
          _actor = new actor.Actor(worker, dispatch);
      }
      return _actor;
  }
  /**
   * Caches, decodes, and processes raster tiles in a shared web worker.
   */
  class RemoteDemManager {
      constructor(demUrlPattern, cacheSize, encoding, maxzoom, timeoutMs, actor) {
          this.fetchTile = (z, x, y, timer) => this.actor.send("fetchTile", [], timer, this.managerId, z, x, y);
          this.fetchAndParseTile = (z, x, y, timer) => this.actor.send("fetchAndParseTile", [], timer, this.managerId, z, x, y);
          this.fetchContourTile = (z, x, y, options, timer) => this.actor.send("fetchContourTile", [], timer, this.managerId, z, x, y, options);
          const managerId = (this.managerId = ++id);
          this.actor = actor || defaultActor();
          this.loaded = this.actor.send("init", [], undefined, {
              cacheSize,
              demUrlPattern,
              encoding,
              maxzoom,
              managerId,
              timeoutMs,
          }).value;
      }
  }

  if (!Blob.prototype.arrayBuffer) {
      Blob.prototype.arrayBuffer = function arrayBuffer() {
          return new Promise((resolve, reject) => {
              const fileReader = new FileReader();
              fileReader.onload = (event) => { var _a; return resolve((_a = event.target) === null || _a === void 0 ? void 0 : _a.result); };
              fileReader.onerror = reject;
              fileReader.readAsArrayBuffer(this);
          });
      };
  }
  const used = new Set();
  /**
   * A remote source of DEM tiles that can be connected to maplibre.
   */
  class DemSource {
      constructor({ url, cacheSize = 100, id = "dem", encoding = "terrarium", maxzoom = 12, worker = true, timeoutMs = 10000, actor: actor$1, }) {
          this.timingCallbacks = [];
          /** Registers a callback to be invoked with a performance report after each tile is requested. */
          this.onTiming = (callback) => {
              this.timingCallbacks.push(callback);
          };
          /**
           * Adds contour and shared DEM protocol handlers to maplibre.
           *
           * @param maplibre maplibre global object
           */
          this.setupMaplibre = (maplibre) => {
              maplibre.addProtocol(this.sharedDemProtocolId, this.sharedDemProtocol);
              maplibre.addProtocol(this.contourProtocolId, this.contourProtocol);
          };
          /**
           * Callback to be used with maplibre addProtocol to re-use cached DEM tiles across sources.
           */
          this.sharedDemProtocol = (request, response) => {
              const [z, x, y] = this.parseUrl(request.url);
              const timer = new actor.Timer("main");
              const result = this.manager.fetchTile(z, x, y, timer);
              let canceled = false;
              (async () => {
                  let timing;
                  try {
                      const data = await result.value;
                      timing = timer.finish(request.url);
                      if (canceled)
                          return;
                      const arrayBuffer = await data.data.arrayBuffer();
                      if (canceled)
                          return;
                      response(undefined, arrayBuffer, data.cacheControl, data.expires);
                  }
                  catch (error) {
                      timing = timer.error(request.url);
                      if (canceled)
                          return;
                      response(error);
                  }
                  this.timingCallbacks.forEach((cb) => cb(timing));
              })();
              return {
                  cancel: () => {
                      canceled = false;
                      result.cancel();
                  },
              };
          };
          /**
           * Callback to be used with maplibre addProtocol to generate contour vector tiles according
           * to options encoded in the tile URL pattern generated by `contourProtocolUrl`.
           */
          this.contourProtocol = (request, response) => {
              const timer = new actor.Timer("main");
              const [z, x, y] = this.parseUrl(request.url);
              const options = actor.decodeOptions(request.url);
              const result = this.manager.fetchContourTile(z, x, y, actor.getOptionsForZoom(options, z), timer);
              let canceled = false;
              (async () => {
                  let timing;
                  try {
                      const data = await result.value;
                      timing = timer.finish(request.url);
                      if (canceled)
                          return;
                      response(undefined, data.arrayBuffer);
                  }
                  catch (error) {
                      if (canceled)
                          return;
                      timing = timer.error(request.url);
                      response(error);
                  }
                  this.timingCallbacks.forEach((cb) => cb(timing));
              })();
              return {
                  cancel: () => {
                      canceled = true;
                      result.cancel();
                  },
              };
          };
          /**
           * Returns a URL with the correct maplibre protocol prefix and all `option` encoded in request parameters.
           */
          this.contourProtocolUrl = (options) => `${this.contourProtocolUrlBase}?${actor.encodeOptions(options)}`;
          let protocolPrefix = id;
          let i = 1;
          while (used.has(protocolPrefix)) {
              protocolPrefix = id + i++;
          }
          used.add(protocolPrefix);
          this.sharedDemProtocolId = `${protocolPrefix}-shared`;
          this.contourProtocolId = `${protocolPrefix}-contour`;
          this.sharedDemProtocolUrl = `${this.sharedDemProtocolId}://{z}/{x}/{y}`;
          this.contourProtocolUrlBase = `${this.contourProtocolId}://{z}/{x}/{y}`;
          const ManagerClass = worker ? RemoteDemManager : actor.LocalDemManager;
          this.manager = new ManagerClass(url, cacheSize, encoding, maxzoom, timeoutMs, actor$1);
      }
      getDemTile(z, x, y) {
          return this.manager.fetchAndParseTile(z, x, y).value;
      }
      parseUrl(url) {
          const [, z, x, y] = /\/\/(\d+)\/(\d+)\/(\d+)/.exec(url) || [];
          return [Number(z), Number(x), Number(y)];
      }
  }

  const exported = {
      generateIsolines: actor.generateIsolines,
      DemSource,
      HeightTile: actor.HeightTile,
      LocalDemManager: actor.LocalDemManager,
      decodeParsedImage: actor.decodeParsedImage,
      set workerUrl(url) {
          CONFIG.workerUrl = url;
      },
      get workerUrl() {
          return CONFIG.workerUrl;
      },
  };

  return exported;

  }));

  /* eslint-disable no-undef */

  var mlcontour$1 = mlcontour;

  return mlcontour$1;

}));
