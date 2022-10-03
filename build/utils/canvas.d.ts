import '@tensorflow/tfjs-node';
import * as faceapi from '@vladmandic/face-api';
declare const loadTF: () => Promise<void>;
import { Canvas, CanvasImage, CanvasContext, Image, ImageData } from './types';
import { createCanvas, loadImage } from 'canvas';
export { Canvas, CanvasImage, CanvasContext, Image, ImageData, faceapi, createCanvas, loadImage, loadTF };
