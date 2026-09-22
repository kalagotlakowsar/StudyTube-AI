import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../api/client';
import { useToast } from '../components/Toast';
import {
  User as UserIcon, Mail, Globe, Sun, Moon,
  Save, Sparkles, BookOpen, CheckCircle2, Shield
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [preferredLang, setPreferredLang] = useState(user?.preferred_language || 'English');
  const [preferredTheme, setPreferredTheme] = useState(user?.theme_preference || theme);
  const [defaultMode, setDefaultMode] = useState(user?.study_preferences?.default_mode || 'detailed');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        name,
        preferred_language: preferredLang,
        theme_preference: preferredTheme,
        study_preferences: { default_mode: defaultMode }
      });
      updateUser(updated);
      setTheme(preferredTheme as 'dark' | 'light');
      toast('Profile preferences updated successfully!', 'success');
    } catch (err) {
      toast('Failed to update preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <UserIcon className="w-8 h-8 text-indigo-600" />
          <span>User Profile & Study Preferences</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize your default learning experience, preferred translation language, and platform theme.
        </p>
      </div>

      <form onSubmit={handleSave} className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        {/* Avatar Display */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <img
            src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`}
            alt={name}
            className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border-2 border-indigo-500/40 shadow-md"
          />
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{name || 'Scholar'}</h3>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Email (read only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-sm text-slate-400 cursor-not-allowed"
            />
          </div>

          {/* Preferred Language */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Default Target Language
            </label>
            <select
              value={preferredLang}
              onChange={(e) => setPreferredLang(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish (Español)</option>
              <option value="French">French (Français)</option>
              <option value="German">German (Deutsch)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Japanese">Japanese (日本語)</option>
              <option value="Chinese">Chinese (中文)</option>
            </select>
          </div>

          {/* Default Study Mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Default Study Mode
            </label>
            <select
              value={defaultMode}
              onChange={(e) => setDefaultMode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="detailed">Comprehensive Detailed Notes</option>
              <option value="quick">Quick Revision Cheat Sheet</option>
              <option value="exam">Exam Preparation Blueprint</option>
              <option value="beginner">Beginner Friendly (ELI5)</option>
            </select>
          </div>

          {/* Theme Preference */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Theme Preference
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPreferredTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  preferredTheme === 'dark'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setPreferredTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  preferredTheme === 'light'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light Mode</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all hover:scale-102"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
