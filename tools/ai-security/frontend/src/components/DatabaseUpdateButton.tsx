import React, { useState, useEffect } from 'react';
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Database,
  Wifi,
  Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface DownloadStatus {
  isDownloading: boolean;
  progress: number;
  status: 'idle' | 'starting' | 'downloading' | 'decompressing' | 'completed' | 'error';
  lastUpdate: string | null;
  error: string | null;
}

interface DatabaseUpdateButtonProps {
  className?: string;
}

const DatabaseUpdateButton: React.FC<DatabaseUpdateButtonProps> = ({ className = '' }) => {
  const { nutritionAxios } = useAuth();
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({
    isDownloading: false,
    progress: 0,
    status: 'idle',
    lastUpdate: null,
    error: null
  });
  const [isChecking, setIsChecking] = useState(false);

  // Check initial status
  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  // Poll for progress updates when downloading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (downloadStatus.isDownloading) {
      interval = setInterval(() => {
        checkDownloadProgress();
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [downloadStatus.isDownloading]);

  const checkDatabaseStatus = async () => {
    try {
      setIsChecking(true);
      const response = await nutritionAxios.get('/nutrition/openfoodfacts/status');
      if (response.data.downloadStatus) {
        setDownloadStatus(response.data.downloadStatus);
      }
    } catch (error) {
      console.error('Error checking database status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const checkDownloadProgress = async () => {
    try {
      const response = await nutritionAxios.get('/nutrition/openfoodfacts/progress');
      if (response.data.downloadStatus) {
        setDownloadStatus(response.data.downloadStatus);
        
        // Stop polling if download is complete or failed
        if (response.data.downloadStatus.status === 'completed' || 
            response.data.downloadStatus.status === 'error') {
          if (response.data.downloadStatus.status === 'completed') {
            toast.success('Database updated successfully!');
          } else if (response.data.downloadStatus.status === 'error') {
            toast.error(`Database update failed: ${response.data.downloadStatus.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking download progress:', error);
    }
  };

  const updateDatabase = async () => {
    if (downloadStatus.isDownloading) {
      toast.error('Database update already in progress');
      return;
    }

    try {
      const response = await nutritionAxios.post('/nutrition/openfoodfacts/update');
      
      if (response.data.success) {
        toast.success('Database update started');
        setDownloadStatus(prev => ({
          ...prev,
          isDownloading: true,
          status: 'starting',
          progress: 0
        }));
      } else {
        toast.error('Failed to start database update');
      }
    } catch (error: any) {
      console.error('Error updating database:', error);
      if (error.response?.status === 409) {
        toast.error('Database update already in progress');
      } else {
        toast.error('Failed to start database update');
      }
    }
  };

  const getStatusIcon = () => {
    switch (downloadStatus.status) {
      case 'downloading':
      case 'decompressing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (downloadStatus.status) {
      case 'starting':
        return 'Starting...';
      case 'downloading':
        return `Downloading... ${downloadStatus.progress}%`;
      case 'decompressing':
        return 'Processing...';
      case 'completed':
        return 'Up to date';
      case 'error':
        return 'Update failed';
      default:
        return 'Check for updates';
    }
  };

  const getButtonColor = () => {
    if (downloadStatus.isDownloading) {
      return 'bg-blue-600 hover:bg-blue-700';
    }
    if (downloadStatus.status === 'completed') {
      return 'bg-green-600 hover:bg-green-700';
    }
    if (downloadStatus.status === 'error') {
      return 'bg-red-600 hover:bg-red-700';
    }
    return 'bg-purple-600 hover:bg-purple-700';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Database Status */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Globe className="w-4 h-4" />
        <span>Food Database</span>
      </div>

      {/* Update Button */}
      <button
        onClick={updateDatabase}
        disabled={downloadStatus.isDownloading || isChecking}
        className={`flex items-center space-x-2 px-3 py-2 text-white rounded-md transition-colors disabled:opacity-50 ${getButtonColor()}`}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {downloadStatus.isDownloading ? getStatusText() : 'Update Database'}
        </span>
      </button>

      {/* Progress Bar */}
      {downloadStatus.isDownloading && (
        <div className="flex-1 max-w-xs">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${downloadStatus.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Last Update Info */}
      {downloadStatus.lastUpdate && !downloadStatus.isDownloading && (
        <div className="text-xs text-gray-500">
          Last update: {new Date(downloadStatus.lastUpdate).toLocaleDateString()}
        </div>
      )}

      {/* Error Display */}
      {downloadStatus.error && (
        <div className="text-xs text-red-600 max-w-xs">
          {downloadStatus.error}
        </div>
      )}
    </div>
  );
};

export default DatabaseUpdateButton;
