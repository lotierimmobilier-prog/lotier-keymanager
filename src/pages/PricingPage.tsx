import { useState, useEffect } from 'react';
import { Link } from '../components/Link';
import { Key, ArrowLeft, Check, Star, ArrowRight, Zap } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

export function PricingPage() {
  const { sections, loading } = useSiteContent('pricing');
  const hero = sections.hero || {};
  const features = sections.features || {};

  const [numKeys, setNumKeys] = useState(10);
  const [price, setPrice] = useState(7.99);
  const [planName, setPlanName] = useState('Team');

  const calculatePrice = (keys: number) => {
    if (keys <= 3) {
      setPrice(0);
      setPlanName('Gratuit');
      return;
    }

    if (keys <= 10) {
      setPrice(7.99);
      setPlanName('Team');
      return;
    }

    if (keys <= 20) {
      setPrice(14.99);
      setPlanName('Business');
      return;
    }

    if (keys <= 50) {
      setPrice(29.99);
      setPlanName('Business+');
      return;
    }

    setPrice(59.99);
    setPlanName('Corporate');
  };

  useEffect(() => {
    calculatePrice(numKeys);
  }, [numKeys]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Key className="w-8 h-8 text-amber-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">KeyManager</span>
          </div>
          <Link to="/" className="flex items-center space-x-2 text-slate-600 hover:text-amber-600 font-medium transition">
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </Link>
        </nav>
      </header>

      <main>
        <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-5 py-2.5 rounded-full text-sm font-bold mb-6 shadow-sm animate-bounce">
                <Zap className="w-4 h-4 fill-current" />
                <span>7 jours d'essai gratuit sur tous les plans payants !</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-black text-slate-900 mb-6">
                {hero.title || 'Des tarifs ultra-simples'}
              </h1>
              <p className="text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed">
                {hero.subtitle || 'Payez uniquement pour le nombre de clés dont vous avez besoin. 7 jours d\'essai gratuit puis sans engagement, sans frais cachés.'}
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-10 shadow-2xl mb-16 border-4 border-amber-400">
            <div className="text-white mb-8">
              <h2 className="text-3xl font-black mb-3">Calculez votre tarif 🎯</h2>
              <p className="text-amber-50 text-lg font-medium">Déplacez le curseur pour voir le prix selon votre nombre de clés</p>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={numKeys}
              onChange={(e) => setNumKeys(parseInt(e.target.value))}
              className="w-full h-4 bg-primary rounded-full appearance-none cursor-pointer mb-6 shadow-inner"
            />
            <div className="flex justify-between mb-8 text-sm text-amber-100 font-bold">
              <span>1 clé</span>
              <span className="text-3xl font-black text-white">{numKeys} {numKeys === 1 ? 'clé' : 'clés'}</span>
              <span>100+ clés</span>
            </div>

            <div className="bg-white rounded-2xl p-10 text-center shadow-2xl">
              <div className="text-slate-600 text-sm font-black uppercase tracking-wide mb-3">Votre plan</div>
              <div className="text-4xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-6">{planName}</div>
              <div className="text-7xl lg:text-8xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
                {price.toFixed(2)}€
              </div>
              <div className="text-slate-600 text-xl font-bold mb-8">par mois pour {numKeys} {numKeys === 1 ? 'clé active' : 'clés actives'}</div>
              <Link to={price === 0 ? "/signup" : `/checkout?plan=${planName}`} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-10 py-5 rounded-2xl text-xl font-black hover:from-amber-600 hover:to-orange-600 transition inline-flex items-center justify-center group shadow-2xl transform hover:scale-105">
                {price === 0 ? "Commencer gratuitement" : "Commander ce plan"}
                <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="text-center mb-12">
            <div className="inline-block bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 rounded-full mb-4">
              <span className="text-amber-700 font-bold text-sm">💰 NOS PLANS</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Choisissez votre plan</h2>
            <p className="text-xl text-slate-600 font-semibold">Tous les plans incluent <span className="text-amber-600">toutes les fonctionnalités</span></p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 mb-8 shadow-2xl border-4 border-blue-400">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-3">
                  <span className="text-white font-black text-xs">🏢 ENTREPRISE • 7 JOURS GRATUITS</span>
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Corporate</h3>
                <p className="text-blue-100 font-semibold text-lg mb-4">La solution pour les grandes structures</p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center text-white">
                    <Check className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="font-semibold">Clés illimitées</span>
                  </li>
                  <li className="flex items-center text-white">
                    <Check className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="font-semibold">Toutes les fonctionnalités</span>
                  </li>
                  <li className="flex items-center text-white">
                    <Check className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="font-semibold">Utilisateurs illimités</span>
                  </li>
                  <li className="flex items-center text-white">
                    <Check className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="font-semibold">Support dédié 24/7</span>
                  </li>
                  <li className="flex items-center text-white">
                    <Check className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="font-semibold">Formation incluse</span>
                  </li>
                </ul>
              </div>
              <div className="text-center bg-white rounded-2xl p-6 min-w-[280px]">
                <div className="text-slate-600 text-sm font-black uppercase tracking-wide mb-2">Plan Corporate</div>
                <div className="text-6xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  59.99€
                </div>
                <div className="text-slate-600 font-bold mb-4">par mois</div>
                <Link to="/checkout?plan=Corporate" className="block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-black hover:from-blue-700 hover:to-purple-700 transition shadow-xl">
                  7 jours gratuits puis 59.99€/mois
                </Link>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-200 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="text-center mb-6">
                <div className="inline-block bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold mb-3">GRATUIT</div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Gratuit</h3>
                <div className="text-5xl font-black text-slate-900 mb-2">
                  0€
                </div>
                <div className="text-slate-600 font-bold mb-3">par mois</div>
                <div className="text-sm font-bold text-slate-700 bg-slate-200 px-3 py-1 rounded-full inline-block">1 à 3 clés</div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">3 clés maximum</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">Mouvements illimités</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">Alertes SMS</span>
                </li>
              </ul>
              <Link to="/signup" className="block text-center bg-slate-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg">
                Commencer
              </Link>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-300 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="text-center mb-6">
                <div className="inline-block bg-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-3">TEAM • 7 JOURS GRATUITS</div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Team</h3>
                <div className="text-5xl font-black text-blue-600 mb-2">
                  7.99€
                </div>
                <div className="text-slate-600 font-bold mb-3">par mois</div>
                <div className="text-sm font-bold text-blue-700 bg-blue-200 px-3 py-1 rounded-full inline-block">4 à 10 clés</div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">10 clés maximum</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">Toutes les fonctions</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">Utilisateurs illimités</span>
                </li>
              </ul>
              <Link to="/checkout?plan=Team" className="block text-center bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">
                7 jours gratuits puis 7.99€/mois
              </Link>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-300 shadow-xl relative transform hover:-translate-y-2 transition-all">
              <div className="text-center mb-6">
                <div className="inline-block bg-green-200 text-green-700 px-3 py-1 rounded-full text-xs font-bold mb-3">BUSINESS • 7 JOURS GRATUITS</div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Business</h3>
                <div className="text-5xl font-black text-green-600 mb-2">
                  14.99€
                </div>
                <div className="text-slate-600 font-bold mb-3">par mois</div>
                <div className="text-sm font-bold text-green-700 bg-green-200 px-3 py-1 rounded-full inline-block">11 à 20 clés</div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">20 clés maximum</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">Toutes les fonctions</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">Support prioritaire</span>
                </li>
              </ul>
              <Link to="/checkout?plan=Business" className="block text-center bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg">
                7 jours gratuits puis 14.99€/mois
              </Link>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-4 border-amber-400 shadow-2xl relative hover:shadow-3xl transition-all mt-6">
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-full text-xs font-black shadow-xl whitespace-nowrap">
                  ⭐ POPULAIRE
                </span>
              </div>
              <div className="text-center mb-6 pt-3">
                <div className="inline-block bg-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-bold mb-3">BUSINESS+ • 7 JOURS GRATUITS</div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Business+</h3>
                <div className="text-5xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                  29.99€
                </div>
                <div className="text-slate-600 font-bold mb-3">par mois</div>
                <div className="text-sm font-bold text-amber-700 bg-amber-200 px-3 py-1 rounded-full inline-block">21 à 50 clés</div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">50 clés maximum</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">Toutes les fonctions</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">API complète</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm font-semibold">Support prioritaire</span>
                </li>
              </ul>
              <Link to="/checkout?plan=Business+" className="block text-center bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-black hover:from-amber-600 hover:to-orange-600 transition shadow-xl">
                7 jours gratuits puis 29.99€/mois
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-10 mb-16 border-2 border-slate-200">
            <h3 className="text-3xl font-black text-slate-900 mb-8 text-center">Comment ça marche ? 🎯</h3>
            <div className="grid md:grid-cols-3 gap-8 text-center mb-8">
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white mx-auto mb-4 shadow-lg">1</div>
                <h4 className="font-black text-slate-900 mb-3 text-lg">Créez votre compte</h4>
                <p className="text-slate-600 font-medium">Inscription en 2 minutes, sans carte bancaire</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white mx-auto mb-4 shadow-lg">2</div>
                <h4 className="font-black text-slate-900 mb-3 text-lg">Commencez gratuit</h4>
                <p className="text-slate-600 font-medium">Jusqu'à 3 clés, toutes les fonctionnalités incluses</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white mx-auto mb-4 shadow-lg">3</div>
                <h4 className="font-black text-slate-900 mb-3 text-lg">Évoluez à votre rythme</h4>
                <p className="text-slate-600 font-medium">Passez à un plan supérieur quand vous voulez</p>
              </div>
            </div>
            <div className="text-center bg-white rounded-2xl p-6">
              <p className="text-slate-900 font-black mb-3 text-lg">Tarifs transparents 💎</p>
              <div className="text-slate-600 font-semibold space-y-1">
                <p>1-3 clés = 0€ | 4-10 clés = 7,99€ | 11-20 clés = 14,99€</p>
                <p>21-50 clés = 29,99€ | 51+ clés = 59,99€</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-10 border-2 border-slate-200 shadow-xl mb-16">
            <h3 className="text-3xl font-black text-slate-900 mb-8 text-center">Ce qu'ils en disent 🌟</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border-2 border-amber-200">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed font-medium text-lg">
                  "Le rapport qualité/prix est <strong className="text-amber-600">imbattable</strong>. Pour 7,99€/mois, on a toutes les fonctions. ROI immédiat ! 🚀"
                </p>
                <div className="flex items-center space-x-3">
                  <img
                    src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                    alt="Marie D."
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-300"
                  />
                  <div>
                    <div className="font-black text-slate-900">Marie D.</div>
                    <div className="text-sm text-slate-600 font-semibold">Agence ImmoParis</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed font-medium text-lg">
                  "On a commencé gratuit et on est passé à Business+. Le système est tellement <strong className="text-green-600">efficace</strong> ! 💯"
                </p>
                <div className="flex items-center space-x-3">
                  <img
                    src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                    alt="Thomas M."
                    className="w-12 h-12 rounded-full object-cover border-2 border-green-300"
                  />
                  <div>
                    <div className="font-black text-slate-900">Thomas M.</div>
                    <div className="text-sm text-slate-600 font-semibold">Century Sud</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-24 overflow-hidden bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600">
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full mb-6">
              <span className="font-black text-lg">💬 Questions ?</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              Des questions sur nos tarifs ?
            </h2>
            <p className="text-xl font-medium mb-10 opacity-90">
              Notre équipe est là pour vous aider à choisir le plan qui correspond à vos besoins
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/signup" className="bg-white text-amber-600 px-10 py-5 rounded-2xl text-xl font-black hover:bg-amber-50 transition shadow-2xl inline-flex items-center justify-center transform hover:scale-110">
                Essayer gratuitement
                <ArrowRight className="w-6 h-6 ml-2" />
              </Link>
              <a href="mailto:contact@keymanager.fr" className="bg-transparent border-4 border-white text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-white/10 transition shadow-2xl inline-flex items-center justify-center transform hover:scale-110">
                Nous contacter
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
