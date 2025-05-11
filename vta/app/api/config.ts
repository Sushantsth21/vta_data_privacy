import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { MongoClient } from 'mongodb';

// Ensure the environment variables are defined
const PineconeApiKey: string | undefined = process.env.PINECONE_API_KEY;
const OpenaiApiKey: string | undefined = process.env.OPENAI_API_KEY;
const MongoDbUri: string | undefined = process.env.MONGO_DB_URI;

if (!PineconeApiKey) {
  throw new Error('PINECONE_API_KEY is not defined in the environment variables.');
}

if (!OpenaiApiKey) {
  throw new Error('OPENAI_API_KEY is not defined in the environment variables.');
}

if (!MongoDbUri) {
  throw new Error('MONGODB_URI is not defined in the environment variables.');
}

// Initialize Pinecone
export const pc = new Pinecone({
  apiKey: PineconeApiKey,
});

// Initialize OpenAI
export const openai = new OpenAI({
  apiKey: OpenaiApiKey,
});

// Initialize MongoDB Client
export const mongoClient = new MongoClient(MongoDbUri);

export async function connectToDatabase() {
  try {
    await mongoClient.connect();
    console.log('Connected to MongoDB successfully.');
    return mongoClient.db(); // Return the database instance
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}
