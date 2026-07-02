import React, { useState, useEffect } from 'react';
import { Plus, Dumbbell, Calendar, TrendingUp, Target, Clock, Activity, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import AddWorkoutWorkflow from '../components/AddWorkoutWorkflow';
import Sidebar from '../components/Sidebar';

interface Workout {
  id: number;
  name: string;
  workout_type: string;
  date_time: string;
  duration: number;
  calories_burned: number;
  exercises: Exercise[];
  notes?: string;
}

interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  distance?: number;
  calories: number;
}

interface WorkoutGoal {
  id: number;
  type: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
}

const Fitness: React.FC = () => {
  const { authAxios } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [goals, setGoals] = useState<WorkoutGoal[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    loadWorkouts();
    loadGoals();
    loadSummary();
  }, []);

  const loadWorkouts = async () => {
    try {
      const response = await authAxios.get('/fitness/workouts');
      setWorkouts(response.data.workouts || []);
    } catch (error) {
      console.error('Error loading workouts:', error);
      toast.error('Failed to load workouts');
    }
  };

  const loadGoals = async () => {
    try {
      const response = await authAxios.get('/fitness/goals');
      setGoals(response.data.goals || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('Failed to load fitness goals');
    }
  };

  const loadSummary = async () => {
    try {
      const response = await authAxios.get('/fitness/summary');
      setSummary(response.data || {});
    } catch (error) {
      console.error('Error loading summary:', error);
      toast.error('Failed to load fitness summary');
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkout = async (id: number) => {
    try {
      await authAxios.delete(`/fitness/workouts/${id}`);
      toast.success('Workout deleted successfully');
      loadWorkouts();
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast.error('Failed to delete workout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Fitness</h1>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <main className="flex-1 overflow-auto p-1 lg:p-2">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Fitness Tracker</h1>
            <p className="text-gray-600">Track your workouts, monitor progress, and achieve your fitness goals</p>
          </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Workouts</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalWorkouts || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Dumbbell className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">{summary.workoutsThisWeek || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Calories Burned</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalCaloriesBurned || 0}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Time</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalTime || 0}h</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Goals Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Fitness Goals</h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Add Goal
            </button>
          </div>
          
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No fitness goals set yet</p>
              <p className="text-sm text-gray-400">Set goals to track your progress</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal) => (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{goal.type}</h3>
                    <span className="text-sm text-gray-500">{goal.unit}</span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{goal.current}</span>
                      <span>{goal.target}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Deadline: {new Date(goal.deadline).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workouts Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Workouts</h2>
            <button 
              onClick={() => setShowAddWorkout(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Workout</span>
            </button>
          </div>

          {workouts.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No workouts yet</h3>
              <p className="text-gray-500 mb-6">Start tracking your fitness journey by adding your first workout</p>
              <button 
                onClick={() => setShowAddWorkout(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Add Your First Workout
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {workouts.slice(0, 5).map((workout) => (
                <div key={workout.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{workout.name}</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {workout.workout_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{workout.duration} min</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Activity className="w-4 h-4" />
                          <span>{workout.calories_burned} cal</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Dumbbell className="w-4 h-4" />
                          <span>{workout.exercises.length} exercises</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(workout.date_time).toLocaleDateString()} at {new Date(workout.date_time).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteWorkout(workout.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              
              {workouts.length > 5 && (
                <div className="text-center pt-4">
                  <button className="text-blue-600 hover:text-blue-800 font-medium">
                    View All Workouts ({workouts.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </main>
      </div>

      {/* Add Workout Modal */}
      {showAddWorkout && (
        <AddWorkoutWorkflow 
          onClose={() => setShowAddWorkout(false)}
          onWorkoutAdded={() => {
            setShowAddWorkout(false);
            loadWorkouts();
            loadSummary();
          }}
        />
      )}
    </div>
  );
};

export default Fitness;
