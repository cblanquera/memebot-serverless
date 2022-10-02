import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm';
import { Canvas, CanvasImage, CanvasContext, Image, ImageData } from './types';
import { createCanvas, loadImage } from 'canvas';
declare const loadTF: () => Promise<void>;
export { Canvas, CanvasImage, CanvasContext, Image, ImageData, faceapi, createCanvas, loadImage, loadTF };
