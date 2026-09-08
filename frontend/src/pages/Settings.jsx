import { useState, useEffect } from 'react';
import { User, Bell, Shield, Key, Globe, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [organization, setOrganization] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
      setDesignation(user.designation || 'Compliance Officer');
      setOrganization(user.organization || 'Legal Metrology Dept');
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      name: fullName.trim(),
      designation: designation.trim(),
      organization: organization.trim()
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs = [
    { id: 'account', label: 'Account Profile', icon: User },
    { id: 'api', label: 'AI Configuration', icon: Key },
    { id: 'compliance', label: 'Compliance Rules', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and compliance preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <tab.icon className={`w-5 h-5 mr-3 ${activeTab === tab.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-sm p-8">
          
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4">Profile Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <input 
                      type="email" 
                      disabled
                      value={email}
                      className="w-full px-3 py-2 border border-border rounded-md bg-black/5 dark:bg-white/5 text-muted-foreground cursor-not-allowed" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role / Designation</label>
                    <input 
                      type="text" 
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organization</label>
                    <input 
                      type="text" 
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Configuration Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Google Gemini AI Engine</h2>
                <p className="text-sm text-muted-foreground mb-6">Configure the AI models used for extracting label information and multimodal image processing.</p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gemini API Key</label>
                    <input 
                      type="password" 
                      defaultValue="***************************************" 
                      className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm" 
                    />
                    <p className="text-xs text-muted-foreground">Stored securely in environment variables.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Model</label>
                    <select className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option>gemini-2.5-flash (Fast & Accurate)</option>
                      <option>gemini-2.5-pro (High Reasoning)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Rules Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-4">Rule Enforcement Thresholds</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">Strict Date Parsing</h4>
                    <p className="text-xs text-muted-foreground mt-1">Require exact MM/YYYY format for Manufacturing Date</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">FSSAI Requirement</h4>
                    <p className="text-xs text-muted-foreground mt-1">Flag missing FSSAI numbers on edible food items</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">Strict Address Validation</h4>
                    <p className="text-xs text-muted-foreground mt-1">Ensure complete Pincode and State details in Manufacturer Address</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="mt-10 pt-6 border-t border-border flex justify-end">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium shadow-sm hover:bg-primary/90 transition-all flex items-center disabled:opacity-50"
            >
              {saving ? (
                <>Saving Changes...</>
              ) : saved ? (
                <>Saved Successfully!</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
