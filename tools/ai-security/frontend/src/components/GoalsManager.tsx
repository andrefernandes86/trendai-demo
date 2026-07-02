import React, { useState, useEffect } from 'react';
import { Target, Apple, Dumbbell, Save, X, TrendingUp, Calendar, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface NutritionGoals {
  daily_calories: number;
  carbs_ratio: number;
  protein_ratio: number;
  fat_ratio: number;
  daily_water_goal: number;
}

interface FitnessGoals {
  weekly_workouts: number;
  target_calories_per_week: number;
  target_activities: string[];
}

interface GoalsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoalsManager: React.FC<GoalsManagerProps> = ({ isOpen, onClose }) => {
  const { authAxios } = useAuth();
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>({
    daily_calories: 2000,
    carbs_ratio: 45.0,
    protein_ratio: 25.0,
    fat_ratio: 30.0,
    daily_water_goal: 2000.0
  });
  const [fitnessGoals, setFitnessGoals] = useState<FitnessGoals>({
    weekly_workouts: 3,
    target_calories_per_week: 1000,
    target_activities: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'nutrition' | 'fitness'>('nutrition');

  const availableActivities = [
    'Running', 'Walking', 'Cycling', 'Swimming', 'Weight Training',
    'Yoga', 'Pilates', 'HIIT', 'CrossFit', 'Basketball', 'Soccer',
    'Tennis', 'Golf', 'Hiking', 'Dancing', 'Boxing', 'Martial Arts'
  ];

  useEffect(() => {
    if (isOpen) {
      loadGoals();
    }
  }, [isOpen]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      // Load nutrition goals
      const nutritionResponse = await authAxios.get('/nutrition/goals');
      if (nutritionResponse.data.goals) {
        setNutritionGoals(nutritionResponse.data.goals);
      }

      // Load fitness goals
      const fitnessResponse = await authAxios.get('/fitness/goals');
      if (fitnessResponse.data.goals && fitnessResponse.data.goals.length > 0) {
        const fitnessGoal = fitnessResponse.data.goals[0];
        setFitnessGoals({
          weekly_workouts: fitnessGoal.weekly_workouts || 3,
          target_calories_per_week: fitnessGoal.target_calories_per_week || 1000,
          target_activities: fitnessGoal.target_activities ? 
            (typeof fitnessGoal.target_activities === 'string' ? 
              JSON.parse(fitnessGoal.target_activities) : fitnessGoal.target_activities) : []
        });
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    setLoading(true);
    try {
      // Save nutrition goals
      await authAxios.put('/nutrition/goals', nutritionGoals);

      // Save fitness goals
      await authAxios.put('/fitness/goals', {
        weekly_workouts: fitnessGoals.weekly_workouts,
        target_calories_per_week: fitnessGoals.target_calories_per_week,
        target_activities: fitnessGoals.target_activities
      });

      toast.success('Goals updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving goals:', error);
      toast.error('Failed to save goals');
    } finally {
      setLoading(false);
    }
  };

  const handleActivityToggle = (activity: string) => {
    setFitnessGoals(prev => ({
      ...prev,
      target_activities: prev.target_activities.includes(activity)
        ? prev.target_activities.filter(a => a !== activity)
        : [...prev.target_activities, activity]
    }));
  };

  const calculateMacroGrams = (ratio: number, totalCalories: number) => {
    return Math.round((ratio / 100) * totalCalories / 4); // 4 calories per gram for carbs/protein
  };

  const calculateFatGrams = (ratio: number, totalCalories: number) => {
    return Math.round((ratio / 100) * totalCalories / 9); // 9 calories per gram for fat
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Target className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Set Your Goals</h2>
                <p className="text-blue-100">Customize your nutrition and fitness targets</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'nutrition'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Apple className="w-5 h-5" />
                <span>Nutrition Goals</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('fitness')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'fitness'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Dumbbell className="w-5 h-5" />
                <span>Fitness Goals</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Nutrition Goals Tab */}
              {activeTab === 'nutrition' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daily Calories */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Daily Calorie Target
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          value={nutritionGoals.daily_calories}
                          onChange={(e) => setNutritionGoals(prev => ({
                            ...prev,
                            daily_calories: parseInt(e.target.value) || 0
                          }))}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1200"
                          max="5000"
                          step="50"
                        />
                        <span className="text-gray-600 font-medium">calories</span>
                      </div>
                    </div>

                    {/* Daily Water Goal */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Daily Water Goal
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          value={nutritionGoals.daily_water_goal}
                          onChange={(e) => setNutritionGoals(prev => ({
                            ...prev,
                            daily_water_goal: parseFloat(e.target.value) || 0
                          }))}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="500"
                          max="5000"
                          step="100"
                        />
                        <span className="text-gray-600 font-medium">ml</span>
                      </div>
                    </div>
                  </div>

                  {/* Macro Ratios */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Macronutrient Ratios</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Carbohydrates */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Carbohydrates
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            value={nutritionGoals.carbs_ratio}
                            onChange={(e) => setNutritionGoals(prev => ({
                              ...prev,
                              carbs_ratio: parseFloat(e.target.value) || 0
                            }))}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="text-gray-600 font-medium">%</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {calculateMacroGrams(nutritionGoals.carbs_ratio, nutritionGoals.daily_calories)}g
                        </p>
                      </div>

                      {/* Protein */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Protein
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            value={nutritionGoals.protein_ratio}
                            onChange={(e) => setNutritionGoals(prev => ({
                              ...prev,
                              protein_ratio: parseFloat(e.target.value) || 0
                            }))}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="text-gray-600 font-medium">%</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {calculateMacroGrams(nutritionGoals.protein_ratio, nutritionGoals.daily_calories)}g
                        </p>
                      </div>

                      {/* Fat */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fat
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            value={nutritionGoals.fat_ratio}
                            onChange={(e) => setNutritionGoals(prev => ({
                              ...prev,
                              fat_ratio: parseFloat(e.target.value) || 0
                            }))}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="text-gray-600 font-medium">%</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {calculateFatGrams(nutritionGoals.fat_ratio, nutritionGoals.daily_calories)}g
                        </p>
                      </div>
                    </div>

                    {/* Total Ratio Check */}
                    <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-800">
                        Total Ratio: {nutritionGoals.carbs_ratio + nutritionGoals.protein_ratio + nutritionGoals.fat_ratio}%
                        {nutritionGoals.carbs_ratio + nutritionGoals.protein_ratio + nutritionGoals.fat_ratio !== 100 && (
                          <span className="text-red-600 ml-2">(Should equal 100%)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fitness Goals Tab */}
              {activeTab === 'fitness' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Weekly Workouts */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weekly Workout Goal
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          value={fitnessGoals.weekly_workouts}
                          onChange={(e) => setFitnessGoals(prev => ({
                            ...prev,
                            weekly_workouts: parseInt(e.target.value) || 0
                          }))}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1"
                          max="7"
                        />
                        <span className="text-gray-600 font-medium">workouts per week</span>
                      </div>
                    </div>

                    {/* Weekly Calories */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weekly Calorie Burn Goal
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          value={fitnessGoals.target_calories_per_week}
                          onChange={(e) => setFitnessGoals(prev => ({
                            ...prev,
                            target_calories_per_week: parseInt(e.target.value) || 0
                          }))}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="100"
                          max="5000"
                          step="50"
                        />
                        <span className="text-gray-600 font-medium">calories per week</span>
                      </div>
                    </div>
                  </div>

                  {/* Target Activities */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Activities</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Select the activities you want to focus on:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {availableActivities.map((activity) => (
                        <label
                          key={activity}
                          className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            fitnessGoals.target_activities.includes(activity)
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={fitnessGoals.target_activities.includes(activity)}
                            onChange={() => handleActivityToggle(activity)}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">{activity}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGoals}
              disabled={loading || (activeTab === 'nutrition' && 
                nutritionGoals.carbs_ratio + nutritionGoals.protein_ratio + nutritionGoals.fat_ratio !== 100)}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Goals'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalsManager;
