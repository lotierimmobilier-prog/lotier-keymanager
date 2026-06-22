import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Key, Building, Activity, AlertTriangle, Home, BookOpen, Lightbulb, Bell, Info } from 'lucide-react';
import { Link } from '../../components/Link';

interface Stats {
  totalKeyrings: number;
  totalKeys: number;
  availableKeys: number;
  outKeys: number;
  overdueKeys: number;
  totalProperties: number;
  availableKeyrings: number;
  recentMovements: Array<{
    property_ref: string;
    property_address: string;
    given_to_name: string;
    out_at: string;
    returned_at: string | null;
    key_count: number;
    keys: Array<{
      id: string;
      key_label: string;
    }>;
  }>;
}

interface DashboardContent {
  id: string;
  content_type: string;
  title: string;
  content: string;
  icon: string;
  color: string;
  display_order: number;
}

const iconMap: Record<string, any> = {
  Home,
  BookOpen,
  Lightbulb,
  Bell,
  Info,
  Key,
  Building,
};

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalKeyrings: 0,
    totalKeys: 0,
    availableKeys: 0,
    outKeys: 0,
    overdueKeys: 0,
    totalProperties: 0,
    availableKeyrings: 0,
    recentMovements: [],
  });
  const [contentBlocks, setContentBlocks] = useState<DashboardContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.agency_id) {
      loadDashboardData();
    } else if (profile && !profile.agency_id) {
      setLoading(false);
    }
  }, [profile]);

  async function loadDashboardData() {
    if (!profile?.agency_id) {
      setLoading(false);
      return;
    }

    try {
      const [keysResult, propertiesResult, movementsResult, contentResult] = await Promise.all([
        supabase
          .from('keys')
          .select('*')
          .eq('agency_id', profile.agency_id)
          .neq('status', 'ARCHIVED'),
        supabase
          .from('properties')
          .select('id')
          .eq('agency_id', profile.agency_id),
        supabase
          .from('key_movements')
          .select(`
            id,
            given_to_name,
            out_at,
            expected_return_at,
            returned_at,
            keys!inner(
              id,
              label,
              properties(reference, address)
            )
          `)
          .eq('agency_id', profile.agency_id)
          .order('out_at', { ascending: false })
          .limit(20),
        supabase
          .from('dashboard_content')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
      ]);

      if (keysResult.error) {
        console.error('Keys error:', keysResult.error);
      }
      if (propertiesResult.error) {
        console.error('Properties error:', propertiesResult.error);
      }
      if (movementsResult.error) {
        console.error('Movements error:', movementsResult.error);
      }
      if (contentResult.error) {
        console.error('Content error:', contentResult.error);
      }

      const keys = keysResult.data || [];

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const overdueKeysData = await supabase
        .from('key_movements')
        .select('id, expected_return_at')
        .eq('agency_id', profile.agency_id)
        .is('returned_at', null)
        .lt('expected_return_at', now.toISOString());

      const overdueCount = overdueKeysData.data?.length || 0;

      const keysByProperty = keys
        .filter((k: any) => k.property_id)
        .reduce((groups: {[key: string]: any[]}, key: any) => {
          if (!groups[key.property_id]) {
            groups[key.property_id] = [];
          }
          groups[key.property_id].push(key);
          return groups;
        }, {});

      const totalKeyringsCount = Object.keys(keysByProperty).length;

      const availableKeysByProperty = keys
        .filter((k: any) => k.status === 'AVAILABLE' && k.property_id)
        .reduce((groups: {[key: string]: any[]}, key: any) => {
          if (!groups[key.property_id]) {
            groups[key.property_id] = [];
          }
          groups[key.property_id].push(key);
          return groups;
        }, {});

      const availableKeyringsCount = Object.keys(availableKeysByProperty).length;

      const rawMovements = movementsResult.data || [];

      const groupedMovements = rawMovements.reduce((groups: {[key: string]: any[]}, movement: any) => {
        const propertyRef = movement.keys?.properties?.reference || 'N/A';
        const groupKey = `${propertyRef}_${movement.given_to_name}_${movement.out_at}`;
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(movement);
        return groups;
      }, {});

      const movements = Object.values(groupedMovements).slice(0, 5).map((group: any) => {
        const firstMovement = group[0];
        return {
          property_ref: firstMovement.keys?.properties?.reference || 'N/A',
          property_address: firstMovement.keys?.properties?.address || 'N/A',
          given_to_name: firstMovement.given_to_name,
          out_at: firstMovement.out_at,
          returned_at: firstMovement.returned_at,
          key_count: group.length,
          keys: group.map((m: any) => ({
            id: m.id,
            key_label: m.keys?.label || 'N/A',
          })),
        };
      });

      setStats({
        totalKeyrings: totalKeyringsCount,
        totalKeys: keys.length,
        availableKeys: keys.filter((k) => k.status === 'AVAILABLE').length,
        outKeys: keys.filter((k) => k.status === 'OUT').length,
        overdueKeys: overdueCount,
        totalProperties: propertiesResult.data?.length || 0,
        availableKeyrings: availableKeyringsCount,
        recentMovements: movements,
      });

      setContentBlocks(contentResult.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderContent(content: string) {
    const normalizedContent = content.replace(/\\n/g, '\n');
    const lines = normalizedContent.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: { type: 'ol' | 'ul'; items: string[] } | null = null;
    let listIndex = 0;

    lines.forEach((line, index) => {
      if (line.startsWith('# ')) {
        if (currentList) {
          elements.push(
            currentList.type === 'ol' ? (
              <ol key={`list-${listIndex}`} className="list-decimal list-inside space-y-2 mb-4 ml-2">
                {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
              </ol>
            ) : (
              <ul key={`list-${listIndex}`} className="list-disc list-inside space-y-2 mb-4 ml-2">
                {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
              </ul>
            )
          );
          currentList = null;
          listIndex++;
        }
        elements.push(<h3 key={index} className="text-lg font-bold text-slate-900 mb-3 mt-4">{line.slice(2)}</h3>);
      } else if (line.match(/^\d+\.\s+(.*)$/)) {
        const match = line.match(/^\d+\.\s+(.*)$/);
        const itemText = match![1];

        const renderTextWithBold = (text: string) => {
          const parts = text.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return part;
          });
        };

        if (!currentList || currentList.type !== 'ol') {
          if (currentList) {
            elements.push(
              <ul key={`list-${listIndex}`} className="list-disc list-inside space-y-2 mb-4 ml-2">
                {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
              </ul>
            );
            listIndex++;
          }
          currentList = { type: 'ol', items: [] };
        }
        currentList.items.push(<span className="text-slate-700">{renderTextWithBold(itemText)}</span> as any);
      } else if (line.match(/^[-•]\s+(.*)$/)) {
        const match = line.match(/^[-•]\s+(.*)$/);
        if (!currentList || currentList.type !== 'ul') {
          if (currentList) {
            elements.push(
              <ol key={`list-${listIndex}`} className="list-decimal list-inside space-y-2 mb-4 ml-2">
                {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
              </ol>
            );
            listIndex++;
          }
          currentList = { type: 'ul', items: [] };
        }
        currentList.items.push(match![1]);
      } else if (line.trim() === '') {
        if (currentList) {
          elements.push(
            currentList.type === 'ol' ? (
              <ol key={`list-${listIndex}`} className="list-decimal list-inside space-y-2 mb-4 ml-2">
                {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
              </ol>
            ) : (
              <ul key={`list-${listIndex}`} className="list-disc list-inside space-y-2 mb-4 ml-2">
                {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
              </ul>
            )
          );
          currentList = null;
          listIndex++;
        }
      } else if (line.trim()) {
        if (currentList) {
          elements.push(
            currentList.type === 'ol' ? (
              <ol key={`list-${listIndex}`} className="list-decimal list-inside space-y-2 mb-4 ml-2">
                {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
              </ol>
            ) : (
              <ul key={`list-${listIndex}`} className="list-disc list-inside space-y-2 mb-4 ml-2">
                {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
              </ul>
            )
          );
          currentList = null;
          listIndex++;
        }
        elements.push(<p key={index} className="mb-2 text-slate-700">{line}</p>);
      }
    });

    if (currentList) {
      elements.push(
        currentList.type === 'ol' ? (
          <ol key={`list-${listIndex}`} className="list-decimal list-inside space-y-2 mb-4 ml-2">
            {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
          </ol>
        ) : (
          <ul key={`list-${listIndex}`} className="list-disc list-inside space-y-2 mb-4 ml-2">
            {currentList.items.map((item, i) => <li key={i} className="text-slate-700">{item}</li>)}
          </ul>
        )
      );
    }

    return elements;
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="dashboard">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-slate-600 mb-6 sm:mb-8">
          Bonjour {profile?.first_name}, voici un aperçu de votre agence
        </p>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Link to="/dashboard/key-management" className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{stats.totalKeyrings}</div>
            <div className="text-xs sm:text-sm text-slate-600">Trousseaux totaux</div>
            <div className="text-xs italic text-slate-500 mt-1">{stats.totalKeys} clés</div>
          </Link>

          <Link to="/dashboard/key-management" className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{stats.availableKeyrings}</div>
            <div className="text-xs sm:text-sm text-slate-600">Biens disponibles</div>
          </Link>

          <Link to="/dashboard/key-management" className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{stats.outKeys}</div>
            <div className="text-xs sm:text-sm text-slate-600">Clés sorties</div>
          </Link>

          <Link to="/dashboard/key-management" className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{stats.overdueKeys}</div>
            <div className="text-xs sm:text-sm text-slate-600">Clés en retard</div>
          </Link>
        </div>

        {contentBlocks.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {contentBlocks.map((block) => {
              const Icon = iconMap[block.icon] || Info;
              const colors = colorClasses[block.color] || colorClasses.blue;

              return (
                <div
                  key={block.id}
                  className={`bg-white rounded-xl p-6 border ${colors.border} shadow-sm hover:shadow-md transition`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{block.title}</h3>
                      <div className="text-sm text-slate-700 leading-relaxed">
                        {renderContent(block.content)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link to="/dashboard/properties" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer">
            <div className="flex items-center space-x-2 mb-4">
              <Building className="w-5 h-5 text-slate-600" />
              <h2 className="text-xl font-semibold text-slate-900">Biens</h2>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.totalProperties}</div>
            <p className="text-sm text-slate-600 mt-2">Biens enregistrés dans votre agence</p>
          </Link>

          <Link to="/dashboard/movements" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Mouvements récents</h2>
            {stats.recentMovements.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Aucun mouvement récent</p>
                <p className="text-sm text-slate-500 mt-1">
                  Les mouvements de clés apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentMovements.map((movement, idx) => {
                  const isKeyring = movement.key_count > 1;
                  return (
                    <div key={`${movement.property_ref}-${idx}`} className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {isKeyring
                            ? `${movement.property_ref} - Trousseau (${movement.key_count})`
                            : movement.keys[0]?.key_label}
                        </p>
                        <p className="text-sm text-slate-600">{movement.given_to_name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(movement.out_at).toLocaleDateString('fr-FR')}
                          {movement.returned_at ? (
                            <span className="text-green-600 ml-2">✓ Rendue</span>
                          ) : (
                            <span className="text-orange-600 ml-2">• En cours</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
