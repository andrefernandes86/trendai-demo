import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Save, Edit, Trash2, Calendar, Clock, User, Menu, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

interface MealItem {
  id?: number;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  saturatedFat?: number;
  fiber: number;
  sugar: number;
  sodium?: number;
  cholesterol?: number;
  potassium?: number;
  nutriScore?: string;
  foodType?: string;
  ingredients?: string[];
  allergens?: string[];
  additives?: string[];
}

interface Meal {
  id?: number;
  name: string;
  meal_type: string;
  date_time: string;
  total_calories: number;
  total_carbs: number;
  total_protein: number;
  total_fat: number;
  total_saturatedFat?: number;
  total_fiber: number;
  total_sugar: number;
  total_sodium?: number;
  total_cholesterol?: number;
  total_potassium?: number;
  nutritionScore?: string;
  comments?: string;
  items: MealItem[];
}

const MealOverview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, nutritionAxios } = useAuth();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [comments, setComments] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    // Get meal data from location state (passed from AddMealWorkflow)
    if (location.state?.meal) {
      setMeal(location.state.meal);
      setComments(location.state.meal.comments || '');
    } else {
      // If no meal data, redirect back to nutrition page
      navigate('/nutrition');
    }
  }, [location.state, navigate]);

  const calculateOverallNutritionScore = (totals: any) => {
    let score = 0;
    
    // Calories scoring (lower is better)
    if (totals.calories <= 400) score += 0;
    else if (totals.calories <= 600) score += 2;
    else if (totals.calories <= 800) score += 4;
    else score += 6;
    
    // Fat scoring (lower is better)
    if (totals.fat <= 10) score += 0;
    else if (totals.fat <= 20) score += 2;
    else if (totals.fat <= 30) score += 4;
    else score += 6;
    
    // Sugar scoring (lower is better)
    if (totals.sugar <= 10) score += 0;
    else if (totals.sugar <= 20) score += 2;
    else if (totals.sugar <= 30) score += 4;
    else score += 6;
    
    // Fiber scoring (higher is better)
    if (totals.fiber >= 10) score += 0;
    else if (totals.fiber >= 5) score += 2;
    else if (totals.fiber >= 2) score += 4;
    else score += 6;
    
    // Protein scoring (moderate is better)
    if (totals.protein >= 15 && totals.protein <= 30) score += 0;
    else if (totals.protein >= 10 && totals.protein <= 40) score += 2;
    else score += 4;
    
    // Convert to letter grade
    if (score <= 2) return 'A';
    else if (score <= 10) return 'B';
    else if (score <= 18) return 'C';
    else if (score <= 26) return 'D';
    else return 'E';
  };

  const saveMeal = async () => {
    if (!meal) return;

    try {
      setIsSaving(true);
      
      const mealData = {
        ...meal,
        comments: comments.trim() || null
      };
      
      const response = await nutritionAxios.post('/nutrition/meals', mealData);

      if (response.status === 201) {
        toast.success('Meal saved successfully!');
        navigate('/nutrition');
      } else {
        toast.error(response.data?.error || 'Failed to save meal');
      }
    } catch (error: any) {
      console.error('Save meal error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save meal';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    navigate('/nutrition');
  };

  if (!meal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meal overview...</p>
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
              <h1 className="text-xl font-bold text-gray-900">Meal Overview</h1>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <main className="h-full overflow-auto p-2">
          {/* Desktop Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={goBack}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Nutrition</span>
                  </button>
                </div>
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-semibold text-gray-900">Meal Overview</h1>
                </div>
              </div>
            </div>
          </div>

          <div className="px-2 sm:px-4 lg:px-6 py-4">
        {/* Meal Header */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{meal.name}</h2>
              <p className="text-gray-600 capitalize">{meal.meal_type} • {new Date(meal.date_time).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {new Date(meal.date_time).toLocaleDateString()}
              </span>
              <Clock className="w-4 h-4 text-gray-400 ml-2" />
              <span className="text-sm text-gray-500">
                {new Date(meal.date_time).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Total Meal Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Meal Summary</h3>
          
          {/* Primary Macros - Highlighted */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Primary Macros</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
                <p className="text-3xl font-bold text-blue-600">{meal.total_calories}</p>
                <p className="text-sm text-blue-800 font-medium">Calories (kcal)</p>
                <p className="text-xs text-blue-600">Total energy</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center border-2 border-green-200">
                <p className="text-3xl font-bold text-green-600">{meal.total_carbs}g</p>
                <p className="text-sm text-green-800 font-medium">Carbohydrates (g)</p>
                <p className="text-xs text-green-600">Main energy source</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center border-2 border-purple-200">
                <p className="text-3xl font-bold text-purple-600">{meal.total_protein}g</p>
                <p className="text-sm text-purple-800 font-medium">Protein (g)</p>
                <p className="text-xs text-purple-600">Muscle repair, satiety</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center border-2 border-orange-200">
                <p className="text-3xl font-bold text-orange-600">{meal.total_fat}g</p>
                <p className="text-sm text-orange-800 font-medium">Total Fat (g)</p>
                <p className="text-xs text-orange-600">Overall fat intake</p>
              </div>
            </div>
          </div>
          
          {/* Secondary Macros - Less Prominent */}
          <div>
            <h4 className="text-md font-medium text-gray-600 mb-3">Additional Nutrients</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-lg font-semibold text-gray-700">{meal.total_saturatedFat || 0}g</p>
                <p className="text-xs text-gray-600">Saturated Fat</p>
                <p className="text-xs text-gray-500">Cardiovascular risk</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <p className="text-lg font-semibold text-yellow-600">{meal.total_fiber || 0}g</p>
                <p className="text-xs text-yellow-800">Fiber</p>
                <p className="text-xs text-yellow-600">Digestion, satiety</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-lg font-semibold text-red-600">{meal.total_sugar || 0}g</p>
                <p className="text-xs text-red-800">Sugar</p>
                <p className="text-xs text-red-600">Refined vs natural</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg text-center">
                <p className="text-lg font-semibold text-indigo-600">{meal.total_sodium || 0}mg</p>
                <p className="text-xs text-indigo-800">Sodium</p>
                <p className="text-xs text-indigo-600">Hydration, BP</p>
              </div>
              <div className="bg-pink-50 p-3 rounded-lg text-center">
                <p className="text-lg font-semibold text-pink-600">{meal.total_cholesterol || 0}mg</p>
                <p className="text-xs text-pink-800">Cholesterol</p>
                <p className="text-xs text-pink-600">Heart health</p>
              </div>
              <div className="bg-teal-50 p-3 rounded-lg text-center">
                <p className="text-lg font-semibold text-teal-600">{meal.total_potassium || 0}mg</p>
                <p className="text-xs text-teal-800">Potassium</p>
                <p className="text-xs text-teal-600">Electrolyte balance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Nutrition Assessment */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Nutrition Assessment</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Overall Score:</span>
              <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                meal.nutritionScore === 'A' ? 'bg-green-100 text-green-800' :
                meal.nutritionScore === 'B' ? 'bg-blue-100 text-blue-800' :
                meal.nutritionScore === 'C' ? 'bg-yellow-100 text-yellow-800' :
                meal.nutritionScore === 'D' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {meal.nutritionScore || calculateOverallNutritionScore(meal)}
              </span>
            </div>
          </div>
        </div>

        {/* Individual Components */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Components</h3>
          <div className="space-y-4">
            {meal.items?.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.food_name}</h4>
                    <p className="text-sm text-gray-500">{item.quantity} {item.unit}</p>
                  </div>
                  {item.nutriScore && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.nutriScore === 'A' ? 'bg-green-100 text-green-800' :
                      item.nutriScore === 'B' ? 'bg-blue-100 text-blue-800' :
                      item.nutriScore === 'C' ? 'bg-yellow-100 text-yellow-800' :
                      item.nutriScore === 'D' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      Nutri-Score: {item.nutriScore}
                    </span>
                  )}
                </div>
                
                {/* Primary Macros */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">{item.calories}</p>
                    <p className="text-xs text-gray-500">Calories</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-green-600">{item.carbs}g</p>
                    <p className="text-xs text-gray-500">Carbs</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-purple-600">{item.protein}g</p>
                    <p className="text-xs text-gray-500">Protein</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-orange-600">{item.fat}g</p>
                    <p className="text-xs text-gray-500">Fat</p>
                  </div>
                </div>
                
                {/* Secondary Nutrients */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs bg-gray-50 p-2 rounded">
                  <div className="text-center">
                    <p className="font-medium text-gray-700">{item.saturatedFat || 0}g</p>
                    <p className="text-gray-500">Sat. Fat</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-yellow-600">{item.fiber || 0}g</p>
                    <p className="text-gray-500">Fiber</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-red-600">{item.sugar || 0}g</p>
                    <p className="text-gray-500">Sugar</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-indigo-600">{item.sodium || 0}mg</p>
                    <p className="text-gray-500">Sodium</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-pink-600">{item.cholesterol || 0}mg</p>
                    <p className="text-gray-500">Chol.</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-teal-600">{item.potassium || 0}mg</p>
                    <p className="text-gray-500">Potassium</p>
                  </div>
                </div>
                
                {item.foodType && (
                  <p className="text-xs text-gray-500 mt-2">
                    Food Type: {item.foodType}
                  </p>
                )}
                
                {item.ingredients && item.ingredients.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Ingredients: {item.ingredients.join(', ')}
                  </p>
                )}
                
                {item.allergens && item.allergens.length > 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Allergens: {item.allergens.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add any notes about this meal (e.g., how it tasted, cooking method, special ingredients, etc.)"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={goBack}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={saveMeal}
            disabled={isSaving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Meal</span>
              </>
            )}
          </button>
        </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MealOverview;
