"use client";

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
  const handleDeleteClick = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestDelete(chat);
  };

  const truncateTitle = (title: string, maxLength: number = 25) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength).trim() + "...";
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
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-5 h-5 text-white"
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

        <button
          onClick={onChatCreate}
          disabled={
            limits.chatLimit !== Infinity && chats.length >= limits.chatLimit
          }
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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

        {limits.chatLimit !== Infinity && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
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
          ) : chats.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3">
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
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                No chats yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Start your first conversation!
              </p>
            </div>
          ) : (
            chats.map((chat) => (
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
                        className="font-medium text-sm mb-1"
                        title={chat.title}
                      >
                        {truncateTitle(chat.title)}
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
                  className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                    currentChat === chat._id
                      ? "hover:bg-white/20 text-white"
                      : "hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                  }`}
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
              <p>Need more chats?</p>
              <a
                href="/upgrade"
                className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                Upgrade to Premium
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
