import { Link } from '../components/Link';
import { Key, Users, Bell, FileText, Star, ArrowRight, CheckCircle2, Zap, Shield, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { PublicHeader } from '../components/PublicHeader';
import { useSiteContent } from '../hooks/useSiteContent';
import { LogoCarousel } from '../components/LogoCarousel';

export function HomePage() {
  const { t } = useLanguage();
  const { sections, loading } = useSiteContent('homepage');

  const hero = sections.hero || {};
  const features = sections.features || {};
  const testimonials = sections.testimonials || {};
  const cta = sections.cta || {};
  const references = sections.references || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-600">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-6 sm:space-y-8">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-sm animate-bounce">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                  <span className="line-clamp-1">{hero.badge || t('home.hero.badge')}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 leading-tight">
                  {hero.title || t('home.hero.title')}
                </h1>

                <p className="text-base sm:text-lg lg:text-xl text-slate-700 leading-relaxed">
                  {hero.subtitle || t('home.hero.subtitle')}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link to="/signup" className="group bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 sm:px-8 sm:py-5 rounded-2xl text-base sm:text-lg font-bold hover:from-amber-600 hover:to-orange-600 transition shadow-2xl hover:shadow-amber-500/50 inline-flex items-center justify-center transform hover:scale-105">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    {hero.ctaPrimary || t('home.hero.cta-primary')}
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                  </Link>
                  <Link to="/features" className="bg-white text-slate-700 px-6 py-4 sm:px-8 sm:py-5 rounded-2xl text-base sm:text-lg font-bold hover:bg-slate-50 transition border-2 border-slate-200 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105">
                    {hero.ctaSecondary || t('home.hero.cta-secondary')}
                  </Link>
                </div>

                <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center space-x-2 bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-full shadow-md">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    <span className="font-semibold text-slate-700">{t('home.hero.free')}</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-full shadow-md">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    <span className="font-semibold text-slate-700">{t('home.hero.secure')}</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-full shadow-md">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                    <span className="font-semibold text-slate-700">{t('home.hero.setup')}</span>
                  </div>
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-500 hover:rotate-2">
                  <img
                    src="https://images.pexels.com/photos/210617/pexels-photo-210617.jpeg?auto=compress&cs=tinysrgb&w=1200"
                    alt="Clés de maison sur une table"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-500/30 to-transparent"></div>
                </div>

                <div className="absolute -bottom-8 -left-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-2xl p-6 max-w-xs transform hover:scale-110 transition-transform animate-float">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-white">
                      <div className="text-3xl font-black">98%</div>
                      <div className="text-sm font-semibold opacity-90">{t('home.hero.satisfaction')}</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-6 -right-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl shadow-2xl p-4 transform rotate-12 hover:rotate-0 transition-transform">
                  <div className="text-center">
                    <div className="text-2xl font-black">50+</div>
                    <div className="text-xs font-semibold">{t('home.hero.agencies')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <LogoCarousel
          logos={references.content?.logos || [
            { name: 'IMMOSUD' },
            { name: 'CENTURY 21' },
            { name: 'FONCIA' },
            { name: 'ORPI' },
            { name: 'LAFORÊT' },
            { name: 'GUY HOQUET' },
            { name: 'NEXITY' },
            { name: 'CITYA' }
          ]}
          badge={references.content?.badge || t('home.references.badge')}
        />

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 rounded-full mb-4">
              <span className="text-amber-700 font-bold text-xs sm:text-sm">{features.badge || t('home.features.badge')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4 px-4">
              {features.title || t('home.features.title')}
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto px-4">
              {features.subtitle || t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-3xl border-2 border-amber-200 hover:border-amber-400 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-orange-400/0 group-hover:from-amber-400/10 group-hover:to-orange-400/10 rounded-3xl transition-all"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Key className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{t('home.features.feature1.title')}</h3>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {t('home.features.feature1.desc')}
                </p>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-3xl border-2 border-green-200 hover:border-green-400 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/0 to-emerald-400/0 group-hover:from-green-400/10 group-hover:to-emerald-400/10 rounded-3xl transition-all"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{t('home.features.feature2.title')}</h3>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {t('home.features.feature2.desc')}
                </p>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-3xl border-2 border-orange-200 hover:border-orange-400 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-red-400/0 group-hover:from-orange-400/10 group-hover:to-red-400/10 rounded-3xl transition-all"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Bell className="w-8 h-8 text-white animate-wiggle" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{t('home.features.feature3.title')}</h3>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {t('home.features.feature3.desc')}
                </p>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-3xl border-2 border-blue-200 hover:border-blue-400 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-cyan-400/0 group-hover:from-blue-400/10 group-hover:to-cyan-400/10 rounded-3xl transition-all"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{t('home.features.feature4.title')}</h3>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {t('home.features.feature4.desc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 py-12 sm:py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-block bg-gradient-to-r from-yellow-100 to-amber-100 px-4 py-2 rounded-full mb-4">
                <span className="text-amber-700 font-bold text-xs sm:text-sm">{testimonials.badge || t('home.testimonials.badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4 px-4">{testimonials.title || t('home.testimonials.title')}</h2>
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 px-4">{testimonials.subtitle || t('home.testimonials.subtitle')}</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border-2 border-amber-100">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed font-medium text-lg">
                  "KeyManager a <strong className="text-amber-600">transformé</strong> notre façon de travailler. Plus de clés perdues ! Tout est tracé. C'est magique ! 🪄"
                </p>
                <div className="flex items-center space-x-3">
                  <img
                    src="https://images.pexels.com/photos/3760514/pexels-photo-3760514.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                    alt="Marie Dubois"
                    className="w-14 h-14 rounded-full object-cover border-4 border-amber-100"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Marie Dubois</div>
                    <div className="text-sm text-slate-600">Directrice, Agence ImmoParis</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border-2 border-green-100">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed font-medium text-lg">
                  "Gain de temps <strong className="text-green-600">incroyable</strong> ! Les alertes automatiques nous évitent les oublis. Toute l'équipe adore ! 🚀"
                </p>
                <div className="flex items-center space-x-3">
                  <img
                    src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                    alt="Thomas Martin"
                    className="w-14 h-14 rounded-full object-cover border-4 border-green-100"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Thomas Martin</div>
                    <div className="text-sm text-slate-600">Manager, Century Sud</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border-2 border-blue-100">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed font-medium text-lg">
                  "La traçabilité est un <strong className="text-blue-600">vrai plus</strong>. En cas de litige, on retrouve tout en 2 clics. Indispensable ! 💯"
                </p>
                <div className="flex items-center space-x-3">
                  <img
                    src="https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                    alt="Sophie Laurent"
                    className="w-14 h-14 rounded-full object-cover border-4 border-blue-100"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Sophie Laurent</div>
                    <div className="text-sm text-slate-600">Responsable, Foncia Lyon</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-16 sm:py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.pexels.com/photos/1370704/pexels-photo-1370704.jpeg?auto=compress&cs=tinysrgb&w=1920"
              alt="Bureau moderne"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-yellow-600/90"></div>
          </div>
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 sm:px-6 sm:py-3 rounded-full mb-6 sm:mb-8 animate-bounce">
              <span className="font-bold text-sm sm:text-base lg:text-lg">{cta.badge || t('home.cta.badge')}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-6 leading-tight px-4">
              {cta.title || t('home.cta.title')}
            </h2>

            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-medium mb-8 sm:mb-12 max-w-3xl mx-auto opacity-90 px-4">
              {cta.subtitle || t('home.cta.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-6 sm:mb-8">
              <Link to="/signup" className="group bg-white text-amber-600 px-8 py-4 sm:px-12 sm:py-6 rounded-2xl text-base sm:text-lg lg:text-xl font-black hover:bg-amber-50 transition shadow-2xl inline-flex items-center justify-center transform hover:scale-110">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                {cta.ctaPrimary || t('home.cta.primary')}
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 ml-2 group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link to="/pricing" className="bg-transparent border-3 sm:border-4 border-white text-white px-8 py-4 sm:px-12 sm:py-6 rounded-2xl text-base sm:text-lg lg:text-xl font-black hover:bg-white/10 transition shadow-2xl inline-flex items-center justify-center transform hover:scale-110">
                {cta.ctaSecondary || t('home.cta.secondary')}
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm font-bold px-4">
              <span className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-2 rounded-full">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{t('home.cta.free')}</span>
              </span>
              <span className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-2 rounded-full">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{t('home.cta.no-commitment')}</span>
              </span>
              <span className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-2 rounded-full">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{t('home.cta.quick-setup')}</span>
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Key className="w-6 h-6 text-amber-400" />
                <span className="text-xl font-black">KeyManager</span>
              </div>
              <p className="text-slate-400 text-sm font-medium">
                La solution complète pour gérer vos clés immobilières en toute sérénité.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Produit</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/features" className="hover:text-amber-400 transition font-medium">Fonctionnalités</Link></li>
                <li><Link to="/pricing" className="hover:text-amber-400 transition font-medium">Tarifs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Entreprise</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-amber-400 transition font-medium">À propos</a></li>
                <li><a href="#" className="hover:text-amber-400 transition font-medium">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Légal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-amber-400 transition font-medium">Mentions légales</a></li>
                <li><a href="#" className="hover:text-amber-400 transition font-medium">CGU</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p className="font-medium">&copy; 2025 KeyManager. Tous droits réservés. Fait avec ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
