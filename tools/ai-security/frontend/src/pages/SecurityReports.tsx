import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  Filter, 
  Trash2, 
  Download, 
  RefreshCw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  User,
  Zap,
  Lock,
  Unlock,
  AlertCircle,
  Target,
  Activity,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

interface SecurityEvent {
  id: string;
  timestamp: string;
  user_input: string;
  ai_response?: string;
  input_scan: {
    result: {
      action: string;
      reason: string;
      id?: string;
      source?: string;
    };
  };
  output_scan?: {
    result: {
      action: string;
      reason: string;
      id?: string;
    };
  };
  blocked: boolean;
  user_id?: string;
  username?: string;
}

const SecurityReports: React.FC = () => {
  const { aiAxios } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Load security events on component mount
  useEffect(() => {
    loadSecurityEvents();
  }, []);

  // Load security events from API - only blocked events
  const loadSecurityEvents = async () => {
    setLoading(true);
    console.log('Loading blocked security events...');
    try {
      const response = await aiAxios.get('/ai/security/events');
      
      console.log('Response received:', response.data);
      
      if (response.data.success) {
        // Filter only blocked events
        const blockedEvents = response.data.events.filter((event: SecurityEvent) => event.blocked);
        console.log('Setting blocked events:', blockedEvents);
        setEvents(blockedEvents);
      } else {
        console.error('API returned success: false');
        toast.error('Failed to load security events');
      }
    } catch (error: any) {
      console.error('Failed to load security events:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load security events');
    } finally {
      setLoading(false);
    }
  };

  // Clear all security events
  const clearEvents = async () => {
    if (!window.confirm('Are you sure you want to clear all security events? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await aiAxios.delete('/ai/security/events');
      
      if (response.data.success) {
        toast.success('Security events cleared successfully');
        loadSecurityEvents();
      } else {
        toast.error('Failed to clear security events');
      }
    } catch (error: any) {
      console.error('Failed to clear security events:', error);
      toast.error('Failed to clear security events');
    }
  };

  // Export events to JSON
  const exportEvents = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-attacks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Security attack reports exported successfully');
  };

  // Show detailed view for an event
  const showEventDetails = (event: SecurityEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Get status badge color
  const getStatusColor = (action: string) => {
    switch (action) {
      case 'Block':
        return 'bg-red-100 text-red-800';
      case 'Allow':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (action: string) => {
    switch (action) {
      case 'Block':
        return <Lock className="w-3 h-3" />;
      case 'Allow':
        return <Unlock className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  // Calculate statistics
  const totalAttacks = events.length;
  const todayAttacks = events.filter(event => {
    const today = new Date().toDateString();
    const eventDate = new Date(event.timestamp).toDateString();
    return today === eventDate;
  }).length;

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 relative">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleMobileMenuToggle}
        />
      )}

      {/* Sidebar - Fixed position on desktop, overlay on mobile */}
      <div className={`
        fixed lg:absolute z-50 h-full transition-all duration-300 ease-in-out left-0 top-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}>
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={handleSidebarToggle}
          onMobileClose={handleMobileMenuToggle}
        />
      </div>
      
      {/* Main Content Area - Positioned to the right of sidebar */}
      <div className={`
        h-full transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
      `}>
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleMobileMenuToggle}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Security Reports</h1>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <main className="h-full overflow-auto p-2">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Shield className="w-8 h-8 mr-3 text-red-600" />
                  Security Attack Reports
                </h1>
                <p className="text-gray-600 mt-2">
                  Monitoring and tracking of blocked attack attempts against the AI system
                </p>
              </div>
            <div className="flex space-x-3">
              <button
                onClick={loadSecurityEvents}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportEvents}
                disabled={events.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={clearEvents}
                disabled={events.length === 0}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <Target className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Attacks</p>
                <p className="text-2xl font-bold text-gray-900">{totalAttacks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Attacks</p>
                <p className="text-2xl font-bold text-gray-900">{todayAttacks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Protection Status</p>
                <p className="text-2xl font-bold text-green-600">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Blocked Attack Attempts</h2>
            <p className="text-sm text-gray-600 mt-1">
              All detected and blocked malicious attempts to extract sensitive information
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin text-blue-600" />
                <span className="text-gray-600">Loading security reports...</span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && events.length === 0 && (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Attacks Detected</h3>
              <p className="text-gray-600">
                No blocked attack attempts have been recorded yet. The system is actively monitoring for threats.
              </p>
            </div>
          )}

          {/* Events Table */}
          {!loading && events.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attack Attempt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detection Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Block Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={event.user_input}>
                          "{event.user_input}"
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 mr-2 text-blue-600" />
                          {event.input_scan.result.source || 'AI Guard'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={event.input_scan.result.reason}>
                          {event.input_scan.result.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => showEventDetails(event)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </main>
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
                  Attack Details
                </h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Attack Information */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Attack Attempt</h4>
                <p className="text-red-800 font-mono text-sm bg-white p-3 rounded border">
                  "{selectedEvent.user_input}"
                </p>
              </div>

              {/* Detection Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Detection Method</h4>
                  <p className="text-blue-800">{selectedEvent.input_scan.result.source || 'AI Guard'}</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-2">Block Reason</h4>
                  <p className="text-orange-800">{selectedEvent.input_scan.result.reason}</p>
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Technical Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Event ID:</span>
                    <span className="font-mono text-gray-900">{selectedEvent.input_scan.result.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timestamp:</span>
                    <span className="text-gray-900">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-red-600 font-medium">BLOCKED</span>
                  </div>
                </div>
              </div>

              {/* Security Impact */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Security Impact</h4>
                <p className="text-yellow-800">
                  This attack attempt was successfully blocked by the AI Guard system. 
                  The malicious request was prevented from reaching the AI model, protecting 
                  sensitive information and system integrity.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityReports;
