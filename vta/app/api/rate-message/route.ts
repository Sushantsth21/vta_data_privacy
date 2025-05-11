// app/api/rate-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../config';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, rating } = body;

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    if (rating !== 'helpful' && rating !== 'unhelpful') {
      return NextResponse.json(
        { error: 'Rating must be either "helpful" or "unhelpful"' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    const chatCollection = db.collection('mcy620');

    // Update the message with the rating
    const result = await chatCollection.updateOne(
      { _id: new ObjectId(messageId) },
      { 
        $set: { 
          rating,
          ratedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rating saved successfully'
    });

  } catch (error) {
    console.error("Error rating message:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "An unexpected error occurred";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}    