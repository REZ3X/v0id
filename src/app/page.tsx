"use client";
import { useState, useEffect, useRef } from "react";
import { UserSession } from "@/models/User";
import AuthGuard from "@/components/auth/AuthGuard";
import Navbar from "@/components/shared/Navbar";
import Sidebar from "@/components/chats/SideBar";
import Image from "next/image";

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
  const [voidTyping, setVoidTyping] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [temporaryChat, setTemporaryChat] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [deletingChat, setDeletingChat] = useState<string | null>(null);
  const [showDevNotice, setShowDevNotice] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const formatMessageContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const text = part.slice(2, -2);
        return (
          <strong key={index} className="font-bold">
            {text}
          </strong>
        );
      } else if (part.startsWith("*") && part.endsWith("*")) {
        const text = part.slice(1, -1);
        return (
          <em key={index} className="italic">
            {text}
          </em>
        );
      } else {
        return part;
      }
    });
  };

  useEffect(() => {
    const hasSeenNotice = sessionStorage.getItem("devNoticeShown");

    if (!hasSeenNotice) {
      setShowDevNotice(true);
      sessionStorage.setItem("devNoticeShown", "true");
    }
  }, []);

  const dismissDevNotice = () => {
    setShowDevNotice(false);
  };

  useEffect(() => {
    fetchUser();
    fetchChats();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, voidTyping]);

  useEffect(() => {
    if (currentChat) {
      fetchMessages(currentChat);
    }
  }, [currentChat]);

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

      const tempUserMessage = {
        _id: new Date().toISOString(),
        content: inputMessage,
        role: "user" as const,
        createdAt: new Date(),
      };

      const currentInputMessage = inputMessage;
      setInputMessage("");

      if (temporaryChat) {
        setMessages([tempUserMessage]);

        setTimeout(() => {
          setVoidTyping(true);
        }, 500);

        const response = await fetch("/api/chats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "New Chat",
            firstMessage: currentInputMessage,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentChat(data.chatId);
          setTemporaryChat(false);
          setVoidTyping(false);

          const aiMessage = {
            _id: new Date().toISOString() + "-ai",
            content: data.response,
            role: "assistant" as const,
            createdAt: new Date(),
          };

          setMessages([tempUserMessage, aiMessage]);
          await fetchChats();

          if (data.title) {
            console.log(`Chat created with title: "${data.title}"`);
          }
        } else {
          setVoidTyping(false);
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

        setMessages((prev) => [...prev, tempUserMessage]);

        setTimeout(() => {
          setVoidTyping(true);
        }, 500);

        const response = await fetch(`/api/chats/${currentChat}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: currentInputMessage }),
        });

        if (response.ok) {
          const data = await response.json();
          setVoidTyping(false);

          const aiMessage = {
            _id: new Date().toISOString() + "-ai",
            content: data.response,
            role: "assistant" as const,
            createdAt: new Date(),
          };

          setMessages((prev) => [...prev, aiMessage]);
          fetchChats();
        } else {
          setVoidTyping(false);
          const errorData = await response.json();
          setError(errorData.error);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setVoidTyping(false);
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
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/25 animate-bounce mx-auto p-3">
              <Image
                src="/void/void.png"
                alt="Void AI"
                width={56}
                height={56}
                className="w-14 h-14 object-contain rounded-xl"
              />
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
                  ? "Void"
                  : "V0ID Chat"}
              </h1>
              <div className="w-9"></div>
            </div>

            <div className="hidden lg:flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {temporaryChat
                    ? "New Chat"
                    : currentChat
                    ? "Chat with Void"
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

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(148, 163, 184, 0.3);
                  border-radius: 20px;
                  border: 2px solid transparent;
                  background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(148, 163, 184, 0.5);
                  background-clip: content-box;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(71, 85, 105, 0.5);
                  background-clip: content-box;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(71, 85, 105, 0.7);
                  background-clip: content-box;
                }
                .custom-scrollbar {
                  scrollbar-width: thin;
                  scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
                }
                .dark .custom-scrollbar {
                  scrollbar-color: rgba(71, 85, 105, 0.5) transparent;
                }
              `}</style>

              {!currentChat && !temporaryChat ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md mx-auto px-6">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg p-3">
                      <Image
                        src="/void/void.png"
                        alt="Void AI"
                        width={56}
                        height={56}
                        className="w-14 h-14 object-contain rounded-xl"
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                      Welcome to V0ID Chat
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                      Start a conversation with Void, your personal AI companion
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
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg p-2.5">
                      <Image
                        src="/void/void.png"
                        alt="Void AI"
                        width={44}
                        height={44}
                        className="w-11 h-11 object-contain rounded-xl"
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {temporaryChat
                        ? "Start Your Conversation"
                        : "Chat with Void"}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      {temporaryChat
                        ? "Type your first message below to begin chatting with Void. Your conversation will be saved automatically."
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
                                : "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700"
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
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center shadow-sm p-1.5">
                                <Image
                                  src="/void/void.png"
                                  alt="Void AI"
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full object-cover shadow-sm"
                                />
                              </div>
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
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {formatMessageContent(message.content)}
                          </div>
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

                  {voidTyping && (
                    <div className="flex justify-start">
                      <div className="flex max-w-md">
                        <div className="flex-shrink-0 mr-3">
                          <Image
                            src="/void/void.png"
                            alt="Void AI"
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover shadow-sm"
                          />
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
                              Void is typing...
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
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={
                        temporaryChat
                          ? "Start your conversation with Void..."
                          : "Message Void..."
                      }
                      className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 shadow-sm"
                      disabled={
                        sending ||
                        voidTyping ||
                        (user?.role === "basic" && messages.length >= 50)
                      }
                    />
                    <button
                      onClick={sendMessage}
                      disabled={
                        sending ||
                        voidTyping ||
                        !inputMessage.trim() ||
                        (user?.role === "basic" && messages.length >= 50)
                      }
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        sending ||
                        voidTyping ||
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
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
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

        {showDevNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/20 dark:border-slate-700/50 relative">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  🚧 Development Version
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  V0ID is currently in alpha - expect bugs and changes!
                </p>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Some features may not work perfectly</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>App updates frequently</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Chats might be reset during updates</span>
                </div>
              </div>

              <button
                onClick={dismissDevNotice}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 px-4 rounded-xl font-medium hover:shadow-lg transition-all duration-200"
              >
                Got it! 🚀
              </button>

              <button
                onClick={dismissDevNotice}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Close"
              >
                <svg
                  className="w-4 h-4 text-slate-500 dark:text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

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
