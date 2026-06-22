import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Activity, Archive } from 'lucide-react';
import { KeysCirculationTab } from './tabs/KeysCirculationTab';
import { KeysHistoryTab } from './tabs/KeysHistoryTab';

type TabType = 'circulation' | 'history';

export function KeyManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('circulation');

  const tabs = [
    { id: 'circulation' as TabType, label: 'En Circulation', icon: Activity },
    { id: 'history' as TabType, label: 'Historique', icon: Archive },
  ];

  return (
    <DashboardLayout currentPage="key-management">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Gestion des Clés</h1>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                      activeTab === tab.id
                        ? 'border-primary text-primary bg-amber-50'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'circulation' && <KeysCirculationTab />}
            {activeTab === 'history' && <KeysHistoryTab />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
