import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Target, Activity, Apple, Dumbbell, Download, Clock, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';

interface NutritionReport {
  totalMeals: number;
  averageCalories: number;
  totalCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  weeklyTrend: Array<{
    date: string;
    calories: number;
  }>;
}

interface FitnessReport {
  totalWorkouts: number;
  averageDuration: number;
  totalDuration: number;
  averageCaloriesBurned: number;
  workoutTypes: Array<{
    type: string;
    count: number;
  }>;
  goalsProgress: Array<{
    goal: string;
    current: number;
    target: number;
    percentage: number;
  }>;
  weeklyTrend: Array<{
    date: string;
    duration: number;
    calories: number;
  }>;
}

interface OverallHealth {
  calorieBalance: number;
  weeklyActivity: number;
  nutritionQuality: number;
  fitnessConsistency: number;
}

interface CombinedReport {
  nutrition: NutritionReport;
  fitness: FitnessReport;
  overallHealth: OverallHealth;
}

const Reports: React.FC = () => {
  const { authAxios } = useAuth();
  const [reports, setReports] = useState<CombinedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    loadReports();
  }, [timeRange]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await authAxios.get(`/reports/combined?timeRange=${timeRange}`);
      setReports(response.data);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reports) return;
    
    const reportData = {
      timeRange,
      generatedAt: new Date().toISOString(),
      ...reports
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Reports Available</h2>
            <p className="text-gray-600">Start tracking your nutrition and fitness to generate reports</p>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold text-gray-900">Reports</h1>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <main className="flex-1 overflow-auto p-1 lg:p-2">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Health Reports</h1>
                <p className="text-gray-600">Comprehensive analysis of your nutrition and fitness data</p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
                <button
                  onClick={exportReport}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Overall Health Score */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Overall Health Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {reports.overallHealth.calorieBalance > 0 ? '+' : ''}{reports.overallHealth.calorieBalance}
                </div>
                <p className="text-sm text-gray-600">Calorie Balance</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {reports.overallHealth.weeklyActivity}
                </div>
                <p className="text-sm text-gray-600">Weekly Activity (hours)</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {reports.overallHealth.nutritionQuality}
                </div>
                <p className="text-sm text-gray-600">Nutrition Quality</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {reports.overallHealth.fitnessConsistency}
                </div>
                <p className="text-sm text-gray-600">Fitness Consistency</p>
              </div>
            </div>
          </div>

          {/* Nutrition Report */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20 mb-4">
            <div className="flex items-center space-x-3 mb-4">
              <Apple className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Nutrition Report</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.nutrition.totalMeals}</div>
                <p className="text-sm text-gray-600">Total Meals</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.nutrition.averageCalories}</div>
                <p className="text-sm text-gray-600">Avg Calories/Meal</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.nutrition.totalCalories}</div>
                <p className="text-sm text-gray-600">Total Calories</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.nutrition.averageProtein}g</div>
                <p className="text-sm text-gray-600">Avg Protein</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.nutrition.averageCarbs}g</div>
                <p className="text-sm text-gray-600">Avg Carbohydrates</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.nutrition.averageFat}g</div>
                <p className="text-sm text-gray-600">Avg Fat</p>
              </div>
            </div>
          </div>

          {/* Fitness Report */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20 mb-4">
            <div className="flex items-center space-x-3 mb-4">
              <Dumbbell className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Fitness Report</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.fitness.totalWorkouts}</div>
                <p className="text-sm text-gray-600">Total Workouts</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.fitness.averageDuration} min</div>
                <p className="text-sm text-gray-600">Avg Duration</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.fitness.totalDuration} min</div>
                <p className="text-sm text-gray-600">Total Duration</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{reports.fitness.averageCaloriesBurned}</div>
                <p className="text-sm text-gray-600">Avg Calories/Workout</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Workout Types</h3>
                <div className="space-y-3">
                  {reports.fitness.workoutTypes.map((type, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{type.type}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(type.count / Math.max(...reports.fitness.workoutTypes.map(t => t.count))) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{type.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals Progress</h3>
                <div className="space-y-3">
                  {reports.fitness.goalsProgress.map((goal, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{goal.goal}</span>
                        <span className="text-sm font-medium">{goal.current}/{goal.target}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nutrition Trend</h3>
              <div className="space-y-2">
                {reports.nutrition.weeklyTrend.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{day.date}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(day.calories / 2500) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{day.calories} cal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fitness Trend</h3>
              <div className="space-y-2">
                {reports.fitness.weeklyTrend.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{day.date}</span>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span className="text-sm font-medium">{day.duration} min</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Activity className="w-3 h-3 text-red-600" />
                        <span className="text-sm font-medium">{day.calories} cal</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;
