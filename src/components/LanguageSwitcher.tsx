import { useLanguage } from '../contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 sm:gap-2 bg-white/10 rounded-lg p-0.5 sm:p-1">
      <button
        onClick={() => setLanguage('fr')}
        className={`p-1.5 sm:p-2 rounded-md transition-all ${
          language === 'fr'
            ? 'bg-white shadow-sm scale-110'
            : 'opacity-60 hover:opacity-100 hover:scale-105'
        }`}
        title="Français"
      >
        <span className="text-base sm:text-xl">🇫🇷</span>
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`p-1.5 sm:p-2 rounded-md transition-all ${
          language === 'en'
            ? 'bg-white shadow-sm scale-110'
            : 'opacity-60 hover:opacity-100 hover:scale-105'
        }`}
        title="English"
      >
        <span className="text-base sm:text-xl">🇬🇧</span>
      </button>
      <button
        onClick={() => setLanguage('es')}
        className={`p-1.5 sm:p-2 rounded-md transition-all ${
          language === 'es'
            ? 'bg-white shadow-sm scale-110'
            : 'opacity-60 hover:opacity-100 hover:scale-105'
        }`}
        title="Español"
      >
        <span className="text-base sm:text-xl">🇪🇸</span>
      </button>
    </div>
  );
}
