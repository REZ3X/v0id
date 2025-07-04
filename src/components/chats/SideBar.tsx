"use client";
import { useState, useMemo, useEffect } from "react";
import Image from "next/image";

interface Chat {
  _id: string;
  title: string;
  updatedAt: string;
}

interface SidebarProps {
  userId: string;
  userRole: string;
  chats: Chat[];
  currentChat: string | null;
  onChatSelect: (chatId: string) => void;
  onChatCreate: () => void;
  onChatDelete: (chatId: string) => void;
  onRequestDelete: (chat: Chat) => void;
  loading: boolean;
  onClose?: () => void;
  deletingChat?: string | null;
}

export default function Sidebar({
  userRole,
  chats,
  currentChat,
  onChatSelect,
  onChatCreate,
  onRequestDelete,
  loading,
  onClose,
  deletingChat,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);

  useEffect(() => {
    const REFRESH_INTERVAL = 60 * 60 * 1000;
    const now = new Date();
    const nextRefresh = new Date(now.getTime() + REFRESH_INTERVAL);
    setNextRefreshTime(nextRefresh);

    const autoRefreshInterval = setInterval(() => {
      console.log("Auto-refreshing V0ID...");
      window.location.reload();
    }, REFRESH_INTERVAL);

    const countdownInterval = setInterval(() => {
      const now = new Date();
      const nextRefresh = new Date(now.getTime() + REFRESH_INTERVAL);
      setNextRefreshTime(nextRefresh);
    }, 60000);
    return () => {
      clearInterval(autoRefreshInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  const getTimeUntilRefresh = () => {
    if (!nextRefreshTime) return "";

    const now = new Date();
    const diff = nextRefreshTime.getTime() - now.getTime();

    if (diff <= 0) return "Refreshing soon...";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);

    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleDeleteClick = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestDelete(chat);
  };

  const truncateTitle = (title: string, maxLength: number = 25) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength).trim() + "...";
  };

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;

    const query = searchQuery.toLowerCase().trim();

    return chats
      .filter((chat) => {
        const title = chat.title.toLowerCase();

        if (title === query) return true;

        if (title.startsWith(query)) return true;

        const titleWords = title.split(/\s+/);
        if (titleWords.some((word) => word.startsWith(query))) return true;

        if (title.includes(query)) return true;

        const queryWords = query.split(/\s+/);
        if (queryWords.length > 1) {
          return queryWords.every((queryWord) =>
            titleWords.some(
              (titleWord) =>
                titleWord.includes(queryWord) || queryWord.includes(titleWord)
            )
          );
        }

        if (query.length >= 3) {
          let matchScore = 0;
          let queryIndex = 0;

          for (let i = 0; i < title.length && queryIndex < query.length; i++) {
            if (title[i] === query[queryIndex]) {
              matchScore++;
              queryIndex++;
            }
          }

          return matchScore / query.length >= 0.7;
        }

        return false;
      })
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();

        if (aTitle === query && bTitle !== query) return -1;
        if (bTitle === query && aTitle !== query) return 1;

        const aStarts = aTitle.startsWith(query);
        const bStarts = bTitle.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
  }, [chats, searchQuery]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span
          key={index}
          className="bg-yellow-200 dark:bg-yellow-800/50 px-0.5 rounded"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case "dev":
        return "bg-gradient-to-r from-purple-600 to-indigo-600 text-white";
      case "premium":
        return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white";
      case "basic":
      default:
        return "bg-gradient-to-r from-slate-500 to-slate-600 text-white";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "dev":
        return "⚡";
      case "premium":
        return "✨";
      case "basic":
      default:
        return "👤";
    }
  };

  const getChatLimits = () => {
    switch (userRole) {
      case "dev":
        return { chatLimit: Infinity, messageLimit: Infinity };
      case "premium":
        return { chatLimit: 10, messageLimit: Infinity };
      case "basic":
      default:
        return { chatLimit: 3, messageLimit: 50 };
    }
  };

  const limits = getChatLimits();

  return (
    <div className="h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-lg">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg p-2">
              <Image
                src="/void/void.png"
                alt="Void AI"
                width={24}
                height={24}
                className="w-6 h-6 object-contain rounded-lg"
              />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                V0ID Chat
              </h2>
              <div
                className={`inline-flex items-center space-x-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleStyle(
                  userRole
                )}`}
              >
                <span>{getRoleIcon(userRole)}</span>
                <span className="capitalize">{userRole}</span>
              </div>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="mb-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Refresh V0ID (Auto-refresh in 1 hour)"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-500 ${
                isRefreshing ? "animate-spin" : "group-hover:rotate-180"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-xs font-medium">
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>

          <div className="mt-1 text-center">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Auto-refresh: {getTimeUntilRefresh()}
            </span>
          </div>
        </div>

        <button
          onClick={onChatCreate}
          disabled={
            limits.chatLimit !== Infinity && chats.length >= limits.chatLimit
          }
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mb-4"
        >
          <div className="flex items-center justify-center space-x-2">
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>New Chat</span>
          </div>
        </button>

        <div className="relative mb-4">
          <div
            className={`relative flex items-center transition-all duration-200 ${
              searchFocus
                ? "ring-2 ring-purple-500/20 border-purple-500"
                : "border-slate-300 dark:border-slate-600"
            } border rounded-xl bg-white dark:bg-slate-900`}
          >
            <svg
              className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              className="flex-1 px-3 py-2.5 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="p-1 mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg
                  className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
            )}
          </div>

          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 px-1">
                {filteredChats.length === 0
                  ? "No chats found"
                  : `${filteredChats.length} of ${chats.length} chat${
                      chats.length !== 1 ? "s" : ""
                    }`}
              </div>
            </div>
          )}
        </div>

        {limits.chatLimit !== Infinity && (
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
              <span>Chats</span>
              <span>
                {chats.length}/{limits.chatLimit}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (chats.length / limits.chatLimit) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-1/2"></div>
              </div>
            ))
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                {searchQuery ? (
                  <svg
                    className="w-6 h-6 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 text-slate-400"
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
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {searchQuery ? "No matching chats" : "No chats yet"}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {searchQuery
                  ? "Try a different search term"
                  : "Start your first conversation!"}
              </p>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="mt-3 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat._id}
                className={`relative group rounded-xl transition-all duration-200 ${
                  currentChat === chat._id
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
                }`}
              >
                <div
                  onClick={() => onChatSelect(chat._id)}
                  className="w-full text-left p-3 cursor-pointer pr-10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-medium text-sm mb-1 leading-relaxed"
                        title={chat.title}
                      >
                        {searchQuery
                          ? highlightText(
                              truncateTitle(chat.title),
                              searchQuery
                            )
                          : truncateTitle(chat.title)}
                      </h3>
                      <p
                        className={`text-xs truncate ${
                          currentChat === chat._id
                            ? "text-purple-100"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {new Date(chat.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteClick(chat, e)}
                  disabled={deletingChat === chat._id}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-200 ${
                    currentChat === chat._id
                      ? "hover:bg-white/20 text-white/80 hover:text-white"
                      : "hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                  }`}
                  title="Delete chat"
                >
                  {deletingChat === chat._id ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg
                      className="w-3 h-3"
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
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Powered by V0ID AI
          </p>
          {userRole === "basic" && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p className="mb-1">Need more chats?</p>
              <div className="inline-flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-purple-200 dark:border-purple-700/50">
                <svg
                  className="w-3 h-3 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-purple-700 dark:text-purple-300 font-medium">
                  Premium Coming Soon
                </span>
                <span className="text-purple-600 dark:text-purple-400">✨</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
