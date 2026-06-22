import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, ArrowLeft, Tag } from 'lucide-react';
import { Link } from '../components/Link';

interface BlogArticle {
  id: string;
  slug: string;
  title_h1: string;
  meta_title: string;
  meta_description: string;
  keywords_primary: string;
  keywords_secondary: string[];
  h2_introduction: string;
  content_introduction: string;
  image_introduction: string | null;
  h2_problematic: string;
  content_problematic: string;
  image_problematic: string | null;
  h3_problematic_details: string | null;
  content_problematic_details: string | null;
  h2_solutions: string;
  content_solutions: string;
  image_solutions: string | null;
  h3_solutions_details: string | null;
  content_solutions_details: string | null;
  h2_digital: string;
  content_digital: string;
  image_digital: string | null;
  h3_digital_details: string | null;
  content_digital_details: string | null;
  h2_results: string;
  content_results: string;
  image_results: string | null;
  h3_results_details: string | null;
  content_results_details: string | null;
  h2_conclusion: string;
  content_conclusion: string;
  image_conclusion: string | null;
  cta_text: string;
  cta_link: string;
  featured_image_url: string | null;
  published_at: string;
  created_at: string;
}

export function BlogArticlePage({ slug }: { slug: string }) {
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadArticle();
  }, [slug]);

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

  async function loadArticle() {
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setNotFound(true);
      } else {
        setArticle(data);
        document.title = data.meta_title;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', data.meta_description);
        } else {
          const meta = document.createElement('meta');
          meta.name = 'description';
          meta.content = data.meta_description;
          document.head.appendChild(meta);
        }
      }
    } catch (error) {
      console.error('Error loading article:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-slate-600 mt-4">Chargement de l'article...</p>
        </div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/" className="text-2xl font-bold text-primary">
              KeyManager
            </Link>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Article non trouvé</h1>
          <p className="text-slate-600 mb-8">Cet article n'existe pas ou n'est plus disponible.</p>
          <Link
            href="/blog"
            className="inline-flex items-center text-primary hover:text-primary/80 transition"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour au blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-primary">
              KeyManager
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-slate-600 hover:text-primary transition">
                Accueil
              </Link>
              <Link href="/blog" className="text-slate-600 hover:text-primary transition">
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

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/blog"
          className="inline-flex items-center text-slate-600 hover:text-primary transition mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour au blog
        </Link>

        <div className="aspect-video rounded-xl overflow-hidden mb-8">
          <img
            src={article.featured_image_url || getFallbackImage(article.keywords_primary)}
            alt={article.title_h1}
            className="w-full h-full object-cover"
          />
        </div>

        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">{article.title_h1}</h1>

          <div className="flex items-center text-slate-600 mb-6">
            <Calendar className="w-5 h-5 mr-2" />
            <time dateTime={article.published_at || article.created_at}>
              {new Date(article.published_at || article.created_at).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              <Tag className="w-4 h-4 mr-1" />
              {article.keywords_primary}
            </span>
            {article.keywords_secondary?.map((keyword, i) => (
              <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                {keyword}
              </span>
            ))}
          </div>
        </header>

        <div className="prose prose-lg prose-slate max-w-none">
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{article.h2_introduction}</h2>
            {article.image_introduction && (
              <div className="rounded-xl overflow-hidden mb-6">
                <img
                  src={article.image_introduction}
                  alt={article.h2_introduction}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {article.content_introduction}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{article.h2_problematic}</h2>
            {article.image_problematic && (
              <div className="rounded-xl overflow-hidden mb-6">
                <img
                  src={article.image_problematic}
                  alt={article.h2_problematic}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {article.content_problematic}
            </div>
            {article.h3_problematic_details && article.content_problematic_details && (
              <div className="mt-6 pl-6 border-l-4 border-primary/30">
                <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                  {article.h3_problematic_details}
                </h3>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {article.content_problematic_details}
                </div>
              </div>
            )}
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{article.h2_solutions}</h2>
            {article.image_solutions && (
              <div className="rounded-xl overflow-hidden mb-6">
                <img
                  src={article.image_solutions}
                  alt={article.h2_solutions}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {article.content_solutions}
            </div>
            {article.h3_solutions_details && article.content_solutions_details && (
              <div className="mt-6 pl-6 border-l-4 border-primary/30">
                <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                  {article.h3_solutions_details}
                </h3>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {article.content_solutions_details}
                </div>
              </div>
            )}
          </section>

          <section className="mb-12 bg-blue-50 rounded-xl p-8 border border-blue-100">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{article.h2_digital}</h2>
            {article.image_digital && (
              <div className="rounded-xl overflow-hidden mb-6">
                <img
                  src={article.image_digital}
                  alt={article.h2_digital}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {article.content_digital}
            </div>
            {article.h3_digital_details && article.content_digital_details && (
              <div className="mt-6 pl-6 border-l-4 border-primary">
                <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                  {article.h3_digital_details}
                </h3>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {article.content_digital_details}
                </div>
              </div>
            )}
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{article.h2_results}</h2>
            {article.image_results && (
              <div className="rounded-xl overflow-hidden mb-6">
                <img
                  src={article.image_results}
                  alt={article.h2_results}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {article.content_results}
            </div>
            {article.h3_results_details && article.content_results_details && (
              <div className="mt-6 pl-6 border-l-4 border-primary/30">
                <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                  {article.h3_results_details}
                </h3>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {article.content_results_details}
                </div>
              </div>
            )}
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{article.h2_conclusion}</h2>
            {article.image_conclusion && (
              <div className="rounded-xl overflow-hidden mb-6">
                <img
                  src={article.image_conclusion}
                  alt={article.h2_conclusion}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {article.content_conclusion}
            </div>
          </section>

          <div className="relative mt-16">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-1 shadow-2xl">
              <div className="bg-white rounded-xl p-10 text-center">
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-3xl font-bold text-slate-900 mb-4">
                    Prêt à optimiser votre gestion des clés ?
                  </h3>
                  <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                    Découvrez comment KeyManager peut transformer votre organisation
                  </p>
                  <Link
                    href={article.cta_link}
                    className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {article.cta_text}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <footer className="bg-slate-900 text-white py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400">© 2024 KeyManager. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
