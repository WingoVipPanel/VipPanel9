import React, { useState, useEffect } from 'react';
import { getAIResponse } from './services/geminiService';
import { 
  Trophy, 
  Shield, 
  Zap, 
  CheckCircle2, 
  Star, 
  ChevronRight, 
  Smartphone, 
  Gamepad2,
  AlertCircle,
  Menu,
  X,
  Upload,
  Check,
  Clock,
  ExternalLink,
  MessageSquare,
  Send,
  Trash2,
  User as UserIcon,
  Headphones,
  Volume2,
  VolumeX,
  Maximize2,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  limit,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { 
  PLANS, 
  GAMES, 
  REVIEWS, 
  FAQS, 
  PROOFS, 
  UPI_ID,
  SOUNDS
} from './constants';
import { cn } from './lib/utils';

// --- Components ---

const playSound = (url: string) => {
  const isMuted = localStorage.getItem('isMuted') === 'true';
  if (isMuted) return;
  const audio = new Audio(url);
  audio.volume = 0.4;
  audio.play().catch(() => {}); // Ignore errors if browser blocks autoplay
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(localStorage.getItem('isMuted') === 'true');

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('isMuted', String(newMuted));
    if (!newMuted) playSound(SOUNDS.CLICK);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => playSound(SOUNDS.CLICK)}>
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20"
            >
              <Zap className="text-white w-6 h-6 fill-current" />
            </motion.div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tighter">
              PROHACK
            </span>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <a href="#features" onClick={() => playSound(SOUNDS.CLICK)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Features</a>
              <a href="#games" onClick={() => playSound(SOUNDS.CLICK)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Games</a>
              <a href="#pricing" onClick={() => playSound(SOUNDS.CLICK)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Pricing</a>
              <a href="#proof" onClick={() => playSound(SOUNDS.CLICK)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Proof</a>
              <a href="#faq" onClick={() => playSound(SOUNDS.CLICK)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">FAQ</a>
              
              <button 
                onClick={toggleMute}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={toggleMute}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button onClick={() => { setIsOpen(!isOpen); playSound(SOUNDS.CLICK); }} className="text-gray-300 p-2">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black border-b border-white/10 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              <a href="#features" onClick={() => setIsOpen(false)} className="block text-gray-300 text-lg">Features</a>
              <a href="#games" onClick={() => setIsOpen(false)} className="block text-gray-300 text-lg">Games</a>
              <a href="#pricing" onClick={() => setIsOpen(false)} className="block text-gray-300 text-lg">Pricing</a>
              <a href="#proof" onClick={() => setIsOpen(false)} className="block text-gray-300 text-lg">Proof</a>
              <a href="#faq" onClick={() => setIsOpen(false)} className="block text-gray-300 text-lg">FAQ</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const PaymentModal = ({ plan, onClose }: { plan: any, onClose: () => void }) => {
  const [userName, setUserName] = useState('');
  const [utr, setUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      playSound(SOUNDS.SUCCESS);
    }
  }, [isSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !utr) return alert('Please fill all fields');
    if (utr.length !== 12) return alert('UTR must be 12 digits');

    setIsSubmitting(true);
    playSound(SOUNDS.CLICK);
    try {
      await addDoc(collection(db, 'payments'), {
        userName: userName,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        utrNumber: utr,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      // Telegram Redirect
      const telegramMessage = encodeURIComponent(
        `🚀 New Payment Confirmation\n\n` +
        `👤 Name: ${userName}\n` +
        `📦 Plan: ${plan.name}\n` +
        `💰 Amount: ₹${plan.price}\n` +
        `🔢 UTR: ${utr}\n\n` +
        `Please confirm my payment and provide the VIP access!`
      );
      
      window.open(`https://t.me/ProHackAdmin?text=${telegramMessage}`, '_blank');
      
      setIsSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=ProHack&am=${plan.price}&cu=INR`;

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="text-green-500 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Your VIP Access will be active shortly!</h2>
          <p className="text-gray-400 mb-8">The verification process has started. Please wait 5-10 minutes.</p>
          <button onClick={onClose} className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-all">
            Got it!
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-xl overflow-y-auto overscroll-contain">
      {/* Fixed Close Button for Mobile */}
      <button 
        onClick={onClose} 
        className="fixed top-4 right-4 z-[210] p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md border border-white/10 md:hidden shadow-2xl"
      >
        <X className="w-6 h-6" />
      </button>

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-zinc-900 border-x border-t sm:border border-white/10 p-6 sm:p-8 rounded-t-[2.5rem] sm:rounded-3xl max-w-2xl w-full mt-12 sm:my-8 relative min-h-[calc(100vh-3rem)] sm:min-h-0"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Complete Payment</h2>
            <p className="text-gray-400">Plan: {plan.name} - ₹{plan.price}</p>
          </div>
          <button onClick={onClose} className="hidden md:block text-gray-400 hover:text-white p-2">
            <X />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 pb-10 sm:pb-0">
          {/* QR Section */}
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl aspect-square flex items-center justify-center shadow-2xl shadow-white/5">
              <QRCodeSVG value={upiUrl} size={250} level="H" />
            </div>
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-400">Scan QR to pay ₹{plan.price}</p>
              <a 
                href={upiUrl}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all w-full justify-center"
              >
                <Smartphone className="w-5 h-5" /> Pay via App
              </a>
              <p className="text-lg font-mono font-bold text-white">{UPI_ID}</p>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
              <input 
                type="text" 
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your Full Name"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">UTR Number (12 Digits)</label>
              <input 
                type="text" 
                required
                maxLength={12}
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 12-digit UTR"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
              />
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3">
              <AlertCircle className="text-blue-500 shrink-0" />
              <p className="text-xs text-blue-200 leading-relaxed">
                Enter the 12-digit UTR number after payment. No screenshot required.
              </p>
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-xl font-bold hover:from-orange-500 hover:to-red-500 transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Payment'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatId, setChatId] = useState<string | null>(localStorage.getItem('support_chat_id'));
  const [userName, setUserName] = useState(localStorage.getItem('support_user_name') || '');
  const [gameName, setGameName] = useState(localStorage.getItem('support_game_name') || '');
  const [isRegistering, setIsRegistering] = useState(!localStorage.getItem('support_chat_id'));
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'support_chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `support_chats/${chatId}/messages`));

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !gameName.trim()) return;

    const newChatId = Math.random().toString(36).substring(2, 15);
    try {
      await setDoc(doc(db, 'support_chats', newChatId), {
        userName,
        gameName,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: 'Chat started'
      });
      
      localStorage.setItem('support_chat_id', newChatId);
      localStorage.setItem('support_user_name', userName);
      localStorage.setItem('support_game_name', gameName);
      setChatId(newChatId);
      setIsRegistering(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'support_chats');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    const text = message;
    setMessage('');

    try {
      await addDoc(collection(db, 'support_chats', chatId, 'messages'), {
        text,
        sender: 'user',
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'support_chats', chatId), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });

      // AI Auto-reply
      setIsTyping(true);
      const aiResponse = await getAIResponse(text, userName, gameName);
      
      if (aiResponse) {
        try {
          await addDoc(collection(db, 'support_chats', chatId, 'messages'), {
            text: aiResponse,
            sender: 'admin',
            timestamp: serverTimestamp()
          });

          await updateDoc(doc(db, 'support_chats', chatId), {
            lastMessage: aiResponse,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("AI Message Save Error:", err);
        }
      }
      setIsTyping(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `support_chats/${chatId}/messages`);
      setIsTyping(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId) return;
    try {
      await deleteDoc(doc(db, 'support_chats', chatId, 'messages', messageId));
      playSound(SOUNDS.CLICK);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `support_chats/${chatId}/messages/${messageId}`);
    }
  };

  const handleClearChat = async () => {
    if (!chatId) return;
    
    try {
      const messagesRef = collection(db, 'support_chats', chatId, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      playSound(SOUNDS.CLICK);
    } catch (error) {
      console.error("Clear chat error:", error);
      handleFirestoreError(error, OperationType.DELETE, `support_chats/${chatId}/messages`);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Headphones className="text-white w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Live Support</p>
                  <p className="text-white/70 text-xs">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isRegistering && (
                  <button 
                    onClick={handleClearChat}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Clear All Chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {isRegistering ? (
                <div className="p-6 flex-1 flex flex-col justify-center">
                  <h3 className="text-white font-bold text-lg mb-2 text-center">Welcome to Support</h3>
                  <p className="text-gray-400 text-sm mb-6 text-center">Please enter your name to start chatting with us.</p>
                  <form onSubmit={handleStartChat} className="space-y-4">
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                    />
                    <input
                      type="text"
                      required
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                      placeholder="Game Name (e.g. Tiranga)"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                    />
                    <button
                      type="submit"
                      className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Start Chat
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
                  >
                    <div className="bg-zinc-800/50 p-3 rounded-2xl text-xs text-gray-400 text-center">
                      Chat started. An agent will be with you shortly.
                    </div>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[85%] group",
                          msg.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {msg.sender === 'user' && (
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <div
                            className={cn(
                              "px-4 py-2 rounded-2xl text-sm relative",
                              msg.sender === 'user' 
                                ? "bg-orange-600 text-white rounded-tr-none" 
                                : "bg-zinc-800 text-gray-200 rounded-tl-none"
                            )}
                          >
                            {msg.text}
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1 px-1">
                          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                        </span>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="mr-auto items-start flex flex-col max-w-[80%]">
                        <div className="bg-zinc-800 text-gray-400 px-4 py-2 rounded-2xl text-xs flex gap-1 items-center">
                          <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" />
                          <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                          Support is typing...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all"
                    />
                    <button
                      type="submit"
                      className="bg-orange-600 text-white p-2 rounded-xl hover:bg-orange-500 transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-orange-600/40 text-white"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase connection error: The client is offline. Check your configuration.");
        }
      }
    };
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500 selection:text-white overflow-x-hidden">
      {/* Background Glow Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.15),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              <span className="text-xs font-bold tracking-widest uppercase text-orange-500">Number Winning 100% Working - Updated Today</span>
            </div>
            <h1 className="font-display text-6xl md:text-[130px] font-black tracking-tighter mb-8 leading-[0.8] uppercase flex flex-col items-center">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/20">
                COLOUR
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/20">
                TRADING
              </span>
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-orange-500 text-4xl md:text-7xl mt-6 tracking-[0.2em] font-black drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]"
              >
                ALL GAME H@CK AVAILABLE
              </motion.span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
              The world's most advanced AI-powered prediction system for all major gaming platforms. 100% Accuracy. Instant Results.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#pricing" className="w-full sm:w-auto bg-white text-black px-10 py-5 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl shadow-white/10">
                GET VIP ACCESS NOW
              </a>
              <a href="https://t.me/+PurHCbpKar1kZDA9" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-blue-500 hover:scale-105 transition-all shadow-xl shadow-blue-500/20 flex flex-row items-center justify-center gap-3">
                <Send className="w-5 h-5" /> JOIN VIP CHANNEL
              </a>
              <a href="#proof" className="w-full sm:w-auto bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-white/10 transition-all">
                VIEW PROOF
              </a>
            </div>

            {/* Live Accuracy Meter */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-16 inline-flex flex-col items-center"
            >
              <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">Live System Accuracy</div>
              <div className="flex items-center gap-4">
                <div className="w-48 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "99.4%" }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-orange-600 to-red-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                  />
                </div>
                <motion.span 
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-orange-500 font-black text-xl"
                >
                  99.4%
                </motion.span>
              </div>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-24">
            {[
              { label: 'Active Users', value: '10K+' },
              { label: 'Games Supported', value: '15+' },
              { label: 'Success Rate', value: '99.9%' },
              { label: 'Support', value: '24/7' }
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl text-center">
                <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">WHY CHOOSE US?</h2>
            <p className="text-gray-500">The most advanced prediction system in the market.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Shield />, title: 'Anti-Ban Protection', desc: 'Our advanced encryption keeps your game account 100% safe from detection.' },
              { icon: <Zap />, title: 'Instant Activation', desc: 'Get your VIP access activated within 5-10 minutes of payment verification.' },
              { icon: <Trophy />, title: '99% Accuracy', desc: 'Our AI algorithm predicts the next colour with extreme precision.' }
            ].map((f, i) => (
              <div key={i} className="bg-zinc-900 border border-white/5 p-8 rounded-3xl hover:border-orange-500/50 transition-all group">
                <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all">
                  {React.cloneElement(f.icon as React.ReactElement, { className: 'text-orange-500 w-7 h-7' })}
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games */}
      <section id="games" className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-4">SUPPORTED GAMES</h2>
              <p className="text-gray-500">We work on all major colour prediction platforms.</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
              <Gamepad2 className="text-orange-500" />
              <span className="text-orange-500 font-bold">All Games Working</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {GAMES.map((game, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -10, scale: 1.02 }}
                onMouseEnter={() => playSound(SOUNDS.HOVER)}
                onClick={() => playSound(SOUNDS.CLICK)}
                className="relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500" />
                <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-white/5 p-6 rounded-[2.5rem] flex flex-col items-center text-center transition-all duration-500 group-hover:border-orange-500/50 group-hover:bg-gradient-to-b group-hover:from-zinc-900/90 group-hover:to-orange-500/5">
                  {game.badge && (
                    <div className="absolute -top-2 -right-2 z-20 bg-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-orange-600/40 border border-white/20 animate-bounce">
                      {game.badge}
                    </div>
                  )}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-orange-500/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-glow-pulse transition-all duration-500" />
                    <img 
                      src={game.logo} 
                      alt={game.name} 
                      className="w-24 h-24 rounded-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-2 shadow-2xl relative z-10 border border-white/10" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <p className="font-black text-white text-[11px] tracking-[0.2em] uppercase group-hover:text-orange-500 transition-colors">{game.name}</p>
                  
                  {/* Status Indicator */}
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-green-500/80 uppercase tracking-tighter">Active</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">CHOOSE YOUR PLAN</h2>
            <p className="text-gray-500">Select a plan that fits your winning streak.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PLANS.map((plan, i) => (
              <motion.div 
                key={i} 
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(249,115,22,0.2)" }}
                className={cn(
                  "relative bg-zinc-900 border p-8 rounded-[2.5rem] flex flex-col transition-colors duration-500",
                  plan.popular ? "border-orange-500 ring-4 ring-orange-500/10 z-10" : "border-white/5 hover:border-orange-500/30"
                )}
              >
                {plan.popular && (
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-orange-500/40"
                  >
                    Most Popular
                  </motion.div>
                )}
                <div className="mb-8">
                  <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-gray-500 line-through text-lg">₹{plan.originalPrice}</span>
                    <span className="bg-green-500/20 text-green-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">30% OFF</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">₹{plan.price}</span>
                    <span className="text-gray-500 text-sm">/{plan.id === 'lifetime' ? 'Life' : plan.id}</span>
                  </div>
                </div>
                <div className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature: string, j: number) => (
                    <div key={j} className="flex items-center gap-3">
                      <CheckCircle2 className="text-orange-500 w-5 h-5 shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedPlan(plan);
                    playSound(SOUNDS.CLICK);
                  }}
                  className={cn(
                    "w-full py-5 rounded-2xl font-black text-lg transition-all shadow-lg relative overflow-hidden group",
                    plan.popular ? "bg-orange-500 text-white hover:bg-orange-400 shadow-orange-500/20" : "bg-white text-black hover:bg-gray-200"
                  )}
                >
                  <span className="relative z-10">BUY NOW</span>
                  <motion.div 
                    className="absolute inset-0 bg-white/20 -translate-x-full skew-x-12 group-hover:translate-x-full transition-transform duration-700"
                  />
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof Section */}
      <section id="proof" className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">WINNING PROOF</h2>
            <p className="text-gray-500">Real screenshots from our VIP members.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {PROOFS.map((proof, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => {
                  setPreviewItem(proof);
                  playSound(SOUNDS.CLICK);
                }}
                className={cn(
                  "group relative cursor-zoom-in rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 bg-zinc-900/50 backdrop-blur-xl shadow-2xl hover:border-orange-500/40 transition-all duration-700",
                  proof.type === 'video' ? "col-span-2 aspect-video" : "aspect-[9/16]"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                {proof.type === 'video' ? (
                  <div className="relative w-full h-full bg-black/80 overflow-hidden">
                    <img 
                      src={proof.thumbnail} 
                      alt="" 
                      className="w-full h-full object-contain opacity-80 transition-all duration-1000 group-hover:scale-105" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 md:w-24 md:h-24 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.6)] group-hover:scale-110 transition-transform duration-500">
                        <Play className="w-8 h-8 md:w-12 md:h-12 text-white fill-current ml-1" />
                      </div>
                      <span className="text-white font-black tracking-widest text-[10px] md:text-xs uppercase bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">Watch Winning Video</span>
                    </div>
                  </div>
                ) : (
                  <img 
                    src={proof.url} 
                    alt="" 
                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110" 
                    referrerPolicy="no-referrer" 
                  />
                )}
                
                {/* Overlay Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-4 md:p-8">
                  <div className="w-full flex items-center justify-between transform translate-y-8 group-hover:translate-y-0 transition-transform duration-700 delay-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-500 animate-pulse" />
                        <p className="text-[8px] md:text-[10px] font-black tracking-[0.3em] text-orange-500 uppercase">
                          {proof.type === 'video' ? 'Live Video' : 'Verified Win'}
                        </p>
                      </div>
                      <p className="text-sm md:text-lg font-black text-white uppercase tracking-tight">{proof.caption}</p>
                    </div>
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-orange-500 group-hover:border-orange-400 transition-all duration-500">
                      <Maximize2 className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">USER REVIEWS</h2>
            <p className="text-gray-500">What our community says about ProHack.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {REVIEWS.map((review, i) => (
              <div key={i} className="bg-zinc-900 border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <motion.div
                      key={j}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: j * 0.1 }}
                    >
                      <Star className={cn("w-4 h-4", j < review.rating ? "text-yellow-500 fill-current" : "text-gray-600")} />
                    </motion.div>
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">"{review.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img 
                      src={review.avatar} 
                      alt={review.name} 
                      className="w-12 h-12 rounded-full border-2 border-white/10 relative z-10 object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white leading-none mb-1">{review.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{review.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">FAQ</h2>
            <p className="text-gray-500">Frequently asked questions.</p>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                    <span className="font-bold text-lg">{faq.question}</span>
                    <ChevronRight className="w-5 h-5 group-open:rotate-90 transition-all" />
                  </summary>
                  <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Zap className="text-orange-500 w-6 h-6 fill-current" />
            <span className="text-xl font-bold tracking-tighter">PROHACK</span>
          </div>
          <p className="text-gray-500 text-sm mb-8">© 2026 ProHack. All rights reserved. Use responsibly.</p>
          <div className="flex justify-center gap-6">
            <a href="https://t.me/+PurHCbpKar1kZDA9" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">Telegram</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">WhatsApp</a>
            <a href="https://t.me/ProHackAdmin" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {selectedPlan && (
          <PaymentModal 
            plan={selectedPlan} 
            onClose={() => setSelectedPlan(null)} 
          />
        )}
        {previewItem && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-3xl"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setPreviewItem(null)}
                className="fixed top-6 right-6 md:top-10 md:right-10 p-5 bg-white/10 hover:bg-orange-500 rounded-full text-white z-[210] backdrop-blur-xl transition-all border border-white/10 group shadow-2xl"
              >
                <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
              </button>

              {/* High Definition Content Container */}
              <div className="w-full h-full overflow-y-auto py-10 md:py-20 px-4 flex justify-center items-center custom-scrollbar scroll-smooth">
                {previewItem.type === 'video' ? (
                  <div className="w-full max-w-sm flex flex-col items-center gap-4">
                    <div className="w-full aspect-[9/16] rounded-[2.5rem] overflow-hidden shadow-[0_0_150px_rgba(249,115,22,0.3)] border border-white/10 bg-black relative">
                      {previewItem.url.includes('drive.google.com') ? (
                        <iframe 
                          src={previewItem.url} 
                          className="w-full h-full border-0 absolute inset-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : (
                        <video 
                          src={previewItem.url}
                          className="w-full h-full object-cover absolute inset-0"
                          playsInline
                          controls
                          autoPlay
                          loop
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <img 
                    src={previewItem.url} 
                    alt="Full Proof HD" 
                    className="max-w-full h-auto md:max-w-4xl rounded-[2.5rem] shadow-[0_0_150px_rgba(0,0,0,0.9)] border border-white/10 ring-1 ring-white/5"
                    referrerPolicy="no-referrer"
                    style={{ imageRendering: 'auto' }}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ChatWidget />
    </div>
  );
}
