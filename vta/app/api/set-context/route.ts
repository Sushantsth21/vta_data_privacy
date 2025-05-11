import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { selectedOption, sessionId } = body;

    // Debugging: Log the request payload
    console.log("Set Context Request:", body);

    if (!selectedOption?.trim()) {
      console.error("Validation Error: Selected option is required");
      return NextResponse.json(
        { error: 'Selected option is required' },
        { status: 400 }
      );
    }

    // Connect to database
    const db = await connectToDatabase();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    // Optional: Store the user's context preference in the database
    if (sessionId) {
      const sessionsCollection = db.collection('sessions');
      await sessionsCollection.updateOne(
        { sessionId },
        { 
          $set: { 
            selectedOption,
            updatedAt: new Date() 
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Context updated to ${selectedOption}`,
      selectedOption
    });
  } catch (error) {
    console.error("Server Error:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "An unexpected error occurred";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}