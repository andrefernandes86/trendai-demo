import React, { useState, useEffect } from 'react';
import { 
  Apple, 
  Dumbbell, 
  TrendingUp, 
  Calendar, 
  Target, 
  Activity,
  BarChart3,
  Clock,
  Flame,
  Heart,
  Zap,
  Award,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';

interface DashboardStats {
  nutrition: {
    totalMeals: number;
    thisWeek: number;
    averageCalories: number;
    goalsProgress: number;
    topFoods: string[];
    macros: {
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
    };
  };
  fitness: {
    totalWorkouts: number;
    thisWeek: number;
    totalCaloriesBurned: number;
    averageDuration: number;
    goalsProgress: number;
    workoutTypes: string[];
  };
  overall: {
    streakDays: number;
    healthScore: number;
    weeklyTrend: 'up' | 'down' | 'stable';
    nextGoal: string;
  };
}

const Dashboard: React.FC = () => {
  const { authAxios } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setError(null);
      const response = await authAxios.get('/dashboard/stats');
      setStats(response.data.stats);
    } catch (error: any) {
      console.error('Error loading dashboard stats:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load dashboard data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadDashboardStats}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-xs text-gray-500">v1.4.0</p>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <main className="h-full overflow-auto p-2">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
                <p className="text-gray-600">Your comprehensive health overview</p>
              </div>
                                      <div className="text-right">
                          <p className="text-sm text-gray-500">
                            Version: <span className="font-mono">1.4.9</span>
                          </p>
                          <p className="text-xs text-gray-400">Model Security Scanner Integration</p>
              </div>
            </div>
          </div>

          {stats && (
            <>
              {/* Overall Health Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                <div className="bg-white rounded-xl shadow-lg p-3 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Health Score</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.overall.healthScore}%</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-full">
                      <Heart className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <TrendingUp className={`w-4 h-4 mr-1 ${
                        stats.overall.weeklyTrend === 'up' ? 'text-green-500' : 
                        stats.overall.weeklyTrend === 'down' ? 'text-red-500' : 'text-gray-500'
                      }`} />
                      <span className="hidden sm:inline">
                        {stats.overall.weeklyTrend === 'up' ? 'Improving' : 
                         stats.overall.weeklyTrend === 'down' ? 'Declining' : 'Stable'} this week
                      </span>
                      <span className="sm:hidden">
                        {stats.overall.weeklyTrend === 'up' ? '↗' : 
                         stats.overall.weeklyTrend === 'down' ? '↘' : '→'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-3 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Day Streak</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.overall.streakDays}</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Flame className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-sm text-gray-600">Keep it up!</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-3 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Week</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.nutrition.thisWeek}</p>
                    </div>
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Apple className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-sm text-gray-600">Meals tracked</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-3 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Workouts</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.fitness.thisWeek}</p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Dumbbell className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-sm text-gray-600">This week</p>
                  </div>
                </div>
              </div>

              {/* Nutrition Overview */}
              <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center">
                    <Apple className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600 mr-2 lg:mr-3" />
                    <span className="hidden sm:inline">Nutrition Overview</span>
                    <span className="sm:hidden">Nutrition</span>
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">{stats.nutrition.goalsProgress}% of goals</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-xl lg:text-2xl font-bold text-blue-600">{stats.nutrition.totalMeals}</div>
                    <p className="text-sm text-gray-600">Total Meals</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl lg:text-2xl font-bold text-green-600">{stats.nutrition.averageCalories}</div>
                    <p className="text-sm text-gray-600">Avg Calories</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl lg:text-2xl font-bold text-purple-600">{stats.nutrition.macros.protein}g</div>
                    <p className="text-sm text-gray-600">Avg Protein</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl lg:text-2xl font-bold text-orange-600">{stats.nutrition.macros.carbs}g</div>
                    <p className="text-sm text-gray-600">Avg Carbs</p>
                  </div>
                </div>

                {stats.nutrition.topFoods.length > 0 && (
                  <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Most Tracked Foods</h3>
                    <div className="flex flex-wrap gap-2">
                      {stats.nutrition.topFoods.map((food, index) => (
                        <span key={index} className="px-2 lg:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fitness Overview */}
              <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center">
                    <Dumbbell className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 mr-2 lg:mr-3" />
                    <span className="hidden sm:inline">Fitness Overview</span>
                    <span className="sm:hidden">Fitness</span>
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">{stats.fitness.goalsProgress}% of goals</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-xl lg:text-2xl font-bold text-blue-600">{stats.fitness.totalWorkouts}</div>
                    <p className="text-sm text-gray-600">Total Workouts</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl lg:text-2xl font-bold text-green-600">{stats.fitness.totalCaloriesBurned}</div>
                    <p className="text-sm text-gray-600">Calories Burned</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl lg:text-2xl font-bold text-purple-600">{stats.fitness.averageDuration}</div>
                    <p className="text-sm text-gray-600">Avg Duration (min)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl lg:text-2xl font-bold text-orange-600">{stats.fitness.workoutTypes.length}</div>
                    <p className="text-sm text-gray-600">Workout Types</p>
                  </div>
                </div>

                {stats.fitness.workoutTypes.length > 0 && (
                  <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Workout Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {stats.fitness.workoutTypes.map((type, index) => (
                        <span key={index} className="px-2 lg:px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Weekly Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Weekly Nutrition Trend</h3>
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Calories</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 lg:w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">75%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Protein</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 lg:w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">85%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Fiber</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 lg:w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">60%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Weekly Fitness Trend</h3>
                    <Activity className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Workouts</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 lg:w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">80%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Duration</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 lg:w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">70%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Calories Burned</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 lg:w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">90%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Goal */}
              <div className="mt-6 lg:mt-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg p-4 lg:p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold mb-2">Next Goal</h3>
                    <p className="text-blue-100 text-sm lg:text-base">{stats.overall.nextGoal}</p>
                  </div>
                  <Award className="w-8 h-8 lg:w-12 lg:h-12 text-blue-200" />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
