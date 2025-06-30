"use client";
import { useState, useEffect, useRef } from "react";
import { UserSession } from "@/models/User";
import AuthGuard from "@/components/auth/AuthGuard";
import Navbar from "@/components/shared/Navbar";
import Sidebar from "@/components/chats/SideBar";

interface Message {
  _id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
}

interface Chat {
  _id: string;
  title: string;
  updatedAt: string;
}

export default function Home() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [temporaryChat, setTemporaryChat] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [deletingChat, setDeletingChat] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchUser();
    fetchChats();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (currentChat) {
      fetchMessages(currentChat);
    }
  }, [currentChat]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [inputMessage]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    try {
      const response = await fetch("/api/chats");
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats);

        if (data.chats.length > 0 && !currentChat) {
          setCurrentChat(data.chats[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const createNewChat = async () => {
    try {
      if (user?.role === "basic" && chats.length >= 3) {
        setError(
          "You've reached your chat limit. Upgrade to premium for more chats."
        );
        return;
      }

      if (user?.role === "premium" && chats.length >= 10) {
        setError(
          "You've reached your chat limit. Upgrade to dev for unlimited chats."
        );
        return;
      }

      setTemporaryChat(true);
      setCurrentChat(null);
      setMessages([]);
      setSidebarOpen(false);
      setError(null);
    } catch (error) {
      console.error("Failed to create temporary chat:", error);
      setError("An error occurred while starting a new chat.");
    }
  };

  const handleDeleteRequest = (chat: Chat) => {
    setChatToDelete(chat);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!chatToDelete) return;

    setDeletingChat(chatToDelete._id);
    setShowDeleteModal(false);

    try {
      const response = await fetch(`/api/chats/${chatToDelete._id}/delete`, {
        method: "DELETE",
      });

      if (response.ok) {
        handleChatDelete(chatToDelete._id);
      } else {
        console.error("Failed to delete chat");
        setError("Failed to delete chat. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      setError("An error occurred while deleting the chat.");
    } finally {
      setDeletingChat(null);
      setChatToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setChatToDelete(null);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      setSending(true);
      setError(null);

      if (temporaryChat) {
        const response = await fetch("/api/chats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "New Chat",
            firstMessage: inputMessage,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentChat(data.chatId);
          setTemporaryChat(false);

          const tempUserMessage = {
            _id: new Date().toISOString(),
            content: inputMessage,
            role: "user" as const,
            createdAt: new Date(),
          };

          const aiMessage = {
            _id: new Date().toISOString() + "-ai",
            content: data.response,
            role: "assistant" as const,
            createdAt: new Date(),
          };

          setMessages([tempUserMessage, aiMessage]);
          setInputMessage("");
          await fetchChats();

          if (data.title) {
            console.log(`Chat created with title: "${data.title}"`);
          }
        } else {
          const errorData = await response.json();
          setError(errorData.error);
        }
      } else {
        if (!currentChat) return;

        if (user?.role === "basic" && messages.length >= 50) {
          setError(
            "You've reached the message limit for this chat. Upgrade to premium for unlimited messages."
          );
          return;
        }

        const tempUserMessage = {
          _id: new Date().toISOString(),
          content: inputMessage,
          role: "user" as const,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, tempUserMessage]);
        setInputMessage("");

        const response = await fetch(`/api/chats/${currentChat}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: inputMessage }),
        });

        if (response.ok) {
          const data = await response.json();

          const aiMessage = {
            _id: new Date().toISOString() + "-ai",
            content: data.response,
            role: "assistant" as const,
            createdAt: new Date(),
          };

          setMessages((prev) => [...prev, aiMessage]);
          fetchChats();
        } else {
          const errorData = await response.json();
          setError(errorData.error);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setError("An error occurred while sending message");
    } finally {
      setSending(false);
    }
  };

  const selectChat = (chatId: string) => {
    setCurrentChat(chatId);
    setTemporaryChat(false);
    setSidebarOpen(false);
  };

  const handleChatDelete = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat._id !== chatId));

    if (currentChat === chatId) {
      setCurrentChat(null);
      setMessages([]);
    }

    setError(null);
  };

  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength).trim() + "...";
  };

  const formatTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/25 animate-bounce mx-auto">
              <svg
                className="w-10 h-10 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <p className="text-purple-200 font-medium text-lg mb-4">
            Loading V0ID...
          </p>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col relative">
        <Navbar />

        <div className="flex flex-1 overflow-hidden">
          <div
            className={`${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } lg:translate-x-0 fixed lg:relative inset-y-0 left-0 z-40 w-80 lg:w-72 transition-transform duration-300 ease-in-out`}
          >
            <Sidebar
              userId={user?.id || ""}
              userRole={user?.role || "basic"}
              chats={chats}
              currentChat={currentChat}
              onChatSelect={selectChat}
              onChatCreate={createNewChat}
              onChatDelete={handleChatDelete}
              onRequestDelete={handleDeleteRequest}
              loading={loading}
              onClose={() => setSidebarOpen(false)}
              deletingChat={deletingChat}
            />
          </div>

          <div className="flex-1 flex flex-col relative">
            <div className="lg:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h1 className="font-semibold text-slate-900 dark:text-slate-100">
                {temporaryChat
                  ? "New Chat"
                  : currentChat
                  ? "Aria"
                  : "V0ID Chat"}
              </h1>
              <div className="w-9"></div>
            </div>

            <div className="hidden lg:flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {temporaryChat
                    ? "New Chat"
                    : currentChat
                    ? "Chat with Aria"
                    : "Welcome to V0ID"}
                </h2>
              </div>

              {user?.role === "basic" && (currentChat || temporaryChat) && (
                <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                  {messages.length}/50 messages
                </div>
              )}
            </div>

            {error && (
              <div className="mx-4 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-red-700 dark:text-red-200">
                      {error}
                    </p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto flex-shrink-0 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors"
                  >
                    <svg
                      className="h-4 w-4 text-red-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {!currentChat && !temporaryChat ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md mx-auto px-6">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                      Welcome to V0ID Chat
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                      Start a conversation with Aria, your personal AI companion
                      who&lsquo;s here to chat, listen, and support you.
                    </p>
                    <button
                      onClick={createNewChat}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Start New Conversation
                    </button>
                  </div>
                </div>
              ) : messages.length === 0 && (temporaryChat || currentChat) ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md mx-auto px-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {temporaryChat
                        ? "Start Your Conversation"
                        : "Chat with Aria"}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      {temporaryChat
                        ? "Type your first message below to begin chatting with Aria. Your conversation will be saved automatically."
                        : "Your caring AI companion is ready to chat. Share your thoughts, ask questions, or just have a friendly conversation."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  {messages.map((message, index) => (
                    <div
                      key={message._id?.toString() || index}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex max-w-[85%] sm:max-w-md lg:max-w-2xl ${
                          message.role === "user"
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 ${
                            message.role === "user" ? "ml-3" : "mr-3"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                              message.role === "user"
                                ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                                : "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {message.role === "user" ? (
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </div>

                        <div
                          className={`px-4 py-3 rounded-2xl shadow-sm ${
                            message.role === "user"
                              ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                              : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                          <p
                            className={`text-xs mt-2 ${
                              message.role === "user"
                                ? "text-purple-100"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="flex max-w-md">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-slate-600 dark:text-slate-300"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              Aria is typing...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {(currentChat || temporaryChat) && (
              <div className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700">
                <div className="max-w-4xl mx-auto">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={
                        temporaryChat
                          ? "Start your conversation with Aria..."
                          : "Message Aria..."
                      }
                      className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 shadow-sm"
                      rows={1}
                      style={{ minHeight: "48px", maxHeight: "120px" }}
                      disabled={
                        sending ||
                        (user?.role === "basic" && messages.length >= 50)
                      }
                    />
                    <button
                      onClick={sendMessage}
                      disabled={
                        sending ||
                        !inputMessage.trim() ||
                        (user?.role === "basic" && messages.length >= 50)
                      }
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        sending ||
                        !inputMessage.trim() ||
                        (user?.role === "basic" && messages.length >= 50)
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:scale-105"
                      }`}
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  {user?.role === "basic" && (currentChat || temporaryChat) && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {messages.length}/50 messages used
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 lg:hidden bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>

        {showDeleteModal && chatToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/20 dark:border-slate-700/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Delete Chat
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  Are you sure you want to delete this chat?
                </p>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 mb-6">
                  <p
                    className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate"
                    title={chatToDelete.title}
                  >
                    &ldquo;{truncateTitle(chatToDelete.title, 30)}&rdquo;
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(chatToDelete.updatedAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mb-6">
                  This action cannot be undone. All messages in this chat will
                  be permanently deleted.
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium shadow-lg hover:shadow-red-500/25"
                  >
                    Delete Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
