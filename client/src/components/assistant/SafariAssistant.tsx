"use client";

import { useState, useRef, useEffect } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_QUESTIONS = [
  "Which safari destinations do you offer?",
  "Tell me about the wildlife I can see.",
  "Help me plan a 5-day safari.",
  "Which packages are available?",
  "How does the Safari Map work?",
];

export default function SafariAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || isLoading) return;

    if (content.length > 2000) {
      setError("Message too long. Please keep it under 2000 characters.");
      return;
    }

    setError(null);
    const userMessage: ChatMessage = { role: "user", content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ messages: updatedMessages }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleSuggestionClick(question: string) {
    sendMessage(question);
  }

  function clearConversation() {
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-forest">
            Safari Assistant
          </h2>
          <p className="text-xs text-gray-500">
            Ask about destinations, wildlife, and trip planning
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            New conversation
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4" style={{ minHeight: "400px", maxHeight: "600px" }}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 text-center">
              <p className="text-lg font-medium text-forest">
                How can I help you plan your safari?
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Ask me anything about destinations, wildlife, or packages.
              </p>
            </div>

            <div className="grid w-full max-w-lg gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => handleSuggestionClick(question)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm text-forest transition-colors hover:border-champagne hover:bg-champagne/5"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-forest text-white"
                      : "bg-gray-100 text-forest"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-500">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-gray-100 px-6 py-2">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      <div className="border-t border-gray-100 px-6 py-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about destinations, wildlife, packages..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-forest outline-none focus:border-forest focus:ring-1 focus:ring-forest/20"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          AI responses are based on PE Falcon Safaris data. Verify important
          details before booking.
        </p>
      </div>
    </div>
  );
}
