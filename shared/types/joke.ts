/**
 * Joke types from JokeAPI
 */

export interface JokeTwoPart {
  type: 'twopart';
  setup: string;
  delivery: string;
  category: string;
  id: number;
  safe: boolean;
  lang: string;
}

export interface JokeSingle {
  type: 'single';
  joke: string;
  category: string;
  id: number;
  safe: boolean;
  lang: string;
}

export type Joke = JokeTwoPart | JokeSingle;

export interface JokeError {
  error: boolean;
  message: string;
}

export type JokeResponse = Joke | JokeError;