import { fetch } from 'undici';

export interface ApodResponse {
  copyright: string;
  date: string;
  explanation: string;
  media_type: string;
  service_version: string;
  thumbnail_url: string;
  title: string;
  url: string;
}

export default class NasaApi {
  static #key: string | undefined = process.env.NASA_API_KEY;

  static async getAPOD(): Promise<ApodResponse> {
    if (!this.#key)
      throw new Error('A NASA API key must be provided.');

    const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${this.#key}&thumbs=true`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok)
      throw new Error('Could not get picture of the day.');

    const data = await response.text();

    return JSON.parse(data);
  }
}
