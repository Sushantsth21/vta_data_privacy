// app/api/openai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai, pc } from '../config';
import { connectToDatabase } from '../config';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';


type Message = ChatCompletionMessageParam;

interface ChatInteraction {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sessionId: string;
  rating?: 'helpful' | 'unhelpful';
  ratedAt?: Date;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
}

const SYSTEM_MESSAGE: Message = {
  role: 'system',
  content: `
  You are CyberTA, for professor Dr.Ankur Chattopadhyay, a specialized virtual teaching assistant for cybersecurity education. Your primary responsibility is to help students understand cybersecurity concepts using ONLY the course materials provided in the retrieved context.

CONTEXT HANDLING:
1. ALWAYS prioritize information from the retrieved course materials (textbooks, lecture slides, quizzes, syllabus) over your pre-trained knowledge.
2. When answering questions, first search the retrieved context for relevant information.
3. If the retrieved context doesn't contain information to answer the question completely, clearly state this limitation before providing general guidance.

RESPONSE STRUCTURE:
1. Begin with a direct answer to the student's question based on course materials.
2. Provide supporting explanations with specific references to course materials, if needed.
3. Include practical examples or applications that reinforce the concept.


PEDAGOGICAL APPROACH:
1. Break down complex topics into understandable components.
2. Connect new concepts to previously covered material in the course.
3. Use analogies relevant to cybersecurity to explain difficult concepts.
4. Encourage critical thinking by asking students to consider implications or applications of concepts.

Remember: Your purpose is to help students learn cybersecurity effectively by guiding them to understand and apply concepts from their course materials, not to replace those materials or their own critical thinking. And that you have a 1000 token limit for each response.

  `
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId = new Date().toISOString(), selectedOption = "syllabus" } = body;

    // Debugging: Log the request payload
    console.log("Request Payload:", body);

    if (!message?.trim()) {
      console.error("Validation Error: Message is required");
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!selectedOption?.trim()) {
      console.error("Validation Error: Selected option is required");
      return NextResponse.json(
        { error: 'Selected option is required' },
        { status: 400 }
      );
    }

    console.log("Selected Option:", selectedOption);

    const db = await connectToDatabase();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    const chatCollection = db.collection<ChatInteraction>('pilot');

    // Retrieve recent chat history for context
    const chatHistory = await chatCollection
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .toArray();

    // Format chat history with system message
    const formattedChatHistory: Message[] = [
      SYSTEM_MESSAGE,
      ...chatHistory.flatMap(entry => entry.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))),
      { role: 'user', content: message }
    ];

    async function processMessage(message: string) {
      const processedMessage = message.toLowerCase();
  
      // Regex to split sentences while handling abbreviations
      const sentences = processedMessage.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [processedMessage];
  
      return sentences.map(sentence => sentence.trim());
    }
  
    const processedMessage = await processMessage(message);
    console.log("Processed Message:", processedMessage);

    try {
      // Generate embedding and query index in parallel
      const [embeddingResponse, index] = await Promise.all([
        openai.embeddings.create({
          model: "text-embedding-3-small",
          input: processedMessage,
        }),
        pc.index("vta-data-privacy"),
      ]);

      const embedding = embeddingResponse.data[0].embedding;

      // Query the vector database
      const queryResponse = await index.namespace(selectedOption).query({
        vector: embedding,
        topK: 5,
        includeMetadata: true,
      });
      
      const metadataResults = queryResponse.matches.map(match => match.metadata);
      console.log("Metadata Results:", JSON.stringify(metadataResults));

      // Prepare messages for OpenAI API
      const messagesForAPI: Message[] = [
        ...formattedChatHistory,
        {
          role: 'user',
          content: `Context: ${JSON.stringify(metadataResults)}
Please use this context to inform your response to the user's latest message.`
        }
      ];

      // Get OpenAI response
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messagesForAPI,
        temperature: 0.5,
      });

      const reply = response.choices[0]?.message?.content;

      if (!reply) {
        throw new Error("Empty or invalid reply from OpenAI");
      }

      // Store user and assistant messages in a single document
      const chatInteractionResult = await chatCollection.insertOne({
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
        sessionId,
        messages: [
          {
            role: 'user',
            content: message,
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
          }
        ]
      });

      // Return the message ID to allow rating
      return NextResponse.json({
        reply,
        sessionId,
        messageId: chatInteractionResult.insertedId.toString(),
        history: formattedChatHistory
      });

    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : "Failed to process message with OpenAI"
      );
    }

  } catch (error) {
    console.error("Server Error:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "An unexpected error occurred";

    return NextResponse.json(
      { 
        error: errorMessage,
        reply: null,
        history: [] 
      },
      { status: 500 }
    );
  }
}