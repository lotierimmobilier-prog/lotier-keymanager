import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Plus, Pencil, Trash2, Eye, EyeOff, FileText, Upload, X } from 'lucide-react';

interface BlogArticle {
  id: string;
  slug: string;
  title_h1: string;
  meta_title: string;
  meta_description: string;
  keywords_primary: string;
  keywords_secondary: string[];
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function BlogManagementPage() {
  const { profile } = useAuth();
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    title_h1: '',
    meta_title: '',
    meta_description: '',
    keywords_primary: '',
    keywords_secondary: '',
    h2_introduction: 'Introduction',
    content_introduction: '',
    image_introduction: '',
    h2_problematic: 'La problématique',
    content_problematic: '',
    image_problematic: '',
    h3_problematic_details: '',
    content_problematic_details: '',
    h2_solutions: 'Les solutions',
    content_solutions: '',
    image_solutions: '',
    h3_solutions_details: '',
    content_solutions_details: '',
    h2_digital: "L'apport du digital",
    content_digital: '',
    image_digital: '',
    h3_digital_details: '',
    content_digital_details: '',
    h2_results: 'Résultats et bénéfices',
    content_results: '',
    image_results: '',
    h3_results_details: '',
    content_results_details: '',
    h2_conclusion: 'Conclusion',
    content_conclusion: '',
    image_conclusion: '',
    cta_text: 'Essayer gratuitement KeyManager',
    cta_link: '/signup',
    featured_image_url: '',
    is_published: false,
  });

  useEffect(() => {
    if (profile?.is_super_admin) {
      loadArticles();
    }
  }, [profile]);

  async function loadArticles() {
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error loading articles:', error);
      alert('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  }

  async function resizeImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 1200;
          const maxHeight = 630;

          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Cannot get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Cannot create blob'));
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    setUploadingImage(true);

    try {
      const resizedBlob = await resizeImage(file);

      const fileName = `blog-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `blog-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, resizedBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      setFormData({ ...formData, featured_image_url: publicUrl });
      setImagePreview(publicUrl);

      alert('Image téléchargée avec succès');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Erreur lors du téléchargement: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  }

  function removeImage() {
    setFormData({ ...formData, featured_image_url: '' });
    setImagePreview(null);
  }

  function openCreateModal() {
    setEditingArticle(null);
    setImagePreview(null);
    setFormData({
      slug: '',
      title_h1: '',
      meta_title: '',
      meta_description: '',
      keywords_primary: '',
      keywords_secondary: '',
      h2_introduction: 'Introduction',
      content_introduction: '',
      image_introduction: '',
      h2_problematic: 'La problématique',
      content_problematic: '',
      image_problematic: '',
      h3_problematic_details: '',
      content_problematic_details: '',
      h2_solutions: 'Les solutions',
      content_solutions: '',
      image_solutions: '',
      h3_solutions_details: '',
      content_solutions_details: '',
      h2_digital: "L'apport du digital",
      content_digital: '',
      image_digital: '',
      h3_digital_details: '',
      content_digital_details: '',
      h2_results: 'Résultats et bénéfices',
      content_results: '',
      image_results: '',
      h3_results_details: '',
      content_results_details: '',
      h2_conclusion: 'Conclusion',
      content_conclusion: '',
      image_conclusion: '',
      cta_text: 'Essayer gratuitement KeyManager',
      cta_link: '/signup',
      featured_image_url: '',
      is_published: false,
    });
    setShowModal(true);
  }

  async function openEditModal(article: BlogArticle) {
    const { data, error } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('id', article.id)
      .single();

    if (error || !data) {
      alert('Erreur lors du chargement de l\'article');
      return;
    }

    setEditingArticle(data);
    setImagePreview(data.featured_image_url || null);
    setFormData({
      slug: data.slug || '',
      title_h1: data.title_h1 || '',
      meta_title: data.meta_title || '',
      meta_description: data.meta_description || '',
      keywords_primary: data.keywords_primary || '',
      keywords_secondary: data.keywords_secondary?.join(', ') || '',
      h2_introduction: data.h2_introduction || 'Introduction',
      content_introduction: data.content_introduction || '',
      image_introduction: data.image_introduction || '',
      h2_problematic: data.h2_problematic || 'La problématique',
      content_problematic: data.content_problematic || '',
      image_problematic: data.image_problematic || '',
      h3_problematic_details: data.h3_problematic_details || '',
      content_problematic_details: data.content_problematic_details || '',
      h2_solutions: data.h2_solutions || 'Les solutions',
      content_solutions: data.content_solutions || '',
      image_solutions: data.image_solutions || '',
      h3_solutions_details: data.h3_solutions_details || '',
      content_solutions_details: data.content_solutions_details || '',
      h2_digital: data.h2_digital || "L'apport du digital",
      content_digital: data.content_digital || '',
      image_digital: data.image_digital || '',
      h3_digital_details: data.h3_digital_details || '',
      content_digital_details: data.content_digital_details || '',
      h2_results: data.h2_results || 'Résultats et bénéfices',
      content_results: data.content_results || '',
      image_results: data.image_results || '',
      h3_results_details: data.h3_results_details || '',
      content_results_details: data.content_results_details || '',
      h2_conclusion: data.h2_conclusion || 'Conclusion',
      content_conclusion: data.content_conclusion || '',
      image_conclusion: data.image_conclusion || '',
      cta_text: data.cta_text || 'Essayer gratuitement KeyManager',
      cta_link: data.cta_link || '/signup',
      featured_image_url: data.featured_image_url || '',
      is_published: data.is_published || false,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const keywords = formData.keywords_secondary
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const articleData = {
      slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
      title_h1: formData.title_h1,
      meta_title: formData.meta_title,
      meta_description: formData.meta_description,
      keywords_primary: formData.keywords_primary,
      keywords_secondary: keywords,
      h2_introduction: formData.h2_introduction,
      content_introduction: formData.content_introduction,
      image_introduction: formData.image_introduction || null,
      h2_problematic: formData.h2_problematic,
      content_problematic: formData.content_problematic,
      image_problematic: formData.image_problematic || null,
      h3_problematic_details: formData.h3_problematic_details || null,
      content_problematic_details: formData.content_problematic_details || null,
      h2_solutions: formData.h2_solutions,
      content_solutions: formData.content_solutions,
      image_solutions: formData.image_solutions || null,
      h3_solutions_details: formData.h3_solutions_details || null,
      content_solutions_details: formData.content_solutions_details || null,
      h2_digital: formData.h2_digital,
      content_digital: formData.content_digital,
      image_digital: formData.image_digital || null,
      h3_digital_details: formData.h3_digital_details || null,
      content_digital_details: formData.content_digital_details || null,
      h2_results: formData.h2_results,
      content_results: formData.content_results,
      image_results: formData.image_results || null,
      h3_results_details: formData.h3_results_details || null,
      content_results_details: formData.content_results_details || null,
      h2_conclusion: formData.h2_conclusion,
      content_conclusion: formData.content_conclusion,
      image_conclusion: formData.image_conclusion || null,
      cta_text: formData.cta_text,
      cta_link: formData.cta_link,
      featured_image_url: formData.featured_image_url || null,
      is_published: formData.is_published,
      published_at: formData.is_published ? new Date().toISOString() : null,
      author_id: profile?.id,
    };

    try {
      if (editingArticle) {
        const { error } = await supabase
          .from('blog_articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
        alert('Article mis à jour avec succès');
      } else {
        const { error } = await supabase
          .from('blog_articles')
          .insert([articleData]);

        if (error) throw error;
        alert('Article créé avec succès');
      }

      setShowModal(false);
      loadArticles();
    } catch (error: any) {
      console.error('Error saving article:', error);
      alert('Erreur: ' + error.message);
    }
  }

  async function togglePublish(article: BlogArticle) {
    try {
      const { error } = await supabase
        .from('blog_articles')
        .update({
          is_published: !article.is_published,
          published_at: !article.is_published ? new Date().toISOString() : null,
        })
        .eq('id', article.id);

      if (error) throw error;
      loadArticles();
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('Erreur lors de la modification du statut');
    }
  }

  async function handleDelete(article: BlogArticle) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .eq('id', article.id);

      if (error) throw error;
      alert('Article supprimé');
      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Erreur lors de la suppression');
    }
  }

  if (!profile?.is_super_admin) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-red-600">Accès réservé aux super administrateurs</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestion du Blog</h1>
            <p className="text-slate-600 mt-2">Créez et gérez les articles de blog optimisés SEO</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvel article</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Chargement...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Aucun article pour le moment</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {articles.map((article) => (
              <div key={article.id} className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-900">{article.title_h1}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          article.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {article.is_published ? 'Publié' : 'Brouillon'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mb-2">/{article.slug}</p>
                    <p className="text-slate-600 mb-3">{article.meta_description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {article.keywords_primary}
                      </span>
                      {article.keywords_secondary?.slice(0, 3).map((keyword, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500">
                      Créé le {new Date(article.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => togglePublish(article)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      title={article.is_published ? 'Dépublier' : 'Publier'}
                    >
                      {article.is_published ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(article)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(article)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg w-full max-w-4xl my-8">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Paramètres SEO</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Slug URL (sans espaces) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="comment-organiser-gestion-cles"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Meta Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.meta_title}
                        onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Titre optimisé pour les moteurs de recherche"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Meta Description (140-160 caractères) *
                      </label>
                      <textarea
                        required
                        maxLength={160}
                        value={formData.meta_description}
                        onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={2}
                        placeholder="Description concise pour les résultats de recherche"
                      />
                      <p className="text-sm text-slate-500 mt-1">
                        {formData.meta_description.length}/160 caractères
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mot-clé principal *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.keywords_primary}
                        onChange={(e) => setFormData({ ...formData, keywords_primary: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="gestion des clés"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mots-clés secondaires (séparés par des virgules)
                      </label>
                      <input
                        type="text"
                        value={formData.keywords_secondary}
                        onChange={(e) => setFormData({ ...formData, keywords_secondary: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="agence immobilière, digitalisation, registre de clés"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Titre H1 *</label>
                  <input
                    type="text"
                    required
                    value={formData.title_h1}
                    onChange={(e) => setFormData({ ...formData, title_h1: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Titre principal de l'article"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">H2 - Introduction</label>
                    <input
                      type="text"
                      value={formData.h2_introduction}
                      onChange={(e) => setFormData({ ...formData, h2_introduction: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                    />
                    <textarea
                      required
                      value={formData.content_introduction}
                      onChange={(e) => setFormData({ ...formData, content_introduction: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="Contenu de l'introduction"
                    />
                    <input
                      type="url"
                      value={formData.image_introduction}
                      onChange={(e) => setFormData({ ...formData, image_introduction: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="URL de l'image (optionnel)"
                    />
                    {formData.image_introduction && (
                      <div className="mt-2">
                        <img src={formData.image_introduction} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">H2 - Problématique</label>
                    <input
                      type="text"
                      value={formData.h2_problematic}
                      onChange={(e) => setFormData({ ...formData, h2_problematic: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                    />
                    <textarea
                      required
                      value={formData.content_problematic}
                      onChange={(e) => setFormData({ ...formData, content_problematic: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="Contenu de la problématique"
                    />
                    <input
                      type="url"
                      value={formData.image_problematic}
                      onChange={(e) => setFormData({ ...formData, image_problematic: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="URL de l'image (optionnel)"
                    />
                    {formData.image_problematic && (
                      <div className="mt-2">
                        <img src={formData.image_problematic} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={formData.h3_problematic_details}
                      onChange={(e) => setFormData({ ...formData, h3_problematic_details: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="H3 - Détails (optionnel)"
                    />
                    {formData.h3_problematic_details && (
                      <textarea
                        value={formData.content_problematic_details}
                        onChange={(e) =>
                          setFormData({ ...formData, content_problematic_details: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                        rows={3}
                        placeholder="Contenu des détails"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      H2 - Solutions / Bonnes pratiques
                    </label>
                    <input
                      type="text"
                      value={formData.h2_solutions}
                      onChange={(e) => setFormData({ ...formData, h2_solutions: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                    />
                    <textarea
                      required
                      value={formData.content_solutions}
                      onChange={(e) => setFormData({ ...formData, content_solutions: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="Contenu des solutions"
                    />
                    <input
                      type="url"
                      value={formData.image_solutions}
                      onChange={(e) => setFormData({ ...formData, image_solutions: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="URL de l'image (optionnel)"
                    />
                    {formData.image_solutions && (
                      <div className="mt-2">
                        <img src={formData.image_solutions} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={formData.h3_solutions_details}
                      onChange={(e) => setFormData({ ...formData, h3_solutions_details: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="H3 - Étapes / Détails (optionnel)"
                    />
                    {formData.h3_solutions_details && (
                      <textarea
                        value={formData.content_solutions_details}
                        onChange={(e) => setFormData({ ...formData, content_solutions_details: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                        rows={3}
                        placeholder="Contenu des détails"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">H2 - Apport du digital</label>
                    <input
                      type="text"
                      value={formData.h2_digital}
                      onChange={(e) => setFormData({ ...formData, h2_digital: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                    />
                    <textarea
                      required
                      value={formData.content_digital}
                      onChange={(e) => setFormData({ ...formData, content_digital: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="Contenu de l'apport digital"
                    />
                    <input
                      type="url"
                      value={formData.image_digital}
                      onChange={(e) => setFormData({ ...formData, image_digital: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="URL de l'image (optionnel)"
                    />
                    {formData.image_digital && (
                      <div className="mt-2">
                        <img src={formData.image_digital} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={formData.h3_digital_details}
                      onChange={(e) => setFormData({ ...formData, h3_digital_details: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="H3 - Détails (optionnel)"
                    />
                    {formData.h3_digital_details && (
                      <textarea
                        value={formData.content_digital_details}
                        onChange={(e) => setFormData({ ...formData, content_digital_details: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                        rows={3}
                        placeholder="Contenu des détails"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      H2 - Résultats / Bénéfices
                    </label>
                    <input
                      type="text"
                      value={formData.h2_results}
                      onChange={(e) => setFormData({ ...formData, h2_results: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                    />
                    <textarea
                      required
                      value={formData.content_results}
                      onChange={(e) => setFormData({ ...formData, content_results: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="Contenu des résultats"
                    />
                    <input
                      type="url"
                      value={formData.image_results}
                      onChange={(e) => setFormData({ ...formData, image_results: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="URL de l'image (optionnel)"
                    />
                    {formData.image_results && (
                      <div className="mt-2">
                        <img src={formData.image_results} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={formData.h3_results_details}
                      onChange={(e) => setFormData({ ...formData, h3_results_details: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="H3 - Détails (optionnel)"
                    />
                    {formData.h3_results_details && (
                      <textarea
                        value={formData.content_results_details}
                        onChange={(e) => setFormData({ ...formData, content_results_details: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                        rows={3}
                        placeholder="Contenu des détails"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">H2 - Conclusion</label>
                    <input
                      type="text"
                      value={formData.h2_conclusion}
                      onChange={(e) => setFormData({ ...formData, h2_conclusion: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                    />
                    <textarea
                      required
                      value={formData.content_conclusion}
                      onChange={(e) => setFormData({ ...formData, content_conclusion: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="Contenu de la conclusion"
                    />
                    <input
                      type="url"
                      value={formData.image_conclusion}
                      onChange={(e) => setFormData({ ...formData, image_conclusion: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                      placeholder="URL de l'image (optionnel)"
                    />
                    {formData.image_conclusion && (
                      <div className="mt-2">
                        <img src={formData.image_conclusion} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Call-to-Action (CTA)</label>
                    <input
                      type="text"
                      value={formData.cta_text}
                      onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                      placeholder="Texte du bouton CTA"
                    />
                    <input
                      type="text"
                      value={formData.cta_link}
                      onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Lien du CTA"
                    />
                  </div>

                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Image mise en avant (recommandé 1200x630px)
                    </label>

                    {imagePreview || formData.featured_image_url ? (
                      <div className="relative">
                        <img
                          src={imagePreview || formData.featured_image_url}
                          alt="Preview"
                          className="w-full h-auto rounded-lg max-h-96 object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="flex flex-col items-center justify-center cursor-pointer py-8 px-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-primary hover:bg-slate-100 transition">
                          <Upload className="w-12 h-12 text-slate-400 mb-3" />
                          <span className="text-sm text-slate-600 mb-2">
                            {uploadingImage ? 'Téléchargement en cours...' : 'Cliquez pour télécharger une image'}
                          </span>
                          <span className="text-xs text-slate-500">
                            JPG, PNG ou WEBP (max 10MB) - Redimensionnement automatique
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-2">Ou saisir une URL directement:</p>
                      <input
                        type="text"
                        value={formData.featured_image_url}
                        onChange={(e) => {
                          setFormData({ ...formData, featured_image_url: e.target.value });
                          setImagePreview(e.target.value);
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_published"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="is_published" className="ml-2 text-sm font-medium text-slate-700">
                      Publier immédiatement
                    </label>
                  </div>
                </div>
              </form>

              <div className="border-t border-slate-200 p-6 bg-slate-50 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  {editingArticle ? 'Mettre à jour' : 'Créer l\'article'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
