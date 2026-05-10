import express, { Router, Request, Response } from 'express';

const router = Router();

const JOKEAPI_BASE = 'https://v2.jokeapi.dev/joke';

interface JokeAPIResponse {
  error: boolean;
  category?: string;
  type?: string;
  setup?: string;
  delivery?: string;
  joke?: string;
  flags?: {
    nsfw: boolean;
    religious: boolean;
    political: boolean;
    racist: boolean;
    sexist: boolean;
    explicit: boolean;
  };
  id?: number;
}

// GET /api/jokes/random - Get a random joke
router.get('/random', async (req: Request, res: Response) => {
  try {
    const { category = 'Any' } = req.query;
    
    // Validate category
    const validCategories = ['Any', 'General', 'Programming', 'Knock-Knock'];
    if (!validCategories.includes(category as string)) {
      return res.status(400).json({ error: `Invalid category. Valid: ${validCategories.join(', ')}` });
    }
    
    const url = `${JOKEAPI_BASE}/${category}?type=single,twopart&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch from JokeAPI');
    }
    
    const data: JokeAPIResponse = await response.json();
    
    if (data.error) {
      return res.status(404).json({ error: `No joke found in ${category} category` });
    }
    
    // Filter out explicit content
    if (data.flags?.explicit || data.flags?.nsfw) {
      // Recursively fetch another joke
      return res.redirect(`/api/jokes/random?category=${category}`);
    }
    
    res.json({
      type: data.type,
      setup: data.setup,
      delivery: data.delivery,
      joke: data.joke,
      category: data.category,
      id: data.id,
      safe: !data.flags?.explicit && !data.flags?.nsfw,
    });
  } catch (error) {
    console.error('Joke API Error:', error);
    res.status(500).json({ error: 'Failed to fetch joke' });
  }
});

export default router;