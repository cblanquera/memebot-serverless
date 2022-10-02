"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GifFacesUtils = void 0;
const ipfs_only_hash_1 = __importDefault(require("ipfs-only-hash"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const faceapi = __importStar(require("@vladmandic/face-api"));
const gifuct_js_1 = require("gifuct-js");
const canvas_1 = require("../utils/canvas");
const Exception_1 = __importDefault(require("./Exception"));
class GifFacesUtils {
    static bufferIsGif(buffer) {
        return buffer.toString('hex', 0, 4) !== '47494638';
    }
    static copyCanvas(source, destination) {
        destination.getContext('2d').drawImage(source, 0, 0);
        return destination;
    }
    static cloneCanvas(source) {
        const canvas = (0, canvas_1.createCanvas)(source.width, source.height);
        canvas.width = source.width;
        canvas.height = source.height;
        canvas.getContext('2d').drawImage(source, 0, 0);
        return canvas;
    }
    static getBuffer(url) {
        return new Promise((resolve, reject) => {
            (0, node_fetch_1.default)(url)
                .then((response) => __awaiter(this, void 0, void 0, function* () { return response.arrayBuffer(); }))
                .then(buffer => Buffer.from(buffer))
                .then(buffer => {
                if (this.bufferIsGif(buffer)) {
                    reject(Exception_1.default.for('URL is not a gif'));
                }
                else {
                    resolve(buffer);
                }
            });
        });
    }
    static getCID(buffer) {
        return ipfs_only_hash_1.default.of(buffer);
    }
    static getGifFrames(buffer) {
        const gif = (0, gifuct_js_1.parseGIF)(buffer);
        return (0, gifuct_js_1.decompressFrames)(gif, true);
    }
    static detectGifFaces(frames, padding = 0.4) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            if (!frames.length) {
                return resolve([]);
            }
            const { width, height } = frames[0].dims;
            const master = this.makeCanvasImage(width, height);
            let firstFaces = [];
            let lastFaces = [];
            const data = [];
            for (const frame of frames) {
                const faces = yield this._detectFaces(master, frame, padding);
                if (faces.length) {
                    lastFaces = faces;
                }
                if (!firstFaces) {
                    firstFaces = lastFaces;
                }
                data.push(lastFaces);
            }
            if (!lastFaces.length) {
                return resolve([]);
            }
            data.forEach(faces => faces ? faces : firstFaces);
            return resolve(data);
        }));
    }
    static makeCanvasImage(width, height) {
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const context = canvas.getContext('2d');
        const image = context.createImageData(width, height);
        return { canvas, context, image };
    }
    static modelsAreLoaded(path) {
        return this.modelsLoaded[path] || false;
    }
    static loadModels(path) {
        if (this.modelsAreLoaded(path)) {
            return new Promise(resolve => resolve(true));
        }
        return Promise.all([
            faceapi.nets.faceRecognitionNet.loadFromDisk(path),
            faceapi.nets.faceLandmark68Net.loadFromDisk(path),
            faceapi.nets.ssdMobilenetv1.loadFromDisk(path)
        ]).then(_ => (this.modelsLoaded[path] = true));
    }
    static _detectFaces(canvasImage, frame, padding = 0.4) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            this._drawPatch(canvasImage, frame);
            const image = yield this._getImage(canvasImage.canvas.toDataURL());
            const detections = yield faceapi
                .detectAllFaces(image)
                .withFaceLandmarks()
                .withFaceDescriptors();
            if (!detections.length) {
                return resolve([]);
            }
            return resolve(faceapi.resizeResults(detections, {
                width: image.width,
                height: image.height
            }).map(face => this._makeOuterBox(face.detection.box, padding)));
        }));
    }
    static _drawPatch(previous, frame) {
        const { top, left } = frame.dims;
        previous.image.data.set(frame.patch);
        previous.context.putImageData(previous.image, top, left);
    }
    static _getImage(src) {
        return new Promise((resolve, reject) => {
            const image = faceapi.env.getEnv().createImageElement();
            image.onload = () => resolve(image);
            image.onerror = error => reject(error);
            image.src = src;
        });
    }
    static _makeOuterBox(box, percent) {
        const padding = {
            x: box.width * percent,
            y: box.height * percent
        };
        return {
            x: box.x - padding.x,
            y: box.y - (padding.y * 1.5),
            width: box.width + (padding.x * 2),
            height: box.height + (padding.y * 2)
        };
    }
}
exports.GifFacesUtils = GifFacesUtils;
GifFacesUtils.modelsLoaded = {};
class GifFaces extends GifFacesUtils {
    get buffer() {
        return this._buffer;
    }
    get cid() {
        return this._cid;
    }
    detect(padding = 0.4) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._buffer) {
                throw Exception_1.default.for('Buffer not set. use setBuffer() first');
            }
            const frames = GifFaces.getGifFrames(this._buffer);
            if (!frames.length) {
                throw Exception_1.default.for('No frames found');
            }
            return yield GifFaces.detectGifFaces(frames, padding);
        });
    }
    setBuffer(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (buffer.toString('hex', 0, 4) !== '47494638') {
                throw Exception_1.default.for('URL is not a gif');
            }
            return this._setBuffer(buffer);
        });
    }
    setBufferFromURL(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._setBuffer(yield GifFaces.getBuffer(url));
        });
    }
    _setBuffer(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            this._buffer = buffer;
            this._cid = yield ipfs_only_hash_1.default.of(this._buffer);
            return this;
        });
    }
}
exports.default = GifFaces;
