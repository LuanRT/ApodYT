import * as fs from 'fs';
import { fetch } from 'undici';

export default class TTSApi {
  /**
   * Converts text into speech using Google Translate's private API.
   */
  static async speak(text: string, file_path: string): Promise<string> {
    const sentences = TTSApi.tokenizeText(text.trim());

    let index = 0;

    for (const sentence of sentences) {
      const writeable_stream = fs.createWriteStream(file_path, { flags: index > 0 ? 'a' : 'w' });

      try {
        const response = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&q=${sentence}&tl=en-UK&total=1&idx=${index}&textlen=${sentence.length}&client=tw-ob&prev=input&ttsspeed=1`);

        if (!response.body)
          throw new Error(`Could not synthesize text.\n${index} - ${sentence}`);

        const reader = response.body.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            writeable_stream.write(value);
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        console.warn('Could not synthesize sentence:', `${index} - ${sentence}`);
      }

      index += 1;
    }

    return file_path;
  }

  /**
   * Splits given text into sentences.
   */
  static tokenizeText(text: string) {
    const tokens = text.trim().split('');

    const stop_tokens: string[] = [ '.', '?', '!' ];

    let sentence_tokens: string[] = [];
    const sentences: string[] = [];

    tokens.forEach((token) => {
      if (stop_tokens.includes(token)) {
        sentences.push(`${sentence_tokens.join('').trim()}${token}`);
        sentence_tokens = [];
      } else {
        sentence_tokens.push(token);
      }
    });

    return sentences;
  }
}