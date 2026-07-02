import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  TrendingUp, 
  Calendar, 
  Utensils,
  Apple,
  Coffee,
  Pizza,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Settings,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import AddMealWorkflow from '../components/AddMealWorkflow';
import DatabaseUpdateButton from '../components/DatabaseUpdateButton';
import Sidebar from '../components/Sidebar';

interface Meal {
  id: number;
  name: string;
  meal_type: string;
  date_time: string;
  total_calories: number;
  total_carbs: number;
  total_protein: number;
  total_fat: number;
  total_fiber: number;
  total_sugar: number;
  confirmed: boolean;
  items: MealItem[];
}

interface MealItem {
  id: number;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  sugar: number;
}

interface NutritionGoals {
  daily_calories: number;
  carbs_ratio: number;
  protein_ratio: number;
  fat_ratio: number;
  daily_water_goal: number;
}

interface NutritionSummary {
  total_meals: number;
  total_calories: number;
  total_carbs: number;
  total_protein: number;
  total_fat: number;
  total_fiber: number;
  total_sugar: number;
  avg_calories_per_meal: number;
}

const Nutrition: React.FC = () => {
  const { nutritionAxios } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [summary, setSummary] = useState<NutritionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Load data on component mount
  useEffect(() => {
    loadMeals();
    loadGoals();
    loadSummary();
  }, []);

  const loadMeals = async () => {
    try {
      setLoading(true);
      const response = await nutritionAxios.get('/nutrition/meals');
      setMeals(response.data.meals || []);
    } catch (error) {
      console.error('Failed to load meals:', error);
      toast.error('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async (mealId: number) => {
    if (!window.confirm('Are you sure you want to delete this meal?')) {
      return;
    }

    try {
      await nutritionAxios.delete(`/nutrition/meals/${mealId}`);
      toast.success('Meal deleted successfully');
      loadMeals(); // Reload the meals list
    } catch (error) {
      console.error('Failed to delete meal:', error);
      toast.error('Failed to delete meal');
    }
  };

  const loadGoals = async () => {
    try {
      const response = await nutritionAxios.get('/nutrition/goals');
      setGoals(response.data.goals);
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await nutritionAxios.get('/nutrition/summary');
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };



  const getMealTypeIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast': return <Coffee className="w-4 h-4" />;
      case 'lunch': return <Utensils className="w-4 h-4" />;
      case 'dinner': return <Pizza className="w-4 h-4" />;
      case 'snack': return <Apple className="w-4 h-4" />;
      default: return <Utensils className="w-4 h-4" />;
    }
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast': return 'bg-orange-100 text-orange-800';
      case 'lunch': return 'bg-blue-100 text-blue-800';
      case 'dinner': return 'bg-purple-100 text-purple-800';
      case 'snack': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredMeals = meals.filter(meal => {
    if (filterType !== 'all' && meal.meal_type !== filterType) return false;
    if (dateRange.start && new Date(meal.date_time) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(meal.date_time) > new Date(dateRange.end)) return false;
    return true;
  });

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
              <h1 className="text-xl font-bold text-gray-900">Nutrition</h1>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <main className="h-full overflow-auto p-2">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Nutrition Management</h1>
            <p className="text-gray-600">Track your meals, analyze nutrition, and achieve your health goals</p>
          </div>

              {/* Quick Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Calories</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(summary.total_calories || 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Meals Tracked</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_meals || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Avg Calories/Meal</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(summary.avg_calories_per_meal || 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Daily Goal</p>
                <p className="text-2xl font-bold text-gray-900">{goals?.daily_calories || 2000}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-4">
        <button
          onClick={() => setShowAddMeal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Meal
        </button>
        <button
          onClick={() => setShowGoals(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Target className="w-4 h-4 mr-2" />
          Set Goals
        </button>
        <button
          onClick={loadMeals}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Database Update Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Food Database Management</h2>
        <p className="text-gray-600 mb-4">
          Keep your food database up to date with the latest nutritional information from OpenFoodFacts.
          The database is automatically updated daily at 1 AM, or you can manually update it anytime.
        </p>
        <DatabaseUpdateButton />
      </div>



      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Meals</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Meals List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Meals</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading meals...</p>
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="p-6 text-center">
            <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No meals found. Add your first meal to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMeals.map((meal) => (
              <div key={meal.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${getMealTypeColor(meal.meal_type)}`}>
                      {getMealTypeIcon(meal.meal_type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{meal.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(meal.date_time)}
                        </span>
                        <span className="flex items-center">
                          <Target className="w-4 h-4 mr-1" />
                          {Math.round(meal.total_calories)} cal
                        </span>
                        {meal.confirmed ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirmed
                          </span>
                        ) : (
                          <span className="flex items-center text-yellow-600">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingMeal(meal)}
                      className="p-2 text-gray-600 hover:text-blue-600"
                      title="Edit meal"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedMeal(meal)}
                      className="p-2 text-gray-600 hover:text-green-600"
                      title="View details"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMeal(meal.id)}
                      className="p-2 text-gray-600 hover:text-red-600"
                      title="Delete meal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Nutritional Info */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Carbs:</span>
                    <span className="ml-2 font-medium">{Math.round(meal.total_carbs)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Protein:</span>
                    <span className="ml-2 font-medium">{Math.round(meal.total_protein)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fat:</span>
                    <span className="ml-2 font-medium">{Math.round(meal.total_fat)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fiber:</span>
                    <span className="ml-2 font-medium">{Math.round(meal.total_fiber)}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Meal Workflow */}
      <AddMealWorkflow
        isOpen={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        onMealAdded={loadMeals}
      />

      {showGoals && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nutrition Goals</h3>
            <p className="text-gray-600 mb-4">Goal setting form coming soon...</p>
            <button
              onClick={() => setShowGoals(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
};

export default Nutrition;
