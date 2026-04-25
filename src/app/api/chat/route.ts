import { NextResponse } from "next/server";

type ChatRequestBody = {
  message?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;

  const userMessage = body.message?.trim();

  if (!userMessage) {
    return NextResponse.json(
      {
        error: "Message is required.",
      },
      {
        status: 400,
      },
    );
  }

  return NextResponse.json({
    role: "assistant",
    content:
      "This response came from the backend API route. Later, this route will search Terraria wiki data and generate a better answer.",
  });
}