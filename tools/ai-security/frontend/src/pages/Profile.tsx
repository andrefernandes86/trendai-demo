import React, { useState, useEffect } from 'react';
import { User, Edit, Save, X, Camera, Shield, Bell, Palette, Key, Menu, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import GoalsManager from '../components/GoalsManager';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  activity_level?: string;
  fitness_goals?: string[];
  dietary_preferences?: string[];
  created_at: string;
  last_login: string;
}

interface ProfileStats {
  totalMeals: number;
  totalWorkouts: number;
  streakDays: number;
  averageCalories: number;
  averageWorkoutDuration: number;
  goalsCompleted: number;
  totalGoals: number;
}

const Profile: React.FC = () => {
  const { user, authAxios } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGoalsManager, setShowGoalsManager] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authAxios.get('/auth/profile');
      setProfile(response.data.profile);
      setEditedProfile(response.data.profile);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await authAxios.get('/auth/profile/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await authAxios.put('/auth/profile', editedProfile);
      setProfile(response.data.profile);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
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

  if (!profile) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600">Unable to load your profile information</p>
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
              <h1 className="text-xl font-bold text-gray-900">Profile</h1>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <main className="flex-1 overflow-auto p-1 lg:p-2">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
                <p className="text-gray-600">Manage your personal information and preferences</p>
              </div>
              <div className="flex items-center space-x-4">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCancel}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20">
                <div className="text-center mb-4">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
                      {profile.first_name ? profile.first_name.charAt(0) : profile.username.charAt(0)}
                    </div>
                    {isEditing && (
                      <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors">
                        <Camera className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {profile.first_name && profile.last_name 
                      ? `${profile.first_name} ${profile.last_name}`
                      : profile.username
                    }
                  </h2>
                  <p className="text-gray-600">{profile.email}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Member since {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Quick Stats */}
                {stats && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.totalMeals}</div>
                        <p className="text-sm text-gray-600">Meals Tracked</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.totalWorkouts}</div>
                        <p className="text-sm text-gray-600">Workouts</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.streakDays}</div>
                        <p className="text-sm text-gray-600">Day Streak</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{stats.goalsCompleted}/{stats.totalGoals}</div>
                        <p className="text-sm text-gray-600">Goals</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input
                      type="text"
                      value={editedProfile.username || ''}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editedProfile.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={editedProfile.first_name || ''}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={editedProfile.last_name || ''}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={editedProfile.date_of_birth || ''}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={editedProfile.gender || ''}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                    <input
                      type="number"
                      value={editedProfile.height || ''}
                      onChange={(e) => handleInputChange('height', parseInt(e.target.value))}
                      disabled={!isEditing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                    <input
                      type="number"
                      value={editedProfile.weight || ''}
                      onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
                      disabled={!isEditing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
                    <select
                      value={editedProfile.activity_level || ''}
                      onChange={(e) => handleInputChange('activity_level', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select activity level</option>
                      <option value="sedentary">Sedentary</option>
                      <option value="lightly_active">Lightly Active</option>
                      <option value="moderately_active">Moderately Active</option>
                      <option value="very_active">Very Active</option>
                      <option value="extremely_active">Extremely Active</option>
                    </select>
                  </div>
                </div>

                {/* Fitness Goals */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fitness Goals</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Weight Loss', 'Muscle Gain', 'Endurance', 'Strength', 'Flexibility', 'General Fitness'].map((goal) => (
                      <label key={goal} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editedProfile.fitness_goals?.includes(goal) || false}
                          onChange={(e) => {
                            const currentGoals = editedProfile.fitness_goals || [];
                            const newGoals = e.target.checked
                              ? [...currentGoals, goal]
                              : currentGoals.filter(g => g !== goal);
                            handleInputChange('fitness_goals', newGoals);
                          }}
                          disabled={!isEditing}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">{goal}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Dietary Preferences */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preferences</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Keto', 'Paleo', 'Mediterranean'].map((pref) => (
                      <label key={pref} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editedProfile.dietary_preferences?.includes(pref) || false}
                          onChange={(e) => {
                            const currentPrefs = editedProfile.dietary_preferences || [];
                            const newPrefs = e.target.checked
                              ? [...currentPrefs, pref]
                              : currentPrefs.filter(p => p !== pref);
                            handleInputChange('dietary_preferences', newPrefs);
                          }}
                          disabled={!isEditing}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

                             {/* Account Settings */}
               <div className="bg-white rounded-xl shadow-lg p-4 border border-white/20 mt-4">
                 <h3 className="text-xl font-bold text-gray-900 mb-4">Account Settings</h3>

                 <div className="space-y-4">
                   <button 
                     onClick={() => setShowGoalsManager(true)}
                     className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                   >
                     <div className="flex items-center space-x-3">
                       <Target className="w-5 h-5 text-gray-600" />
                       <div className="text-left">
                         <div className="font-medium text-gray-900">Set Goals</div>
                         <div className="text-sm text-gray-600">Configure your nutrition and fitness goals</div>
                       </div>
                     </div>
                   </button>

                   <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                     <div className="flex items-center space-x-3">
                       <Shield className="w-5 h-5 text-gray-600" />
                       <div className="text-left">
                         <div className="font-medium text-gray-900">Privacy Settings</div>
                         <div className="text-sm text-gray-600">Manage your privacy and data sharing</div>
                       </div>
                     </div>
                   </button>

                   <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                     <div className="flex items-center space-x-3">
                       <Bell className="w-5 h-5 text-gray-600" />
                       <div className="text-left">
                         <div className="font-medium text-gray-900">Notifications</div>
                         <div className="text-sm text-gray-600">Configure email and push notifications</div>
                       </div>
                     </div>
                   </button>

                   <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                     <div className="flex items-center space-x-3">
                       <Palette className="w-5 h-5 text-gray-600" />
                       <div className="text-left">
                         <div className="font-medium text-gray-900">Appearance</div>
                         <div className="text-sm text-gray-600">Customize theme and display settings</div>
                       </div>
                     </div>
                   </button>

                   <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                     <div className="flex items-center space-x-3">
                       <Key className="w-5 h-5 text-gray-600" />
                       <div className="text-left">
                         <div className="font-medium text-gray-900">Change Password</div>
                         <div className="text-sm text-gray-600">Update your account password</div>
                       </div>
                     </div>
                   </button>
                 </div>
               </div>
            </div>
          </div>
                 </main>
       </div>

       {/* Goals Manager Modal */}
       <GoalsManager 
         isOpen={showGoalsManager} 
         onClose={() => setShowGoalsManager(false)} 
       />
     </div>
   );
 };

export default Profile;
