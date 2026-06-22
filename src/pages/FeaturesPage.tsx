import { Link } from '../components/Link';
import { Key, ArrowLeft, CheckCircle, FileText, Bell, Users, Download, Shield, ArrowRight } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

export function FeaturesPage() {
  const { sections, loading } = useSiteContent('features');
  const hero = sections.hero || {};
  const featuresList = sections.features_list || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Key className="w-8 h-8 text-amber-700" />
            <span className="text-2xl font-bold text-slate-900">KeyManager</span>
          </div>
          <Link to="/" className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 font-medium transition">
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </Link>
        </nav>
      </header>

      <main>
        <section className="bg-gradient-to-br from-blue-50 to-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-slate-900 mb-6">{hero.title || 'Toutes les fonctionnalités dont vous avez besoin'}</h1>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                {hero.subtitle || 'Une solution complète pensée pour simplifier la gestion quotidienne de vos clés immobilières'}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="text-4xl font-bold text-amber-700 mb-2">50+</div>
                <div className="text-slate-600">Agences clientes</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="text-4xl font-bold text-amber-700 mb-2">5K+</div>
                <div className="text-slate-600">Clés gérées</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="text-4xl font-bold text-amber-700 mb-2">98%</div>
                <div className="text-slate-600">Satisfaction client</div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="space-y-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                  <Key className="w-8 h-8 text-amber-700" />
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Gestion centralisée de toutes vos clés</h2>
                <p className="text-lg text-slate-600 mb-6">
                  Fini les tableurs Excel et les cahiers papier. Gérez l'intégralité de votre parc de clés depuis une interface unique et intuitive.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Association automatique clé-bien immobilier avec toutes les informations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Codes d'accès et étiquettes personnalisables pour chaque clé</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Statuts en temps réel: Disponible, Sortie, Perdue, Archivée</span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <img
                  src="https://images.pexels.com/photos/6963944/pexels-photo-6963944.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Organisation de clés"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative">
                <img
                  src="https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Traçabilité documents"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
              <div className="order-1 lg:order-2">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Traçabilité complète et audit trail</h2>
                <p className="text-lg text-slate-600 mb-6">
                  Chaque mouvement est enregistré et horodaté. Vous savez toujours qui a pris quelle clé, quand, et pour quel motif.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Journal complet et immuable de tous les mouvements de clés</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Identification précise du détenteur, du motif et de la durée</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Recherche et filtres avancés pour retrouver n'importe quelle information</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                  <Bell className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Alertes intelligentes et proactives</h2>
                <p className="text-lg text-slate-600 mb-6">
                  Le système vous alerte automatiquement en cas de retard ou d'anomalie. Plus aucune clé ne passe entre les mailles du filet.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Notifications automatiques pour les clés non rendues à l'heure</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Alertes par email configurables selon vos besoins</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Dashboard visuel avec indicateurs de performance en temps réel</span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <img
                  src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Notifications alertes"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative">
                <img
                  src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Équipe collaborative"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
              <div className="order-1 lg:order-2">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Collaboration d'équipe simplifiée</h2>
                <p className="text-lg text-slate-600 mb-6">
                  Gérez les accès de toute votre équipe avec des rôles et permissions granulaires adaptés à chaque profil.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Rôles prédéfinis: Administrateur, Collaborateur, Prestataire</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Permissions personnalisables pour chaque rôle</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Traçabilité des actions de chaque utilisateur</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6">
                  <Download className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Exports et rapports</h3>
                <p className="text-slate-600 mb-6">
                  Exportez toutes vos données pour vos analyses, audits et rapports. Formats CSV et PDF disponibles.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    Export CSV complet
                  </li>
                  <li className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    Rapports PDF personnalisables
                  </li>
                  <li className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    Statistiques détaillées
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Sécurité maximale</h3>
                <p className="text-slate-600 mb-6">
                  Vos données sont hébergées en Europe et protégées par les dernières technologies de sécurité.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    Chiffrement bout en bout
                  </li>
                  <li className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    Conformité RGPD
                  </li>
                  <li className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    Sauvegardes automatiques
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-24 overflow-hidden bg-gradient-to-br from-amber-700 to-amber-800">
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Prêt à transformer votre gestion des clés ?
            </h2>
            <p className="text-xl text-amber-100 mb-10 max-w-3xl mx-auto">
              Rejoignez les centaines d'agences qui utilisent KeyManager au quotidien
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup" className="bg-white text-amber-700 px-10 py-5 rounded-lg text-lg font-semibold hover:bg-amber-50 transition shadow-xl inline-flex items-center justify-center group">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/pricing" className="bg-amber-500 text-white px-10 py-5 rounded-lg text-lg font-semibold hover:bg-amber-500 transition shadow-xl inline-flex items-center justify-center">
                Voir les tarifs
              </Link>
            </div>
            <p className="mt-6 text-sm text-amber-200">
              Sans engagement • Configuration en 5 minutes • Support français
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
