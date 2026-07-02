import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Settings as SettingsIcon, TestTube, Save, RefreshCw, CheckCircle, XCircle, AlertTriangle, Database, Trash2, Plus, Edit, Users, Shield, UserPlus, Lock, Unlock, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

interface OllamaConfig {
  host_url: string;
  model_name: string;
  available_models: any[];
  auto_selected: boolean;
}

interface OllamaStatus {
  connected: boolean;
  models: string[];
  error?: string;
}

interface SecurityConfig {
  enabled: boolean;
  api_key: string;
  api_url: string;
}

interface SecurityStatus {
  connected: boolean;
  error?: string;
}

interface ScanStatus {
  isRunning: boolean;
  progress: number;
  status: string;
  result: any;
  error: string | null;
  output: string; // Add output field for real-time scanner output
}

interface DatabaseStats {
  meals: number;
  workouts: number;
  users: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const Settings: React.FC = () => {
  const { user, aiAxios, authAxios } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
    host_url: 'http://192.168.1.100:11434',
    model_name: 'llama3.2',
    available_models: [],
    auto_selected: true
  });
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
    connected: false,
    models: []
  });
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    enabled: false,
    api_key: '',
    api_url: 'https://api.xdr.trendmicro.com/beta/aiSecurity/guard?detailedResponse=false'
  });
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    connected: false
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingSecurity, setTestingSecurity] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats>({
    meals: 0,
    workouts: 0,
    users: 0
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // User management state (admin only)
  const [users, setUsers] = useState<User[]>([]);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Security scanner state
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    isRunning: false,
    progress: 0,
    status: 'idle',
    result: null,
    error: null,
    output: ''
  });
  const [scanningModel, setScanningModel] = useState(false);
  const [securityScannerApiKey, setSecurityScannerApiKey] = useState('');

  const isAdmin = user?.role === 'admin';

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Load configuration on component mount
  useEffect(() => {
    loadConfiguration();
    loadSecurityConfiguration();
    loadDatabaseStats();
    // Load scanner API key from security scanner service
    const loadScannerConfig = async () => {
      try {
        const response = await axios.get('/api/security-scanner/config');
        if (response.data.apiKey) {
          setSecurityScannerApiKey(response.data.apiKey);
        }
      } catch (error) {
        console.log('No saved scanner configuration found');
      }
    };
    loadScannerConfig();
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // Load saved configuration
  const loadConfiguration = async () => {
    try {
      const response = await aiAxios.get('/ai/config/ollama');
      if (response.data.success) {
        setOllamaConfig(response.data.config);
        // Test connection with loaded config
        await testOllamaConnection();
      }
    } catch (error: any) {
      console.error('Failed to load configuration:', error);
      // If loading fails, test with default config
      await testOllamaConnection();
    }
  };

  // Load security configuration
  const loadSecurityConfiguration = async () => {
    try {
      const response = await aiAxios.get('/ai/config/security');
      if (response.data.success) {
        const config = response.data.config;
        setSecurityConfig({
          enabled: config.enabled || false,
          api_key: '', // Don't load API key from server for security
          api_url: config.api_url || 'https://api.xdr.trendmicro.com/beta/aiSecurity/guard?detailedResponse=false'
        });
        // Test security connection with loaded config if enabled
        if (config.enabled) {
          // Note: We can't test without the API key, so we'll just show as enabled
          setSecurityStatus({
            connected: config.enabled,
            error: undefined
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to load security configuration:', error);
      // Set default values if loading fails
      setSecurityConfig({
        enabled: false,
        api_key: '',
        api_url: 'https://api.xdr.trendmicro.com/beta/aiSecurity/guard?detailedResponse=false'
      });
    }
  };

  // Load database statistics
  const loadDatabaseStats = async () => {
    try {
      // This would be implemented when we have database management endpoints
      // For now, we'll use placeholder data
      setDatabaseStats({
        meals: 0,
        workouts: 0,
        users: 1
      });
    } catch (error) {
      console.error('Failed to load database stats:', error);
    }
  };

  // Load users (admin only)
  const loadUsers = async () => {
    try {
      const response = await authAxios.get('/auth/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    }
  };

  // Test Ollama connection
  const testOllamaConnection = async () => {
    setTesting(true);
    try {
      const response = await aiAxios.get('/ai/test-ollama');
      
      if (response.data.success) {
        setOllamaStatus({
          connected: true,
          models: response.data.models.map((model: any) => model.name)
        });
        
        // Update config with the latest data
        setOllamaConfig((prev: OllamaConfig) => ({
          ...prev,
          available_models: response.data.models,
          model_name: response.data.selected_model || prev.model_name,
          auto_selected: response.data.auto_selected !== undefined ? response.data.auto_selected : prev.auto_selected
        }));
        
        toast.success('Ollama connection successful!');
      } else {
        setOllamaStatus({
          connected: false,
          models: [],
          error: response.data.error
        });
        toast.error('Ollama connection failed');
      }
    } catch (error: any) {
      setOllamaStatus({
        connected: false,
        models: [],
        error: error.response?.data?.error || error.message || 'Network error'
      });
      toast.error('Failed to test Ollama connection');
    } finally {
      setTesting(false);
    }
  };

  // Test security connection
  const testSecurityConnection = async () => {
    setTestingSecurity(true);
    try {
      const response = await aiAxios.post('/ai/test-security', {
        api_key: securityConfig.api_key,
        api_url: securityConfig.api_url
      });
      
      if (response.data.success) {
        setSecurityStatus({
          connected: true
        });
        toast.success('Security connection successful!');
      } else {
        setSecurityStatus({
          connected: false,
          error: response.data.error
        });
        toast.error('Security connection failed');
      }
    } catch (error: any) {
      setSecurityStatus({
        connected: false,
        error: error.response?.data?.error || error.message || 'Network error'
      });
      toast.error('Failed to test security connection');
    } finally {
      setTestingSecurity(false);
    }
  };

  // Save configuration
  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const response = await aiAxios.post('/ai/config/ollama', {
        host_url: ollamaConfig.host_url,
        model_name: ollamaConfig.model_name,
        auto_selected: ollamaConfig.auto_selected
      });

      if (response.data.success) {
        toast.success('Configuration saved successfully!');
        // Update status after saving
        await testOllamaConnection();
      } else {
        toast.error(response.data.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save configuration';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Save security configuration
  const saveSecurityConfiguration = async () => {
    setSavingSecurity(true);
    try {
      const response = await aiAxios.post('/ai/config/security', {
        enabled: securityConfig.enabled,
        api_key: securityConfig.api_key,
        api_url: securityConfig.api_url
      });

      if (response.data.success) {
        toast.success('Security configuration saved successfully!');
        // Test connection after saving if enabled
        if (securityConfig.enabled) {
          await testSecurityConnection();
        }
      } else {
        toast.error(response.data.error || 'Failed to save security configuration');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save security configuration';
      toast.error(errorMessage);
    } finally {
      setSavingSecurity(false);
    }
  };

  // Save security scanner configuration
  const saveSecurityScannerConfig = async () => {
    try {
      // Save the scanner API key to the security scanner service
      const response = await axios.post('/api/security-scanner/save-config', {
        apiKey: securityScannerApiKey
      });
      
      if (response.data.success) {
        toast.success('Scanner configuration saved successfully');
      } else {
        toast.error('Failed to save scanner configuration');
      }
    } catch (error: any) {
      console.error('Error saving scanner configuration:', error);
      toast.error('Failed to save scanner configuration');
    }
  };

  // Update TMAS CLI
  const updateTmasCli = async () => {
    try {
      toast.loading('Updating TMAS CLI...');
      const response = await axios.post('/api/security-scanner/update');
      
      if (response.data.success) {
        toast.success('TMAS CLI updated successfully');
        console.log('Update output:', response.data.output);
      } else {
        toast.error('Failed to update TMAS CLI');
      }
    } catch (error: any) {
      console.error('Error updating TMAS CLI:', error);
      toast.error('Failed to update TMAS CLI');
    }
  };

  // Create new user (admin only)
  const createUser = async () => {
    setCreatingUser(true);
    try {
      const response = await authAxios.post('/auth/register', newUser);
      toast.success('User created successfully!');
      setNewUser({ username: '', email: '', password: '', role: 'user' });
      loadUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setCreatingUser(false);
    }
  };

  // Update user (admin only)
  const updateUser = async (userId: number, updates: Partial<User>) => {
    try {
      await authAxios.put(`/auth/users/${userId}`, updates);
      toast.success('User updated successfully!');
      loadUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update user';
      toast.error(errorMessage);
    }
  };

  // Delete user (admin only)
  const deleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await authAxios.delete(`/auth/users/${userId}`);
      toast.success('User deleted successfully!');
      loadUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete user';
      toast.error(errorMessage);
    }
  };

  // Validate URL format
  const validateUrl = (url: string): boolean => {
    try {
      // If URL doesn't start with http:// or https://, add http://
      const urlToTest = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
      new URL(urlToTest);
      return true;
    } catch {
      return false;
    }
  };

  // Handle URL change with validation
  const handleUrlChange = (url: string) => {
    // If URL doesn't start with http:// or https://, add http://
    const formattedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
    setOllamaConfig({ ...ollamaConfig, host_url: formattedUrl });
    // Clear connection status when URL changes
    setOllamaStatus({ connected: false, models: [] });
  };

  // Refresh models
  const refreshModels = async () => {
    await testOllamaConnection();
  };

  // Scan model for security risks
  const scanModel = async () => {
    if (!ollamaStatus.connected || !ollamaConfig.model_name) {
      toast.error('Please ensure Ollama is connected and a model is selected');
      return;
    }

    setScanningModel(true);
    setScanStatus({
      isRunning: true,
      progress: 0,
      status: 'starting',
      result: null,
      error: null,
      output: ''
    });

    try {
      // Debug: Log the API key being sent (without showing the actual key)
      console.log('API Key being sent:', securityConfig.api_key ? `Present (length: ${securityConfig.api_key.length})` : 'Not provided');
      console.log('Security config:', {
        enabled: securityConfig.enabled,
        api_key: securityConfig.api_key ? 'Present' : 'Not set',
        api_url: securityConfig.api_url
      });
      
      // Start the scan - use relative URL that will be proxied by the API gateway
      const response = await axios.post('/api/security-scanner/scan', {
        endpoint: `${ollamaConfig.host_url}/v1`,
        model: ollamaConfig.model_name,
        apiKey: securityScannerApiKey // Use the scanner-specific API key
      });

      if (response.data.success) {
        toast.success('Model security scan started successfully');
        
        // Poll for status updates
        const pollStatus = async () => {
          try {
            const statusResponse = await axios.get('/api/security-scanner/status');
            const status = statusResponse.data;
            
            setScanStatus(status);
            
            if (status.isRunning) {
              // Continue polling
              setTimeout(pollStatus, 2000);
            } else if (status.status === 'completed') {
              toast.success('Model security scan completed successfully');
              setScanningModel(false);
            } else if (status.status === 'failed') {
              toast.error(`Scan failed: ${status.error}`);
              setScanningModel(false);
            }
          } catch (error) {
            console.error('Error polling scan status:', error);
            setScanningModel(false);
          }
        };
        
        // Start polling
        setTimeout(pollStatus, 1000);
      }
    } catch (error: any) {
      console.error('Error starting scan:', error);
      toast.error(error.response?.data?.error || 'Failed to start model security scan');
      setScanningModel(false);
      setScanStatus({
        isRunning: false,
        progress: 0,
        status: 'failed',
        result: null,
        error: error.response?.data?.error || 'Failed to start scan',
        output: ''
      });
    }
  };

  // Database management functions (placeholders for future implementation)
  const exportData = () => {
    toast('Data export feature coming soon!');
  };

  const importData = () => {
    toast('Data import feature coming soon!');
  };

  const clearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      toast('Data clearing feature coming soon!');
    }
  };

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
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <main className="h-full overflow-auto p-2">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <SettingsIcon className="w-8 h-8 mr-3 text-blue-600" />
              Settings
            </h1>
            <p className="text-gray-600">Configure your Health AI Assistant settings and connections</p>
          </div>

      {/* Security Configuration (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="w-6 h-6 mr-2" />
            AI Security Configuration
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Trend Micro Vision One AI Guard</h3>
                <p className="text-sm text-gray-600">Protect against AI-generated malicious content</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  securityConfig.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {securityConfig.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={async () => {
                    const newEnabled = !securityConfig.enabled;
                    setSecurityConfig({ ...securityConfig, enabled: newEnabled });
                    // Auto-save the configuration
                    try {
                      const response = await aiAxios.post('/ai/config/security', {
                        enabled: newEnabled,
                        api_key: securityConfig.api_key,
                        api_url: securityConfig.api_url
                      });
                      if (response.data.success) {
                        toast.success(`AI Guard ${newEnabled ? 'enabled' : 'disabled'} successfully!`);
                      } else {
                        // Revert if save failed
                        setSecurityConfig({ ...securityConfig, enabled: !newEnabled });
                        toast.error(response.data.error || 'Failed to update AI Guard status');
                      }
                    } catch (error: any) {
                      // Revert if save failed
                      setSecurityConfig({ ...securityConfig, enabled: !newEnabled });
                      const errorMessage = error.response?.data?.error || error.message || 'Failed to update AI Guard status';
                      toast.error(errorMessage);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securityConfig.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securityConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {securityConfig.enabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={securityConfig.api_key}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your Trend Micro Vision One API key"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your API key is encrypted and stored securely</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API URL
                  </label>
                  <input
                    type="text"
                    value={securityConfig.api_url}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, api_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://api.xdr.trendmicro.com/beta/aiSecurity/guard"
                  />
                  <p className="text-xs text-gray-500 mt-1">Trend Micro Vision One API endpoint URL</p>
                </div>

                {/* Status Messages */}
                {securityStatus.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
                    <XCircle className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-red-700 text-sm">{securityStatus.error}</span>
                  </div>
                )}

                {securityStatus.connected && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-green-700 text-sm">Security service connected successfully</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={testSecurityConnection}
                    disabled={testingSecurity || !securityConfig.api_key || !securityConfig.api_url}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingSecurity ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4 mr-2" />
                    )}
                    {testingSecurity ? 'Testing...' : 'Test Connection'}
                  </button>

                  <button
                    onClick={saveSecurityConfiguration}
                    disabled={savingSecurity || !securityConfig.api_key || !securityConfig.api_url}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingSecurity ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            )}

            {!securityConfig.enabled && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                  <div>
                    <p className="text-yellow-800 text-sm font-medium">Security is disabled</p>
                    <p className="text-yellow-700 text-xs mt-1">
                      When disabled, the system will use mock security responses. Enable security for production use.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Scanner Configuration (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="w-6 h-6 mr-2" />
            Model Security Scanner Configuration
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Trend Micro Vision One AI Scanner</h3>
              <p className="text-sm text-gray-600">Scan your AI models for security vulnerabilities and risks</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scanner API Key
                </label>
                <input
                  type="password"
                  value={securityScannerApiKey}
                  onChange={(e) => setSecurityScannerApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your Trend Micro Vision One API key for model scanning"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This API key is used specifically for model security scanning. It's different from the AI Guard API key.
                </p>
                <button
                  onClick={saveSecurityScannerConfig}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Save Scanner Configuration
                </button>
                <button
                  onClick={updateTmasCli}
                  className="mt-2 ml-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Update TMAS CLI
                </button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-blue-500 mr-2" />
                  <div>
                    <p className="text-blue-800 text-sm font-medium">Model Security Scanning</p>
                    <p className="text-blue-700 text-xs mt-1">
                      Use the "Scan Model" button in the Ollama configuration section to scan your selected model for security risks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Section (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-6 h-6 mr-2" />
            User Management
          </h2>
          
          <button
            onClick={() => setShowUserManagement(!showUserManagement)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-4"
          >
            <Shield className="w-4 h-4 mr-2" />
            {showUserManagement ? 'Hide' : 'Show'} User Management
          </button>

          {showUserManagement && (
            <div className="space-y-6">
              {/* Create New User */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  onClick={createUser}
                  disabled={creatingUser || !newUser.username || !newUser.email || !newUser.password}
                  className="mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>

              {/* Users List */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Users</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((userItem) => (
                        <tr key={userItem.id}>
                          <td className="px-4 py-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{userItem.username}</div>
                              <div className="text-sm text-gray-500">{userItem.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              userItem.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {userItem.role}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              userItem.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {userItem.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {new Date(userItem.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateUser(userItem.id, { is_active: !userItem.is_active })}
                                className="text-blue-600 hover:text-blue-900 text-sm"
                              >
                                {userItem.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              {userItem.id !== user?.id && (
                                <button
                                  onClick={() => deleteUser(userItem.id)}
                                  className="text-red-600 hover:text-red-900 text-sm"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LLM Provider Configuration (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">LLM Provider Configuration</h2>
          
          {/* Provider Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              true ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <TestTube className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium">Ollama (Local)</span>
                </div>
                {ollamaStatus.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="text-sm text-gray-600">
                {ollamaStatus.connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            <div className="p-4 rounded-lg border-2 border-gray-200 opacity-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center mr-3">
                    <TestTube className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium">Google Gemini</span>
                </div>
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-sm text-gray-600">Coming Soon</div>
            </div>

            <div className="p-4 rounded-lg border-2 border-gray-200 opacity-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center mr-3">
                    <TestTube className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium">OpenAI</span>
                </div>
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-sm text-gray-600">Coming Soon</div>
            </div>
          </div>

          {/* Ollama Configuration */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ollama (Local) Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ollama Server URL
                </label>
                <input
                  type="text"
                  value={ollamaConfig.host_url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    ollamaConfig.host_url && !validateUrl(ollamaConfig.host_url) 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="http://192.168.1.100:11434"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the URL of your Ollama server</p>
                {ollamaConfig.host_url && !validateUrl(ollamaConfig.host_url) && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid URL</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-Select Best Model
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setOllamaConfig({ ...ollamaConfig, auto_selected: !ollamaConfig.auto_selected })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      ollamaConfig.auto_selected ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ollamaConfig.auto_selected ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="text-sm text-gray-600">
                    {ollamaConfig.auto_selected ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  When enabled, automatically selects the best available model
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Model
              </label>
              <select
                value={ollamaConfig.model_name}
                onChange={(e) => setOllamaConfig({ ...ollamaConfig, model_name: e.target.value })}
                disabled={ollamaConfig.auto_selected}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  ollamaConfig.auto_selected ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              >
                {ollamaStatus.models.length > 0 ? (
                  ollamaStatus.models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))
                ) : (
                  <option value="">Select a model...</option>
                )}
              </select>
              {ollamaStatus.models.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {ollamaStatus.models.length} models available
                  {ollamaConfig.auto_selected && (
                    <span className="ml-2 text-blue-600">
                      (Auto-selected: {ollamaConfig.model_name})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Status Messages */}
            {ollamaStatus.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{ollamaStatus.error}</span>
              </div>
            )}

            {ollamaStatus.connected && ollamaStatus.models.length === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                <span className="text-yellow-700 text-sm">No models found. Please check your Ollama installation.</span>
              </div>
            )}

            {ollamaStatus.connected && ollamaConfig.model_name && !ollamaStatus.models.includes(ollamaConfig.model_name) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                <span className="text-yellow-700 text-sm">
                  Selected model "{ollamaConfig.model_name}" not found. Please select an available model.
                </span>
              </div>
            )}

            {!ollamaStatus.connected && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">Not connected - test connection to verify settings</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={testOllamaConnection}
                disabled={testing || !validateUrl(ollamaConfig.host_url)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4 mr-2" />
                )}
                {testing ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                onClick={refreshModels}
                disabled={testing || !ollamaStatus.connected}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Models
              </button>

              <button
                onClick={scanModel}
                disabled={scanningModel || !ollamaStatus.connected || !ollamaConfig.model_name}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanningModel ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                {scanningModel ? 'Scanning...' : 'Scan Model'}
              </button>

              <button
                onClick={saveConfiguration}
                disabled={saving || !ollamaStatus.connected || !ollamaConfig.model_name || !validateUrl(ollamaConfig.host_url)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>

            {/* Scan Status Bar */}
            {scanStatus.isRunning && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-blue-900 font-medium">Model Security Scan in Progress</span>
                  </div>
                  <span className="text-blue-700 text-sm">{scanStatus.progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${scanStatus.progress}%` }}
                  ></div>
                </div>
                <p className="text-blue-700 text-sm mt-2 capitalize">
                  Status: {scanStatus.status.replace('-', ' ')}
                </p>
                
                {/* Real-time Scanner Output */}
                {(scanStatus.output || (scanStatus.result && scanStatus.result.output)) && (
                  <div className="mt-3">
                    <p className="text-blue-700 text-sm font-medium mb-2">Scanner Output:</p>
                    <div className="bg-gray-900 text-green-400 p-3 rounded-md text-xs font-mono max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{scanStatus.output || (scanStatus.result && scanStatus.result.output) || ''}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {scanStatus.status === 'completed' && scanStatus.result && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-green-900 font-medium">Model Security Scan Completed</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  The model has been scanned for security risks using Trend Micro Vision One AI Scanner.
                </p>
                
                {/* Detailed Scan Results */}
                {scanStatus.result.output && (
                  <div className="mt-3">
                    <p className="text-green-700 text-sm font-medium mb-2">Scan Results:</p>
                    <div className="bg-gray-900 text-green-400 p-3 rounded-md text-xs font-mono max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{scanStatus.result.output}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {scanStatus.status === 'failed' && scanStatus.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-900 font-medium">Model Security Scan Failed</span>
                </div>
                <p className="text-red-700 text-sm mt-1">{scanStatus.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Provider (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Provider</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900">
              <strong>Currently using:</strong> Ollama (Local)
            </p>
            <p className="text-blue-700 text-sm mt-1">
              This provider will be used for all AI features including meal analysis, chat, and health recommendations.
            </p>
            {ollamaStatus.connected && ollamaConfig.model_name && (
              <p className="text-blue-700 text-sm mt-2">
                <strong>Active model:</strong> {ollamaConfig.model_name}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Database Management */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="w-6 h-6 mr-2" />
          Database Management
        </h2>
        
        {/* Database Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Meals</p>
                <p className="text-2xl font-bold text-gray-900">{databaseStats.meals}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <TestTube className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Workouts</p>
                <p className="text-2xl font-bold text-gray-900">{databaseStats.workouts}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TestTube className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{databaseStats.users}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TestTube className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          Manage your meals and workouts data. Edit, delete, or add new entries.
        </p>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Export Data
          </button>
          
          <button 
            onClick={importData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Import Data
          </button>
          
          <button 
            onClick={clearData}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </button>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Advanced Settings</h2>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          <SettingsIcon className="w-4 h-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>
        
        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              Advanced configuration options will be available here in future updates.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Model fine-tuning settings</p>
              <p>• API rate limiting configuration</p>
              <p>• Cache management</p>
              <p>• Logging and debugging options</p>
            </div>
          </div>
        )}
      </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
