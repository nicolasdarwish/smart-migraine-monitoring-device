import * as React from 'react';
import { PageView, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { getCurrentUserProfile, saveUserProfile } from '../services/userProfile';

const COMMON_TRIGGERS = [
  "Stress",
  "Dehydration",
  "Lack of Sleep",
  "Bright Lights",
  "Loud Noise",
  "Strong Smells",
  "Weather Changes",
  "Caffeine Withdrawal",
  "Alcohol",
  "Aged Cheese",
  "Skipped Meals",
  "Hormonal Changes",
  "Screen Time",
  "Physical Exertion"
];

interface Props {
  onNavigate: (page: PageView) => void;
}

const ProfilePage: React.FC<Props> = ({ onNavigate }) => {
  const { user, logOut } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  
  // Form State
  const [formData, setFormData] = React.useState<UserProfile>({});
  const [triggerInput, setTriggerInput] = React.useState('');

  React.useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const data = await getCurrentUserProfile();
    if (data) {
        setFormData(data);
    } else {
        // Initialize with basic auth data if no profile exists
        setFormData({
            uid: user?.uid,
            email: user?.email || '',
            displayName: user?.displayName || '',
            triggers: []
        });
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTrigger = () => {
    if (!triggerInput.trim()) return;
    const currentTriggers = formData.triggers || [];
    // Case insensitive duplicate check
    if (!currentTriggers.some(t => t.toLowerCase() === triggerInput.trim().toLowerCase())) {
        handleChange('triggers', [...currentTriggers, triggerInput.trim()]);
    }
    setTriggerInput('');
  };

  const handleSelectTrigger = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) return;

    const currentTriggers = formData.triggers || [];
    if (!currentTriggers.includes(value)) {
        handleChange('triggers', [...currentTriggers, value]);
    }
    // Reset select
    e.target.value = "";
  };

  const removeTrigger = (triggerToRemove: string) => {
    const currentTriggers = formData.triggers || [];
    handleChange('triggers', currentTriggers.filter(t => t !== triggerToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
        await saveUserProfile(formData);
        alert("Profile saved successfully!");
    } catch (error) {
        console.error("Save error", error);
        alert("Failed to save profile.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexus-accent"></div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark text-slate-800 dark:text-slate-200">
      
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/50 backdrop-blur border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => onNavigate('DASHBOARD')}
                className="text-slate-400 hover:text-nexus-accent dark:hover:text-white transition-colors"
            >
                <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Health Profile</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Identity & Basic Stats */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-nexus-panel rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 mb-3 flex items-center justify-center text-4xl text-slate-300">
                        <i className="fas fa-user-circle"></i>
                    </div>
                    <h2 className="text-lg font-bold">{formData.displayName || 'User'}</h2>
                    <p className="text-xs text-slate-500">{formData.email}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:border-nexus-accent focus:outline-none"
                            value={formData.displayName || ''}
                            onChange={(e) => handleChange('displayName', e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Age</label>
                            <input 
                                type="number" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:border-nexus-accent focus:outline-none"
                                value={formData.age || ''}
                                onChange={(e) => handleChange('age', parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sex</label>
                            <select 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:border-nexus-accent focus:outline-none"
                                value={formData.sex || ''}
                                onChange={(e) => handleChange('sex', e.target.value)}
                            >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Height (cm)</label>
                            <input 
                                type="number" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:border-nexus-accent focus:outline-none"
                                value={formData.heightCm || ''}
                                onChange={(e) => handleChange('heightCm', parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Weight (kg)</label>
                            <input 
                                type="number" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:border-nexus-accent focus:outline-none"
                                value={formData.weightKg || ''}
                                onChange={(e) => handleChange('weightKg', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Right Column: Lifestyle & Medical (Spans 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Lifestyle Section */}
            <div className="bg-white dark:bg-nexus-panel rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
                <h3 className="text-md font-bold text-nexus-accent mb-4 flex items-center gap-2">
                    <i className="fas fa-heartbeat"></i> Lifestyle Factors
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Typical Sleep (Hours)</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="range" 
                                min="3" max="12" step="0.5"
                                className="flex-1 accent-nexus-accent"
                                value={formData.typicalSleepHours || 7}
                                onChange={(e) => handleChange('typicalSleepHours', parseFloat(e.target.value))}
                            />
                            <span className="text-sm font-mono w-12 text-center">{formData.typicalSleepHours || 7}h</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Consistent sleep reduces migraine frequency.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Daily Caffeine (Cups)</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:border-nexus-accent focus:outline-none"
                            value={formData.caffeinePerDay || 0}
                            onChange={(e) => handleChange('caffeinePerDay', parseInt(e.target.value))}
                        />
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div 
                            onClick={() => handleChange('smoker', !formData.smoker)}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${formData.smoker ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${formData.smoker ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="text-sm font-medium">Smoker?</span>
                    </div>
                </div>
            </div>

            {/* Medical Section */}
            <div className="bg-white dark:bg-nexus-panel rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
                <h3 className="text-md font-bold text-purple-500 mb-4 flex items-center gap-2">
                    <i className="fas fa-brain"></i> Migraine History
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Years Experiencing Migraines</label>
                         <input 
                            type="number" 
                            className="w-full max-w-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:border-nexus-accent focus:outline-none"
                            value={formData.migraineHistoryYears || 0}
                            onChange={(e) => handleChange('migraineHistoryYears', parseInt(e.target.value))}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Known Triggers</label>
                        
                        {/* Active Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {formData.triggers?.map((trigger, idx) => (
                                <span key={idx} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-600">
                                    {trigger}
                                    <button type="button" onClick={() => removeTrigger(trigger)} className="hover:text-red-500 transition-colors">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </span>
                            ))}
                             {(!formData.triggers || formData.triggers.length === 0) && (
                                <span className="text-xs text-slate-400 italic py-1">No triggers selected.</span>
                            )}
                        </div>
                        
                        {/* Dropdown & Input */}
                        <div className="flex flex-col gap-3">
                            <select 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:border-nexus-accent focus:outline-none appearance-none cursor-pointer"
                                onChange={handleSelectTrigger}
                                defaultValue=""
                            >
                                <option value="" disabled>+ Add a common trigger...</option>
                                {COMMON_TRIGGERS.filter(t => !formData.triggers?.includes(t)).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>

                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm focus:border-nexus-accent focus:outline-none"
                                    placeholder="Or type a custom trigger..."
                                    value={triggerInput}
                                    onChange={(e) => setTriggerInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrigger())}
                                />
                                <button 
                                    type="button"
                                    onClick={addTrigger}
                                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-4 rounded text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                    <i className="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>

                        <div className="mt-2 text-[10px] text-slate-400">
                            Adding accurate triggers helps the AI filter false positives.
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <button 
                    type="submit"
                    disabled={saving}
                    className="bg-nexus-accent hover:bg-sky-400 text-white dark:text-nexus-dark font-bold text-lg px-8 py-3 rounded-xl shadow-lg shadow-nexus-accent/20 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <span className="flex items-center gap-2">
                            <i className="fas fa-circle-notch fa-spin"></i> Saving...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <i className="fas fa-save"></i> Save Profile
                        </span>
                    )}
                </button>
            </div>

          </div>
        </form>
      </main>
    </div>
  );
};

export default ProfilePage;