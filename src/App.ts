import * as fs from 'fs';

import { fetch } from 'undici';
import { tmpdir } from 'os';

import { Innertube, UniversalCache } from 'youtubei.js';
import { Credentials } from 'youtubei.js/dist/src/core/OAuth';

import NasaApi from './NasaApi';
import TTSApi from './TTSApi';
import VideoFactory from './VideoFactory';

// @ts-ignore
import durarion from 'mp3-duration';

(async () => {
  const yt = await Innertube.create({ cache: new UniversalCache() });

  yt.session.on('auth', () => console.info('Successfully logged in'));
  yt.session.on('update-credentials', () => console.info('Credentials updated'));
  yt.session.on('auth-pending', (data: any) => console.info(data));

  await yt.session.signIn(Reflect.has(process.env, 'ACCESS_TOKEN') ? {
    access_token: process.env.ACCESS_TOKEN,
    refresh_token: process.env.REFRESH_TOKEN,
    expires: new Date(process.env.EXPIRES || '')
  } as Credentials : undefined);

  const info = await yt.account.getInfo();

  console.info('Account info:', info);

  const apod = await NasaApi.getAPOD();

  const image = await downloadImage(apod.media_type === 'image' ? apod.url : apod.thumbnail_url);
  const audio = await TTSApi.speak(apod.explanation, `${tmpdir()}/${Date.now()}.mp3`);
  const duration = await durarion(audio);

  const gen_video = await VideoFactory.render([ {
    path: image,
    caption: apod.title,
    captionStart: 4000,
    captionEnd: 11000
  } ], {
    path: audio, duration
  });

  const file = fs.readFileSync(gen_video);

  const nasa_credit =
  `Direct image/video url: ${apod.url || 'N/A'}\n\n` +
  'This can also be found at: https://apod.nasa.gov/apod/astropix.html\n' +
  `Image Credit & Copyright: ${apod?.copyright || 'N/A'}`;

  const description = `${apod.explanation}\n\n${nasa_credit}`;

  const upload = await yt.studio.upload(file.buffer, {
    title: apod.title,
    description: description,
    privacy: 'PUBLIC'
  });

  console.info(`Successfully uploaded "${apod.title}" (${upload.data.videoId})!`);
})();

async function downloadImage(url: string): Promise < string > {
  const response = await fetch(url);

  if (!response.body)
    throw new Error('Could not download image.');

  const reader = response.body.getReader();

  const path = `${tmpdir()}/${Date.now()}.jpg`;
  const file = fs.createWriteStream(path);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      file.write(value);
    }
  } finally {
    reader.releaseLock();
  }

  return path;
}