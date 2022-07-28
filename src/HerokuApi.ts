import { fetch } from 'undici';
import { Credentials } from 'youtubei.js/dist/src/core/OAuth';

export default class HerokuApi {
  static #key: string | undefined = process.env.KEY;
  static #app_name: string | undefined = process.env.APP_NAME;

  static async setCreds(creds: Credentials): Promise<{ [key: string ]: string | Date }> {
    if (!this.#key || !this.#app_name)
      throw new Error('Both app name and API key must be provided.');

    const response = await fetch(`https://api.heroku.com/apps/${this.#app_name}/config-vars`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.heroku+json; version=3',
        'Authorization': `Bearer ${this.#key}`
      },
      body: JSON.stringify(creds)
    });

    if (!response.ok)
      throw new Error('Could not set config variables');

    const data = await response.text();

    return JSON.parse(data);
  }
}