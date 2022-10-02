//used to resolve the models path
import path from 'path';
//http routing
import express from 'express';
//the config for the service contract
import serviceConfig from './service.json';
//importing this to load the models
import GifFaces from './lib/GifFaces';
//importing this to setup the service contract
import ServiceContract, { BigNumber } from './lib/ServiceContract';
//Meme model crud
import MemeGenerator from './lib/MemeGenerator';
//Consumer model crud
import Consumer from './lib/Consumer';

import { SearchResponse, Direction } from './utils/types';

//gif faces setup
const models = path.resolve(__dirname, '../models');
GifFaces.loadModels(models);
//express setup
const app = express();
//service contract setup
const service = ServiceContract.load(
  process.env.ADMIN_KEY as string, 
  serviceConfig
);

//declare some routes

/**
 * Example: /ping
 */
app.get('/ping', async (req, res) => {
  res.json({ error: false, results: 'pong' });
});

/**
 * Example: /register
 * ?image=https://www.wearecashcows.com/images/collection/3283_0.png
 * &image=https://www.wearecashcows.com/images/collection/411_0.png
 * &wallet=0xbF77342243B2f6dfb7a0b37793b0ffdEeF669bb8
 */
app.get('/register', async (req, res) => {
  //if no wallet address
  if (!req.query?.wallet) {
    return res.json({ error: true, message: 'Wallet address missing' });
  //if no images
  } else if (!req.query?.image) {
    return res.json({ error: true, message: 'Images missing' });
  }

  const images = Array.isArray(req.query.image) 
    ? req.query.image as string[]
    : [ req.query.image ] as string[];

  const walletAddress = String(req.query.wallet);

  Consumer.register(walletAddress, images)
    .then(results => res.json({ error: false, results }))
    .catch(error => res.json({ error: true, message: error.message }));
});

/**
 * Example: /user?wallet=0xbF77342243B2f6dfb7a0b37793b0ffdEeF669bb8
 */
app.get('/user', async (req, res) => {
  //if no wallet address
  if (!req.query?.wallet) {
    return res.json({ error: true, message: 'Wallet address missing' });
  }

  const walletAddress = String(req.query.wallet);

  Consumer.getWithBalance(walletAddress, service)
    .then(results => res.json({ error: false, results }))
    .catch(error => res.json({ error: true, message: error.message }));
});

/**
 * Example: /search?q=pump&limit=10
 */
app.get('/search', (req, res) => {
  if (!req.query?.q) return res.json({ 
    error: true, 
    message: 'Query missing' 
  });

  MemeGenerator.search(req.query)
    //@ts-ignore
    .then(search => {
      const response = search.response as SearchResponse;
      res.json({ 
        error: false, 
        results: response.results,
        next: response.next
      })
    })
    .catch(error => res.json({ error: true, message: error.message }));
});

/**
 * Example: /detect
 * ?url=https://media.tenor.com/XxOtj-aoQeMAAAAC/bodybuilder-bodybuilding.gif
 */
app.get('/detect', (req, res) => {
  //if no URL was provided
  if (!req.query?.url) {
    //return error response
    return res.json({ error: true, message: 'URL missing' });
  //still loading?
  } else if (!GifFaces.modelsAreLoaded(models)) {
    //return error response
    return res.json({ error: true, message: 'AI still loading' });
  }

  MemeGenerator.detect(req.query.url as string)
    .then(results => res.json({ error: false, results }))
    .catch(error => res.json({ error: true, message: error.message })); 
});

/**
 * Example: /generate
 * ?key=0xbF77342243B2f6dfb7a0b37793b0ffdEeF669bb8
 * &url=https://media.tenor.com/XxOtj-aoQeMAAAAC/bodybuilder-bodybuilding.gif
 */
app.get('/generate', (req, res) => {
  //if no wallet address was provided
  if (typeof req.query?.key !== 'string') {
    //return error response
    return res.json({ error: true, message: 'API key missing' });
  //if no url was provided
  } else if (typeof req.query?.url !== 'string') {
    //return error response
    return res.json({ error: true, message: 'URL missing' });
  }

  const walletAddress = req.query.key as string;

  MemeGenerator.generate(walletAddress, req.query.url, service)
    .then(results => res.json({ error: false, results }))
    .catch(error => res.json({ error: true, message: error.message })); 
});

/**
 * Example: /vote/up
 * ?url=https://ccmemebot.infura-ipfs.io/ipfs/QmUzFECFujRyA52XDFTQqszppYVqTmd6kxnVvXFBBQg6GW
 */
app.get('/vote/up', (req, res) => {
  if (!req.query?.url) {
    return res.json({ error: true, message: 'URL missing' });
  }

  const url = req.query.url as string;

  MemeGenerator.vote(url, Direction.Up)
    .then(results => res.json({ error: false, results }))
    .catch(error => res.json({ error: true, message: error.message })); 
});

/**
 * Example: /vote/down
 * ?url=https://ccmemebot.infura-ipfs.io/ipfs/QmUzFECFujRyA52XDFTQqszppYVqTmd6kxnVvXFBBQg6GW
 */
app.get('/vote/down', (req, res) => {
  if (!req.query?.url) {
    return res.json({ error: true, message: 'URL missing' });
  }

  const url = req.query.url as string;

  MemeGenerator.vote(url, Direction.Down)
    .then(async results => {
      //refund rules (down voted 10 times and never up voted)
      if (!results.up && results.down === 10) {
        const consumer = await Consumer.getOrThrow(results.consumerId);
        const consumed = BigNumber
          .from(consumer.consumed)
          .sub(service.rate)
          .toString();

        await Consumer.consume(
          consumer.walletAddress, 
          parseInt(consumed) > 0 ? consumed: '0'
        );
      }
      res.json({ error: false, results })
    })
    .catch(error => res.json({ error: true, message: error.message })); 
});

/**
 * Example: /discord/search
 * ?q=pump
 * &key=0xbF77342243B2f6dfb7a0b37793b0ffdEeF669bb8
 */
app.get('/discord/search', (req, res) => {
  if (!req.query?.q) {
    return res.json({ error: true, message: 'Query missing' });
  } else if (!req.query?.key) {
    return res.json({ error: true, message: 'API Key missing' });
  } 

  const walletAddress = req.query.key as string;

  MemeGenerator.generateOne(walletAddress, req.query, service)
    .then(results => res.json({ error: false, results }))
    .catch(error => res.json({ error: true, message: error.message })); 
});

export default app;