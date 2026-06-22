import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, User, Key } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardLayout } from '../../components/DashboardLayout';

interface UserStats {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  total_keys_out: number;
  total_keys_returned: number;
  total_duration_minutes: number;
  avg_duration_minutes: number;
}

export function StatsPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.agency_id) {
      loadStats();
    }
  }, [profile]);

  async function loadStats() {
    if (!profile?.agency_id) return;

    try {
      const { data: movements, error } = await supabase
        .from('key_movements')
        .select(`
          taken_by_user_id,
          out_at,
          expected_return_at,
          returned_at
        `)
        .eq('agency_id', profile.agency_id)
        .is('deleted_at', null)
        .not('taken_by_user_id', 'is', null);

      if (error) throw error;

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('agency_id', profile.agency_id);

      if (usersError) throw usersError;

      const userStatsMap = new Map<string, UserStats>();

      users?.forEach(u => {
        userStatsMap.set(u.id, {
          user_id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          total_keys_out: 0,
          total_keys_returned: 0,
          total_duration_minutes: 0,
          avg_duration_minutes: 0,
        });
      });

      movements?.forEach(m => {
        const userId = m.taken_by_user_id;
        if (!userId || !userStatsMap.has(userId)) return;

        const stat = userStatsMap.get(userId)!;
        stat.total_keys_out++;

        if (m.returned_at) {
          stat.total_keys_returned++;
          const outDate = new Date(m.out_at);
          const returnDate = new Date(m.returned_at);
          const durationMinutes = Math.floor((returnDate.getTime() - outDate.getTime()) / 1000 / 60);
          stat.total_duration_minutes += durationMinutes;
        }
      });

      userStatsMap.forEach(stat => {
        if (stat.total_keys_returned > 0) {
          stat.avg_duration_minutes = Math.floor(stat.total_duration_minutes / stat.total_keys_returned);
        }
      });

      const statsArray = Array.from(userStatsMap.values()).sort((a, b) => b.total_keys_out - a.total_keys_out);
      setStats(statsArray);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return `${hours}h ${mins > 0 ? mins + 'min' : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}j ${remainingHours > 0 ? remainingHours + 'h' : ''}`;
  }

  const totalKeysOut = stats.reduce((sum, s) => sum + s.total_keys_out, 0);
  const totalKeysReturned = stats.reduce((sum, s) => sum + s.total_keys_returned, 0);

  if (loading) {
    return (
      <DashboardLayout currentPage="stats">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="stats">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-amber-600" />
            <span>Statistiques Collaborateurs</span>
          </h1>
          <p className="text-slate-600 mt-2">Suivi des sorties et durées par collaborateur</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{totalKeysOut}</div>
          <div className="text-sm font-semibold text-slate-600">Total sorties de clés</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{totalKeysReturned}</div>
          <div className="text-sm font-semibold text-slate-600">Total retours de clés</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.length}</div>
          <div className="text-sm font-semibold text-slate-600">Collaborateurs actifs</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Détails par collaborateur</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Collaborateur
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Sorties
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Retours
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  En cours
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Durée totale
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Durée moyenne
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {stats.map((stat) => {
                const keysInProgress = stat.total_keys_out - stat.total_keys_returned;
                return (
                  <tr key={stat.user_id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          {stat.first_name[0]}{stat.last_name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {stat.first_name} {stat.last_name}
                          </div>
                          <div className="text-sm text-slate-600">{stat.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                        {stat.total_keys_out}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                        {stat.total_keys_returned}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        keysInProgress > 0 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {keysInProgress}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {formatDuration(stat.total_duration_minutes)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {stat.avg_duration_minutes > 0 ? formatDuration(stat.avg_duration_minutes) : '-'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Aucune statistique disponible pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
