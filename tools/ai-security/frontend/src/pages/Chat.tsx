import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Brain, MessageCircle, Menu, Apple, Dumbbell, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'nutrition' | 'fitness' | 'health';
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: Date;
}

const Chat: React.FC = () => {
  const { authAxios } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadChatSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatSessions = async () => {
    try {
      const response = await authAxios.get('/ai/chat/sessions');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await authAxios.post('/ai/chat/sessions', {
        title: 'New Chat Session'
      });
      const newSession = response.data.session;
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating new session:', error);
      toast.error('Failed to create new chat session');
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await authAxios.get(`/ai/chat/sessions/${sessionId}/messages`);
      setMessages(response.data.messages || []);
      setCurrentSession(sessionId);
    } catch (error) {
      console.error('Error loading session messages:', error);
      toast.error('Failed to load chat messages');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await authAxios.post('/ai/chat/message', {
        sessionId: currentSession,
        message: inputMessage
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.data.response,
        sender: 'ai',
        timestamp: new Date(),
        type: response.data.type || 'text'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'nutrition':
        return <Apple className="w-4 h-4 text-white" />;
      case 'fitness':
        return <Dumbbell className="w-4 h-4 text-white" />;
      case 'health':
        return <Heart className="w-4 h-4 text-white" />;
      default:
        return <Bot className="w-4 h-4 text-white" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleMobileMenuToggle}
        />
      )}

      {/* Sidebar - Hidden on mobile, shown as overlay when menu is open */}
      <div className={`
        fixed lg:relative z-50 h-full transition-all duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          onMobileClose={handleMobileMenuToggle}
        />
      </div>

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleMobileMenuToggle}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">AI Chat</h1>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Chat Sessions Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">AI Chat</h2>
              <button
                onClick={createNewSession}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Sessions</h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSessionMessages(session.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentSession === session.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900 truncate">{session.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Health AI Assistant</h1>
                  <p className="text-sm text-gray-600">Ask me anything about nutrition, fitness, and health</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a Conversation</h3>
                    <p className="text-gray-600 mb-6">Ask me about nutrition, fitness, or general health questions</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setInputMessage("What should I eat for a healthy breakfast?")}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="font-medium text-gray-900 mb-1">Nutrition Advice</div>
                        <div className="text-sm text-gray-600">Get personalized nutrition recommendations</div>
                      </button>
                      <button
                        onClick={() => setInputMessage("What's a good workout routine for beginners?")}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="font-medium text-gray-900 mb-1">Fitness Guidance</div>
                        <div className="text-sm text-gray-600">Get workout and exercise recommendations</div>
                      </button>
                      <button
                        onClick={() => setInputMessage("How can I improve my sleep quality?")}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="font-medium text-gray-900 mb-1">Health Tips</div>
                        <div className="text-sm text-gray-600">Get general health and wellness advice</div>
                      </button>
                      <button
                        onClick={() => setInputMessage("Analyze my recent meals and suggest improvements")}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="font-medium text-gray-900 mb-1">Meal Analysis</div>
                        <div className="text-sm text-gray-600">Get insights about your eating habits</div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex space-x-3 ${
                        message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.sender === 'user' 
                          ? 'bg-blue-500' 
                          : 'bg-gradient-to-r from-blue-500 to-purple-500'
                      }`}>
                        {message.sender === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          getMessageIcon(message.type)
                        )}
                      </div>
                      <div
                        className={`px-4 py-3 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className={`text-xs mt-2 ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTimestamp(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div className="bg-white border border-gray-200 text-gray-900 px-4 py-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
