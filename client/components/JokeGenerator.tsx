'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import type { Joke } from '@/shared/types/joke';

export default function JokeGenerator() {
  const [joke, setJoke] = useState<Joke | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('Any');

  const fetchJoke = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/jokes/random?category=${category}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch joke');
      }
      
      const data = await response.json();
      setJoke(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setJoke(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-gray-800">
            😄 Joke Generator
          </CardTitle>
          <p className="text-gray-600 mt-2">Get a random joke powered by JokeAPI</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Category Selector */}
          <div className="flex gap-2 flex-wrap justify-center">
            {['Any', 'General', 'Programming', 'Knock-Knock'].map((cat) => (
              <Button
                key={cat}
                onClick={() => setCategory(cat)}
                variant={category === cat ? 'default' : 'outline'}
                className="transition-all"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Joke Display */}
          {joke && (
            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200 min-h-24 flex flex-col justify-center">
              {joke.type === 'twopart' ? (
                <>
                  <p className="text-lg text-gray-700 mb-4">
                    {joke.setup}
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {joke.delivery}
                  </p>
                </>
              ) : (
                <p className="text-xl font-bold text-blue-600">
                  {joke.joke}
                </p>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200 text-red-600">
              {error}
            </div>
          )}

          {/* Fetch Button */}
          <Button
            onClick={fetchJoke}
            disabled={loading}
            className="w-full py-6 text-lg font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Get a Joke
              </>
            )}
          </Button>

          {/* Info */}
          <p className="text-center text-sm text-gray-500">
            Powered by <a href="https://jokeapi.dev" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">JokeAPI</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}