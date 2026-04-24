import React, { useEffect, useState } from 'react';
import { Shield, User, Trash2, Loader2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface UserSettings {
  public_duels: boolean;
  auto_delete_photos: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  public_duels: true,
  auto_delete_photos: false,
};

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('Unknown');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user?.id) { navigate('/auth'); return; }
    supabase
      .from('profiles')
      .select('display_name, country, settings')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || '');
          setCountry(data.country || 'Unknown');
          setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
        }
        setLoading(false);
      });

  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ 
        display_name: displayName, 
        country: country,
        settings 
      })
      .eq('id', user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleToggle = (key: keyof UserSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    // Delete all duels first, then sign out (full account deletion requires admin API)
    await supabase.from('duels').delete().eq('user_id', user.id);
    await supabase.from('comments').delete().eq('user_id', user.id);
    await supabase.from('reactions').delete().eq('user_id', user.id);
    await signOut();
    navigate('/');
  };

  const TABS = [
    { id: 'account', label: 'Account', icon: <User size={16} /> },
    { id: 'privacy', label: 'Privacy & Safety', icon: <Shield size={16} /> },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 container mx-auto px-4 max-w-4xl py-8 md:py-12 flex flex-col md:flex-row gap-8">

      {/* Sidebar */}
      <div className="w-full md:w-56 shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        <h2 className="hidden md:block text-xs uppercase tracking-widest text-neutral-500 font-bold mb-2 px-3">Settings</h2>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-surface text-foreground'
                : 'text-neutral-400 hover:text-foreground hover:bg-surface/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">Account</h1>
              <p className="text-neutral-400 text-sm">{user?.email}</p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="How you appear to others"
                  maxLength={32}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent placeholder:text-neutral-500"
                />
                <p className="text-xs text-neutral-500 mt-1.5">Shown on comments and your public profile.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Country</label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent text-white"
                >
                  {['Sri Lanka', 'India', 'USA', 'UK', 'Australia', 'Canada', 'Germany', 'France', 'Japan', 'Brazil', 'Other', 'Unknown'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1.5">Helps you rank on regional leaderboards.</p>
              </div>


              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saved && <Check size={14} />}
                {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-semibold mb-1 text-red-400">Danger Zone</h3>
              <p className="text-sm text-neutral-400 mb-4">Deletes all your duels, comments, and reactions. This cannot be undone.</p>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 font-medium transition-colors"
                >
                  <Trash2 size={15} />
                  Delete Account & All Data
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-300">Are you sure?</span>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-400"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-4 py-1.5 text-sm text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">Privacy & Safety</h1>
              <p className="text-neutral-400 text-sm">Manage how your photos and data are used on VRSUS.</p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
              <ToggleRow
                title="Allow duels to appear in Explore"
                desc="Your completed duels will be visible to other users on the Explore feed."
                checked={settings.public_duels}
                onChange={() => handleToggle('public_duels')}
              />
              <div className="border-t border-border" />
              <ToggleRow
                title="Auto-delete uploaded photos after analysis"
                desc="Photos are removed from storage immediately after results are generated."
                checked={settings.auto_delete_photos}
                onChange={() => handleToggle('auto_delete_photos')}
              />
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
              <h3 className="font-semibold">Safety Guidelines</h3>
              <ul className="text-sm text-neutral-400 space-y-2">
                <li>• Only upload photos of consenting adults (18+).</li>
                <li>• Do not use VRSUS to humiliate, harass, or bully others.</li>
                <li>• We actively monitor reports and will ban users violating these terms.</li>
              </ul>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saved && <Check size={14} />}
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ title, desc, checked, onChange }: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground mb-0.5">{title}</div>
        <div className="text-xs text-neutral-400">{desc}</div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? 'bg-accent' : 'bg-neutral-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );
}
