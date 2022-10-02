// import nodejs bindings to native tensorflow,
// not required, but will speed up things drastically (python required)
import * as tf from '@tensorflow/tfjs';
//the face detection library (latest updated with tensorflow)
import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm';
//centralized type defs
import {
  Canvas, 
  CanvasImage,
  CanvasContext,
  Image, 
  ImageData,
} from './types';
//canvas node polyfills
import { createCanvas, loadImage } from 'canvas';

// patch nodejs environment, we need to provide an implementation of
// HTMLCanvasElement and HTMLImageElement
//@ts-ignore
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const loadTF = async () => {
  await tf.ready();
};

export { 
  Canvas, 
  CanvasImage,
  CanvasContext, 
  Image, 
  ImageData,
  faceapi, 
  createCanvas, 
  loadImage,
  loadTF
};