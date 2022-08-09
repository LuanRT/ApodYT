// TODO: Maybe get rid of videoshow and render the video using ffmpeg alone or use something else.

// @ts-ignore
import videoshow from 'videoshow';
import { tmpdir } from 'os';

export default class VideoFactory {
  static render(images: object[], audio: { path: string, duration: number }): Promise<string> {
    return new Promise((resolve, reject) => {
      const settings = {
        fps: 15,
        loop: audio.duration + 10,
        transition: true,
        transitionDuration: 2,
        videoBitrate: 4024,
        videoCodec: 'libx264',
        size: '1080x?',
        audioBitrate: '128k',
        audioChannels: 2,
        format: 'mp4',
        pixelFormat: 'yuv420p',
        captionDelay: 450,
        useSubRipSubtitles: false,
        subtitleStyle: {
          Fontname: 'Verdana',
          Fontsize: '25',
          PrimaryColour: '16777215',
          SecondaryColour: '11861244',
          TertiaryColour: '11861244',
          BackColour: '-2147483640',
          Bold: '2',
          Italic: '0',
          BorderStyle: '2',
          Outline: '2',
          Shadow: '3',
          Alignment: '1',
          MarginL: '40',
          MarginR: '60',
          MarginV: '40'
        }
      };

      videoshow(images, settings)
        .audio(audio.path)
        .save(`${tmpdir()}/${Date.now()}.mp4`)
        .on('error', (err: any) => reject(err))
        .on('end', (output: string) => resolve(output));
    });
  }
}