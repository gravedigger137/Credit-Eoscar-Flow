# Joke Generator Feature

A fully functional joke generator using the JokeAPI external API.

## Setup Instructions

### 1. Backend Integration

Add this to your Express server setup (e.g., `server/index.ts` or `server/app.ts`):

```typescript
import jokeRoutes from './routes/jokes';

app.use('/api/jokes', jokeRoutes);
```

### 2. Frontend Integration

Use the component in your app:

```typescript
import JokeGenerator from '@/client/components/JokeGenerator';

export default function App() {
  return <JokeGenerator />;
}
```

## Features

✅ **External API Integration** - Uses JokeAPI v2 (https://jokeapi.dev)  
✅ **Category Support** - Any, General, Programming, Knock-Knock  
✅ **Error Handling** - Graceful error messages and retry logic  
✅ **Loading States** - Beautiful loading spinner  
✅ **Content Filtering** - Filters out explicit/NSFW content  
✅ **Type Safety** - Full TypeScript support  
✅ **Responsive Design** - Works on all device sizes  
✅ **UI Components** - Uses your existing shadcn/ui components  

## API Endpoints

- `GET /api/jokes/random` - Get a random joke from any category
- `GET /api/jokes/random?category=Programming` - Get a joke from specific category

## Files Added

- `client/components/JokeGenerator.tsx` - React component
- `server/routes/jokes.ts` - Backend API routes
- `shared/types/joke.ts` - TypeScript type definitions

## Dependencies

No additional dependencies needed! Uses:
- `fetch` API (Node.js 18+)
- Your existing `express`, `react`, and `shadcn/ui`

## Deployment on Your Domain

1. Deploy to your hosting (Vercel, Railway, etc.)
2. Point your domain to the deployment
3. The API will work automatically

## Example Request/Response

```bash
curl https://yourdomain.com/api/jokes/random?category=Programming
```

```json
{
  "type": "twopart",
  "setup": "Why do programmers prefer dark mode?",
  "delivery": "Because light attracts bugs!",
  "category": "Programming",
  "id": 17,
  "safe": true
}
```

## Ready to Deploy!

Your joke generator is production-ready. Just merge this branch and deploy!
