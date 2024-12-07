import * as fs from 'fs';
import { fetch } from 'undici';
import { tmpdir } from 'os';
import { Innertube, OAuth2Tokens, UniversalCache } from 'youtubei.js';

import NasaApi from './utils/NasaApi';
import TTSApi from './utils/TTSApi';
import VideoFactory from './utils/VideoFactory';

// @ts-ignore
import getDuration from 'mp3-duration';

const innertube = await Innertube.create({
  cache: new UniversalCache(false),
  retrieve_player: false
});

innertube.session.on('auth', () => console.info('Successfully logged in.'));
innertube.session.on('update-credentials', () => console.info('Credentials updated.'));
innertube.session.on('auth-pending', (data) => console.info(data));

const { ACCESS_TOKEN, REFRESH_TOKEN, EXPIRES } = process.env;

const oauthTokens = Reflect.has(process.env, 'ACCESS_TOKEN') ? {
  access_token: ACCESS_TOKEN,
  refresh_token: REFRESH_TOKEN,
  expiry_date: EXPIRES
} as OAuth2Tokens : undefined;

await innertube.session.signIn(oauthTokens);

const info = await innertube.account.getInfo();

console.info('Account info:', info);

const apod = await NasaApi.getAPOD();

console.info('APOD:', apod);

const image = await downloadImage(apod.media_type === 'image' ? apod.url : apod.thumbnail_url);
const audio = await TTSApi.speak(apod.explanation, `${tmpdir()}/${Date.now()}.mp3`);
const duration = await getDuration(audio);

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
  `Image URL: ${apod.url || 'N/A'}\n\n` +
  'This can also be found at: https://apod.nasa.gov/apod/astropix.html\n' +
  `Credit & Copyright: ${apod?.copyright || 'N/A'}`;

const description = `${apod.explanation}\n\n${nasa_credit}`;

const upload = await innertube.studio.upload(file.buffer, {
  title: apod.title,
  description: description,
  privacy: 'PUBLIC'
});

console.info(`Successfully uploaded "${apod.title}"!`);

await innertube.studio.updateVideoMetadata(upload.data.videoId, {
  tags: [
    'Astronomy',
    'Science',
    'NASA',
    'APOD',
    'Space',
    'Automated'
  ],
  category: 27, // Education
  license: 'creative_commons'
});


async function downloadImage(url: string): Promise<string> {
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