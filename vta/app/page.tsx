"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Sun,
  Moon,
  Menu,
  X,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
} from "lucide-react";

interface Message {
  sender: "user" | "bot";
  text: string;
  id?: string;
  rated?: boolean;
}

const Talk: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("syllabus");

  // Options mapping for display names
  const optionLabels: Record<string, string> = {
    "syllabus": "Course Syllabus",
    "module-1": "Module 1: Security & Crypto Concepts + Info/Data Privacy Concepts",
    "module-2": "Module 2: Privacy Requirements & Threats",
    "module-3": "Module 3: Technical Security Controls for Privacy",
    "module-4": "Module 4: Privacy Enhancing Technologies",
    "module-5": "Module 5: Info/Data Privacy Management",
    "module-6": "Module 6: Privacy Education, Protection & Incident Handling",
    "module-7": "Module 7: Legal & Regulatory Privacy Requirements",
  };

  useEffect(() => {
    setSessionId(new Date().toISOString());
    const fetchChatHistory = async () => {
      try {
        const response = await fetch("/api/chatHistory");
        if (!response.ok) throw new Error("Failed to fetch chat history");
        const data = await response.json();
        setMessages(data.history || []);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };
    fetchChatHistory();
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { sender: "user", text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, sessionId, selectedOption }),
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();

      const botMessage: Message = {
        sender: "bot",
        text: data.reply || "I'm not sure how to respond to that.",
        id: data.messageId || undefined, // Store the message ID from the response
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: "Error: Unable to process message." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle context change
  const changeContext = async (newContext: string) => {
    setSelectedOption(newContext);

    try {
      const response = await fetch("/api/set-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOption: newContext, sessionId }),
      });

      if (!response.ok) throw new Error("Failed to update context");

      // Optionally show a system message about the context change
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          sender: "bot",
          text: `Context switched to: ${optionLabels[newContext] || newContext}`,
        },
      ]);
    } catch (error) {
      console.error("Error changing context:", error);
    }
  };

  // Function to handle rating
  const rateMessage = async (
    messageId: string,
    rating: "helpful" | "unhelpful"
  ) => {
    if (!messageId) return;

    try {
      const response = await fetch("/api/rate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating }),
      });

      if (!response.ok) throw new Error("Failed to rate message");

      // Update the UI to show the message has been rated
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, rated: true } : msg
        )
      );
    } catch (error) {
      console.error("Error rating message:", error);
    }
  };

  // Sidebar Component
  const Sidebar = () => (
    <div
      className={`fixed md:static inset-y-0 left-0 z-30 w-64 transform ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      } transition-transform duration-300 ease-in-out ${
        darkMode ? "bg-black" : "bg-gray-50"
      } p-4 shadow-lg border-r ${
        darkMode ? "border-gray-800" : "border-gray-200"
      }`}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className={`font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
          Dashboard
        </h2>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-full ${
            darkMode
              ? "bg-gray-800 text-yellow-500 hover:bg-gray-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Current Selection Display */}
      <div
        className={`mb-4 p-3 rounded-lg flex items-center justify-between ${
          darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        } border ${darkMode ? "border-gray-700" : "border-gray-300"}`}
      >
        <span className="font-medium">Current Context:</span>
        <span className="text-yellow-500">
          {optionLabels[selectedOption] || selectedOption}
        </span>
      </div>

      {/* Dropdown with better styling */}
      <div
        className={`relative mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}
      >
        <label className="block text-sm font-medium mb-2">Change Context</label>
        <div className="relative">
          <select
            className={`appearance-none w-full p-3 pr-8 rounded-lg ${
              darkMode
                ? "bg-gray-800 text-white border-gray-700 focus:border-yellow-500"
                : "bg-white text-gray-900 border-gray-300 focus:border-yellow-600"
            } border focus:outline-none focus:ring-2 ${
              darkMode ? "focus:ring-yellow-500/20" : "focus:ring-yellow-600/20"
            }`}
            value={selectedOption}
            onChange={(e) => changeContext(e.target.value)}
          >
            <option value="syllabus">Course Syllabus</option>
            <option value="module-1">
              Module 1: Security & Crypto Concepts + Info/Data Privacy Concepts
            </option>
            <option value="module-2">
              Module 2: Privacy Requirements & Threats
            </option>
            <option value="module-3">Module 3: Technical Security Controls for Privacy</option>
            <option value="module-4">
              Module 4: Privacy Enhancing Technologies
            </option>
            <option value="module-5">Module 5: Info/Data Privacy Management</option>
            <option value="module-6">
              Module 6: Privacy Education, Protection & Incident Handling
            </option>
            <option value="module-7">
              Module 7: Legal & Regulatory Privacy Requirements
            </option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
            <ChevronDown
              className={`h-4 w-4 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            />
          </div>
        </div>
        <div className="">
          <h2 className={`mt-4 text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
            Learn to use this MCY 620 Chatbot?
          </h2>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen ${darkMode ? "bg-gray-900" : "bg-white"} transition-colors duration-300`}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className={`p-4 border-b ${darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`md:hidden p-2 rounded-lg ${
                darkMode ? "text-white hover:bg-gray-800" : "text-gray-900 hover:bg-gray-100"
              }`}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className={`p-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <h1 className="text-lg font-semibold">Cybersecurity Assistant</h1>
              <p className="text-sm">AI-powered assistant for Data Privacy (MCY 620)</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] md:max-w-[70%] p-3 rounded-xl ${
                  msg.sender === "user"
                    ? "bg-yellow-500 text-black"
                    : darkMode
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-900 shadow-md"
                }`}
              >
                <div className="flex flex-col">
                  <div>{msg.text}</div>

                  {/* Rating buttons for bot messages only */}
                  {msg.sender === "bot" && msg.id && !msg.rated && (
                    <div className="flex justify-end mt-2 space-x-2">
                      <button
                        onClick={() => rateMessage(msg.id!, "helpful")}
                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-green-500 transition-colors"
                        aria-label="Helpful"
                      >
                        <ThumbsUp size={16} />
                      </button>
                      <button
                        onClick={() => rateMessage(msg.id!, "unhelpful")}
                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Unhelpful"
                      >
                        <ThumbsDown size={16} />
                      </button>
                    </div>
                  )}

                  {/* Show a "rated" indicator after rating */}
                  {msg.sender === "bot" && msg.rated && (
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      Thanks for your feedback
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white shadow-md"}`}>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`p-4 ${darkMode ? "bg-black" : "bg-white"} border-t ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage(e)}
              placeholder="Type a message..."
              className={`flex-1 p-3 rounded-xl ${
                darkMode
                  ? "bg-gray-800 text-white border-gray-700 placeholder-gray-500"
                  : "bg-gray-100 text-gray-900 border-gray-300 placeholder-gray-400"
              } border`}
            />
            <button
              onClick={sendMessage}
              className="px-4 bg-yellow-500 text-black rounded-xl hover:bg-yellow-600 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Talk;