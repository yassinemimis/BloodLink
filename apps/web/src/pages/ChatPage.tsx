import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate }  from 'react-router-dom';
import { Send, ArrowLeft, Phone, Clock, CheckCheck, Check, Loader2 } from 'lucide-react';
import toast                       from 'react-hot-toast';
import { useAuthStore }            from '../store/useAuthStore';
import { useSocket }               from '../hooks/useSocket';
import api                         from '../services/api';
import { BLOOD_GROUP_LABELS }      from '../types';

interface Message {
  id:        string;
  content:   string;
  senderId:  string;
  isRead:    boolean;
  createdAt: string;
  sender: { id:string; firstName:string; lastName:string; avatar?:string; role:string };
}

interface Conversation {
  donationId: string; requestId: string; hospital: string;
  bloodGroup: string; status: string;
  otherUser: { id:string; firstName:string; lastName:string; avatar?:string };
  lastMessage: { content:string; senderName:string; createdAt:string } | null;
  unreadCount: number;
}

// ─── Conversations List ───────────────────────────────────────
function ConversationsList({ onSelect, selected }: {
  onSelect: (c: Conversation) => void;
  selected: string | null;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    api.get('/chat/conversations')
      .then((r) => setConversations(r.data))
      .catch(() => toast.error('Erreur chargement conversations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 animate-spin text-blood-600" />
    </div>
  );

  if (conversations.length === 0) return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
        <span className="text-3xl">💬</span>
      </div>
      <p className="font-medium text-gray-700 dark:text-gray-300">Aucune conversation</p>
      <p className="text-sm text-gray-400 mt-1">Les chats s'ouvrent après acceptation d'un don</p>
    </div>
  );

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {conversations.map((c) => (
        <button key={c.donationId} onClick={() => onSelect(c)}
          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left
            ${selected === c.donationId ? 'bg-blood-50 dark:bg-blood-950 border-r-2 border-blood-600' : ''}`}>
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">
            {c.otherUser?.avatar
              ? <img src={c.otherUser.avatar} className="w-full h-full object-cover rounded-full" />
              : `${c.otherUser?.firstName?.[0] || ''}${c.otherUser?.lastName?.[0] || ''}`
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                {c.otherUser?.firstName} {c.otherUser?.lastName}
              </p>
              {c.lastMessage && (
                <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                  {new Date(c.lastMessage.createdAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              🩸 {BLOOD_GROUP_LABELS[c.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]} — {c.hospital}
            </p>
            {c.lastMessage ? (
              <p className="text-xs text-gray-400 truncate mt-0.5">{c.lastMessage.content}</p>
            ) : (
              <p className="text-xs text-gray-400 italic mt-0.5">Démarrer la conversation...</p>
            )}
          </div>
          {c.unreadCount > 0 && (
            <span className="w-5 h-5 bg-blood-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
              {c.unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Chat Window ──────────────────────────────────────────────
function ChatWindow({ conversation }: { conversation: Conversation }) {
  const { user }          = useAuthStore();
  const { socket }        = useSocket();
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input,    setInput]        = useState('');
  const [loading,  setLoading]      = useState(true);
  const [sending,  setSending]      = useState(false);
  const [typing,   setTyping]       = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Charger messages
  useEffect(() => {
    setLoading(true);
    api.get(`/chat/${conversation.donationId}/messages`)
      .then((r) => setMessages(r.data))
      .catch(() => toast.error('Erreur chargement messages'))
      .finally(() => setLoading(false));
  }, [conversation.donationId]);

  // WebSocket
  useEffect(() => {
    if (!socket || !user) return;

    // Rejoindre la room
    socket.emit('chat:join', { donationId: conversation.donationId, userId: user.id });

    // Écouter les nouveaux messages
    const onMessage = (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    // Typing
    const onTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== user.id) setTyping(data.isTyping);
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing',  onTyping);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing',  onTyping);
      socket.emit('chat:leave', { donationId: conversation.donationId });
    };
  }, [socket, conversation.donationId, user]);

  // Scroll en bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = async () => {
    if (!input.trim() || sending || !user) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      if (socket?.connected) {
        socket.emit('chat:send', {
          donationId: conversation.donationId,
          senderId:   user.id,
          content,
        });
      } else {
        // Fallback HTTP
        const res = await api.post(`/chat/${conversation.donationId}/messages`, { content });
        setMessages((prev) => [...prev, res.data]);
      }
    } catch {
      toast.error('Erreur envoi message');
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (val: string) => {
    setInput(val);
    if (!socket || !user) return;
    socket.emit('chat:typing', { donationId: conversation.donationId, userId: user.id, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('chat:typing', { donationId: conversation.donationId, userId: user.id, isTyping: false });
    }, 1500);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Grouper par date
  const grouped = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const d = new Date(msg.createdAt).toDateString();
    const last = acc[acc.length - 1];
    if (last?.date === d) last.msgs.push(msg);
    else acc.push({ date: d, msgs: [msg] });
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800
                      bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center
                        text-blue-600 font-bold flex-shrink-0">
          {conversation.otherUser?.avatar
            ? <img src={conversation.otherUser.avatar} className="w-full h-full object-cover rounded-full" />
            : `${conversation.otherUser?.firstName?.[0] || ''}${conversation.otherUser?.lastName?.[0] || ''}`
          }
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            {conversation.otherUser?.firstName} {conversation.otherUser?.lastName}
          </p>
          <p className="text-xs text-gray-500">
            🩸 {BLOOD_GROUP_LABELS[conversation.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}
            {' · '}{conversation.hospital}
          </p>
        </div>
        <span className={`badge text-xs ${
          conversation.status === 'ACCEPTED'    ? 'bg-blue-100 text-blue-700' :
          conversation.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
          'bg-green-100 text-green-700'
        }`}>
          {conversation.status === 'ACCEPTED' ? 'Accepté' :
           conversation.status === 'IN_PROGRESS' ? 'En cours' : 'Complété'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50 dark:bg-gray-950">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-blood-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Démarrez la conversation 👋</p>
          </div>
        ) : (
          grouped.map(({ date, msgs }) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 px-2">{formatDate(msgs[0].createdAt)}</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                {msgs.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center
                                        justify-center text-xs font-bold text-blue-600 mr-2 flex-shrink-0 self-end">
                          {msg.sender.firstName[0]}
                        </div>
                      )}
                      <div className={`max-w-[70%] group`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                          ${isMe
                            ? 'bg-blood-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm rounded-bl-sm border border-gray-100 dark:border-gray-700'
                          }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                          {isMe && (
                            msg.isRead
                              ? <CheckCheck className="w-3 h-3 text-blue-400" />
                              : <Check      className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typing && (
          <div className="flex items-center gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-xs font-bold text-blue-600">
              {conversation.otherUser?.firstName?.[0]}
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Écrire un message..."
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none
                       border border-transparent focus:border-blood-400 dark:text-gray-100
                       placeholder:text-gray-400 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-blood-600 hover:bg-blood-700 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function ChatPage() {
  const navigate = useNavigate();
  const { donationId } = useParams<{ donationId?: string }>();
  const [selected, setSelected] = useState<Conversation | null>(null);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 bg-white dark:bg-gray-900">

      {/* ── Sidebar conversations ── */}
      <div className={`
        flex-shrink-0 border-r border-gray-200 dark:border-gray-800
        flex flex-col
        ${selected ? 'hidden md:flex md:w-80' : 'w-full md:w-80'}
      `}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-gray-100">Messages</h1>
            <p className="text-xs text-gray-500">Conversations avec les donneurs/patients</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationsList onSelect={setSelected} selected={selected?.donationId || null} />
        </div>
      </div>

      {/* ── Chat window ── */}
      <div className={`flex-1 flex flex-col ${!selected ? 'hidden md:flex' : 'flex'}`}>
        {selected ? (
          <>
            {/* Back button mobile */}
            <button
              onClick={() => setSelected(null)}
              className="md:hidden flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400
                         border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <ChatWindow conversation={selected} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-gray-50 dark:bg-gray-950">
            <div className="w-20 h-20 bg-blood-100 dark:bg-blood-950 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">💬</span>
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">Sélectionnez une conversation</p>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              Communiquez directement avec le donneur ou le patient après acceptation du don
            </p>
          </div>
        )}
      </div>
    </div>
  );
}