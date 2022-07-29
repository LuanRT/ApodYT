import * as fs from 'fs';

import NasaApi from './NasaApi';
import HerokuApi from './HerokuApi';
import VideoFactory from './VideoFactory';

import { fetch } from 'undici';
import { tmpdir } from 'os';
import { Innertube, UniversalCache } from 'youtubei.js';
import { RecurrenceRule, scheduleJob } from 'node-schedule';
import { Credentials } from 'youtubei.js/dist/src/core/OAuth';
import { Readable } from 'stream';

(async () => {
  const yt = await Innertube.create({ cache: new UniversalCache() });

  yt.session.on('auth', (data: any) => console.info('Successfully logged in:', data));
  yt.session.on('update-credentials', (data: any) => HerokuApi.setCreds(data.credentials));
  yt.session.on('auth-pending', (data: any) => console.info(data));

  await yt.session.signIn(Reflect.has(process.env, 'access_token') ? {
    access_token: process.env.access_token,
    refresh_token: process.env.refresh_token,
    expires: new Date(process.env.expires || '')
  } as Credentials : undefined);
  
  const info = await yt.account.getInfo();
  console.info('Account info:', info);
  
  const upload_rule = new RecurrenceRule();
  upload_rule.hour = 7;
  upload_rule.minute = 30;
  upload_rule.tz = 'America/Bahia';

  scheduleJob(upload_rule, async () => {
    const apod = await NasaApi.getAPOD();

    const url: string =
      apod.media_type === 'image' ?
        apod.url : apod.thumbnail_url;

    const img_path = await download(url);

    const gen_video = await VideoFactory.render([ {
      path: img_path,
      caption: apod.title,
      captionStart: 4000,
      captionEnd: 11000
    } ]);

    // @ts-ignore
    const file = Readable.toWeb(fs.createReadStream(gen_video));

    const nasa_credit =
      'This can also be found at: https://apod.nasa.gov/apod/astropix.html\n' +
      `Image Credit & Copyright: ${apod.copyright}`;

    const song_credit =
      'Last And First Light by Scott Buckley | https://soundcloud.com/scottbuckley\n' +
      'Music promoted by https://www.free-stock-music.com\n' +
      'Attribution 4.0 International (CC BY 4.0)\n' +
      'https://creativecommons.org/licenses/by/4.0/';

    const description = `${apod.explanation}\n\n${nasa_credit}\n\n${song_credit}`;

    const upload = await yt.studio.upload(file, {
      title: `${apod.title}(see description)`,
      description: description,
      privacy: 'PUBLIC'
    });

    console.info('Video successfully uploaded:\n', upload);
  });
})();

async function download(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.body)
    throw new Error('Could not download image.');

  const reader = response.body.getReader();

  const path = `${tmpdir()}/.apod_gen_img.jpg`;
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