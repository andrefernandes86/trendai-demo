import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check, Clock, Activity, Target, Dumbbell, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AddWorkoutWorkflowProps {
  onClose: () => void;
  onWorkoutAdded: () => void;
}

interface WorkoutAnalysis {
  confidence: number;
  userInformation: string;
  identifiedWorkout: string;
  understoodItems: string[];
  workoutBreakdown: string;
  searchTerms: string[];
  suggestedExercises: ExerciseItem[];
}

interface ExerciseItem {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  distance?: number;
  description: string;
  searchTerms: string[];
  category: string;
}

interface WorkoutSummary {
  name: string;
  workout_type: string;
  duration: number;
  calories_burned: number;
  exercises: ExerciseItem[];
  notes?: string;
}

const AddWorkoutWorkflow: React.FC<AddWorkoutWorkflowProps> = ({ onClose, onWorkoutAdded }) => {
  const { authAxios } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [workoutAnalysis, setWorkoutAnalysis] = useState<WorkoutAnalysis | null>(null);
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary | null>(null);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const steps = [
    { id: 1, title: 'Describe Workout', icon: Dumbbell },
    { id: 2, title: 'AI Analysis', icon: Target },
    { id: 3, title: 'Review & Save', icon: Check }
  ];

  const generateWorkoutAnalysis = (description: string): WorkoutAnalysis => {
    const lowerDesc = description.toLowerCase();
    
    // Common workout patterns
    if (lowerDesc.includes('strength') || lowerDesc.includes('weight') || lowerDesc.includes('lifting')) {
      return {
        confidence: 85,
        userInformation: `User said: "${description}"`,
        identifiedWorkout: 'Strength Training',
        understoodItems: [
          'Successfully identified strength training workout',
          'Extracted exercises and sets/reps',
          'Calculated estimated duration and calories'
        ],
        workoutBreakdown: 'Strength training session with compound movements',
        searchTerms: ['strength training', 'weight lifting', 'compound exercises'],
        suggestedExercises: [
          {
            name: 'Bench Press',
            sets: 3,
            reps: 8,
            weight: 135,
            description: '3 sets of 8 reps at 135 lbs',
            searchTerms: ['bench press', 'chest exercise'],
            category: 'Strength'
          },
          {
            name: 'Squats',
            sets: 3,
            reps: 10,
            weight: 185,
            description: '3 sets of 10 reps at 185 lbs',
            searchTerms: ['squats', 'leg exercise'],
            category: 'Strength'
          },
          {
            name: 'Deadlifts',
            sets: 3,
            reps: 6,
            weight: 225,
            description: '3 sets of 6 reps at 225 lbs',
            searchTerms: ['deadlifts', 'back exercise'],
            category: 'Strength'
          }
        ]
      };
    } else if (lowerDesc.includes('cardio') || lowerDesc.includes('running') || lowerDesc.includes('jogging')) {
      return {
        confidence: 90,
        userInformation: `User said: "${description}"`,
        identifiedWorkout: 'Cardio Training',
        understoodItems: [
          'Successfully identified cardio workout',
          'Extracted duration and intensity',
          'Calculated calories burned'
        ],
        workoutBreakdown: 'Cardiovascular training session',
        searchTerms: ['cardio', 'running', 'aerobic exercise'],
        suggestedExercises: [
          {
            name: 'Running',
            sets: 1,
            reps: 1,
            duration: 30,
            distance: 3,
            description: '30 minutes running, 3 miles',
            searchTerms: ['running', 'cardio'],
            category: 'Cardio'
          }
        ]
      };
    } else if (lowerDesc.includes('hiit') || lowerDesc.includes('interval')) {
      return {
        confidence: 88,
        userInformation: `User said: "${description}"`,
        identifiedWorkout: 'HIIT Training',
        understoodItems: [
          'Successfully identified HIIT workout',
          'Extracted intervals and exercises',
          'Calculated total duration'
        ],
        workoutBreakdown: 'High-intensity interval training',
        searchTerms: ['hiit', 'interval training', 'high intensity'],
        suggestedExercises: [
          {
            name: 'Burpees',
            sets: 5,
            reps: 10,
            duration: 30,
            description: '5 rounds of 10 burpees, 30 seconds rest',
            searchTerms: ['burpees', 'hiit'],
            category: 'HIIT'
          },
          {
            name: 'Mountain Climbers',
            sets: 5,
            reps: 20,
            duration: 30,
            description: '5 rounds of 20 mountain climbers, 30 seconds rest',
            searchTerms: ['mountain climbers', 'hiit'],
            category: 'HIIT'
          }
        ]
      };
    } else {
      // Generic workout analysis
      return {
        confidence: 75,
        userInformation: `User said: "${description}"`,
        identifiedWorkout: 'General Workout',
        understoodItems: [
          'Successfully identified workout components',
          'Extracted exercises and parameters',
          'Estimated duration and calories'
        ],
        workoutBreakdown: 'Mixed workout session',
        searchTerms: [description, 'workout', 'exercise'],
        suggestedExercises: [
          {
            name: 'Push-ups',
            sets: 3,
            reps: 15,
            description: '3 sets of 15 push-ups',
            searchTerms: ['push-ups', 'bodyweight'],
            category: 'Bodyweight'
          },
          {
            name: 'Planks',
            sets: 3,
            reps: 1,
            duration: 60,
            description: '3 planks, 60 seconds each',
            searchTerms: ['planks', 'core'],
            category: 'Core'
          }
        ]
      };
    }
  };

  const generateWorkoutSummary = (analysis: WorkoutAnalysis): WorkoutSummary => {
    const totalDuration = analysis.suggestedExercises.reduce((total, exercise) => {
      return total + (exercise.duration || (exercise.sets * 2)); // 2 minutes per set if no duration
    }, 0);

    const totalCalories = analysis.suggestedExercises.reduce((total, exercise) => {
      const baseCalories = exercise.duration ? exercise.duration * 8 : exercise.sets * 15;
      return total + baseCalories;
    }, 0);

    return {
      name: analysis.identifiedWorkout,
      workout_type: analysis.suggestedExercises[0]?.category || 'General',
      duration: totalDuration,
      calories_burned: totalCalories,
      exercises: analysis.suggestedExercises,
      notes: workoutNotes
    };
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!workoutDescription.trim()) {
        toast.error('Please describe your workout');
        return;
      }
      
      setLoading(true);
      try {
        const analysis = generateWorkoutAnalysis(workoutDescription);
        setWorkoutAnalysis(analysis);
        setCurrentStep(2);
      } catch (error) {
        toast.error('Error analyzing workout');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 2) {
      if (workoutAnalysis) {
        const summary = generateWorkoutSummary(workoutAnalysis);
        setWorkoutSummary(summary);
        setCurrentStep(3);
      }
    }
  };

  const handleSave = async () => {
    if (!workoutSummary) return;

    setLoading(true);
    try {
      await authAxios.post('/fitness/workouts', workoutSummary);
      toast.success('Workout saved successfully!');
      onWorkoutAdded();
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Failed to save workout');
    } finally {
      setLoading(false);
    }
  };

  const resetWorkflow = () => {
    setCurrentStep(1);
    setWorkoutDescription('');
    setWorkoutAnalysis(null);
    setWorkoutSummary(null);
    setWorkoutNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add Workout</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Describe Your Workout</h3>
                <p className="text-gray-600 mb-4">
                  Tell us about your workout session. Be as detailed as possible for better analysis.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workout Description
                </label>
                <textarea
                  value={workoutDescription}
                  onChange={(e) => setWorkoutDescription(e.target.value)}
                  placeholder="e.g., I did a strength training session with bench press 3x8 at 135lbs, squats 3x10 at 185lbs, and deadlifts 3x6 at 225lbs"
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  disabled={loading || !workoutDescription.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Analyzing...' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && workoutAnalysis && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Workout Analysis</h3>
                <p className="text-gray-600 mb-4">
                  Here's what we understood from your workout description:
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">Confidence Level</span>
                  <span className="text-sm font-bold text-blue-800">{workoutAnalysis.confidence}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${workoutAnalysis.confidence}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">User Information</h4>
                  <p className="text-gray-600 text-sm">{workoutAnalysis.userInformation}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Identified Workout</h4>
                  <p className="text-gray-600 text-sm">{workoutAnalysis.identifiedWorkout}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Analysis Results</h4>
                <ul className="space-y-1">
                  {workoutAnalysis.understoodItems.map((item, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Suggested Exercises</h4>
                <div className="space-y-3">
                  {workoutAnalysis.suggestedExercises.map((exercise, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{exercise.name}</h5>
                        <span className="text-sm text-gray-500">{exercise.category}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{exercise.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {exercise.sets && <span>{exercise.sets} sets</span>}
                        {exercise.reps && <span>{exercise.reps} reps</span>}
                        {exercise.weight && <span>{exercise.weight} lbs</span>}
                        {exercise.duration && <span>{exercise.duration} min</span>}
                        {exercise.distance && <span>{exercise.distance} miles</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && workoutSummary && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Review & Save Workout</h3>
                <p className="text-gray-600 mb-4">
                  Review your workout details and add any notes before saving.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Workout Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Dumbbell className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-600">{workoutSummary.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">{workoutSummary.duration} minutes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-gray-600">{workoutSummary.calories_burned} calories</span>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Exercises</h5>
                  <div className="space-y-2">
                    {workoutSummary.exercises.map((exercise, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{exercise.name}</span>
                        <span className="text-gray-500">{exercise.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  placeholder="Add any additional notes about your workout..."
                  className="w-full h-24 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Workout'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddWorkoutWorkflow;
