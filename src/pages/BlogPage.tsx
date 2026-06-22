import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, ArrowRight } from 'lucide-react';
import { Link } from '../components/Link';
import { useSiteContent } from '../hooks/useSiteContent';

interface BlogArticle {
  id: string;
  slug: string;
  title_h1: string;
  meta_description: string;
  keywords_primary: string;
  keywords_secondary: string[];
  featured_image_url: string | null;
  published_at: string;
  created_at: string;
}

export function BlogPage() {
  const { sections } = useSiteContent('blog');
  const hero = sections.hero || {};
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, slug, title_h1, meta_description, keywords_primary, keywords_secondary, featured_image_url, published_at, created_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  }

  function getFallbackImage(keywords: string): string {
    const keywordMap: Record<string, string> = {
      'gestion des clés': 'https://images.pexels.com/photos/101808/pexels-photo-101808.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
      'agence immobilière': 'https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
      'digitalisation': 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
      'registre des clés': 'https://images.pexels.com/photos/277667/pexels-photo-277667.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
      'immobilier': 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
      'sécurité': 'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
      'organisation': 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
      'technologie': 'https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
      'gestion': 'https://images.pexels.com/photos/3183153/pexels-photo-3183153.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
      'productivité': 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630',
    };

    const keywordsLower = keywords.toLowerCase();
    for (const [key, imageUrl] of Object.entries(keywordMap)) {
      if (keywordsLower.includes(key)) {
        return imageUrl;
      }
    }

    return 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-primary">
              KeyManager
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-slate-600 hover:text-primary transition">
                Accueil
              </Link>
              <Link href="/features" className="text-slate-600 hover:text-primary transition">
                Fonctionnalités
              </Link>
              <Link href="/pricing" className="text-slate-600 hover:text-primary transition">
                Tarifs
              </Link>
              <Link href="/blog" className="text-primary font-medium">
                Blog
              </Link>
              <Link
                href="/login"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Connexion
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">{hero.title || 'Blog KeyManager'}</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            {hero.subtitle || 'Conseils, guides et bonnes pratiques pour optimiser la gestion de vos clés'}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-slate-600 mt-4">Chargement des articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Aucun article publié</h2>
            <p className="text-slate-600">Revenez bientôt pour découvrir nos premiers articles</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={article.featured_image_url || getFallbackImage(article.keywords_primary)}
                    alt={article.title_h1}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-center text-sm text-slate-500 mb-3">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(article.published_at || article.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-primary transition">
                    {article.title_h1}
                  </h2>

                  <p className="text-slate-600 mb-4 line-clamp-3">{article.meta_description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {article.keywords_primary}
                    </span>
                    {article.keywords_secondary?.slice(0, 2).map((keyword, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                        {keyword}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center text-primary font-medium group-hover:translate-x-2 transition-transform">
                    Lire l'article
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-24 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 rounded-3xl opacity-10 blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-1.5 shadow-2xl">
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-[22px] p-12 md:p-16 text-center">
              <div className="max-w-3xl mx-auto">
                <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
                  Commencez dès maintenant
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                  Prêt à optimiser votre gestion des clés ?
                </h2>
                <p className="text-xl md:text-2xl text-slate-600 leading-relaxed mb-10">
                  Découvrez comment KeyManager peut transformer votre organisation
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link
                    href="/signup"
                    className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center"
                  >
                    Essayer gratuitement
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="px-8 py-4 bg-white text-slate-700 border-2 border-slate-300 rounded-xl font-bold hover:border-slate-400 hover:bg-slate-50 transition-all text-lg"
                  >
                    Voir les tarifs
                  </Link>
                </div>
                <p className="text-sm text-slate-500 mt-6">
                  Sans engagement • 3 clés gratuites • Configuration en 2 minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-slate-900 text-white py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400">© 2024 KeyManager. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
