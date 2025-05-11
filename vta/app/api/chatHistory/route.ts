// app/api/chatHistory/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '../config';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const clearHistory = url.searchParams.get('clear') === 'true';
    
    // Get the session ID from cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sessionId')?.value || 'default-session';
    
    const db = await connectToDatabase();
    if (!db) {
      throw new Error('Failed to connect to database');
    }
    
    const chatCollection = db.collection('mcy620');

    if (clearHistory) {
      // Only clear history for current session
      await chatCollection.deleteMany({ sessionId });
      return NextResponse.json({
        history: []
      });
    }
    
    // Get the most recent 20 messages for current session only
    const history = await chatCollection
      .find({ sessionId })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();
    
    // Transform to frontend format and reverse to get chronological order
    const formattedHistory = history
      .reverse()
      .flatMap(entry => entry.messages.map((msg: { role: string; content: string }) => ({
        sender: msg.role === 'user' ? 'user' : 'bot',
        text: msg.content,
        id: entry.role === 'assistant' ? entry._id.toString() : undefined,
        rated: entry.rating ? true : false
      })));
    
    return NextResponse.json({
      history: formattedHistory
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    
    // Return empty history instead of error to prevent blocking the chat interface
    return NextResponse.json({
      history: []
    });
  }
}

// Add an endpoint to fetch rating statistics
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    const db = await connectToDatabase();
    if (!db) {
      throw new Error('Failed to connect to database');
    }
    
    const chatCollection = db.collection("mcy620");
    
    // Get rating statistics for the current session
    const stats = await chatCollection.aggregate([
      { $match: { 
          role: 'assistant', 
          rating: { $exists: true },
          sessionId: sessionId || { $exists: true }
        }
      },
      { $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    // Format the statistics
    const ratingStats = {
      helpful: stats.find(item => item._id === 'helpful')?.count || 0,
      unhelpful: stats.find(item => item._id === 'unhelpful')?.count || 0,
      total: stats.reduce((acc, curr) => acc + curr.count, 0)
    };
    
    return NextResponse.json({
      stats: ratingStats
    });
  } catch (error) {
    console.error("Error fetching rating statistics:", error);
    
    return NextResponse.json(
      { error: "Failed to retrieve rating statistics" },
      { status: 500 }
    );
  }
}