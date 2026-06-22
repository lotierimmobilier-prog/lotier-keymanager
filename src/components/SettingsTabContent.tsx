import { Info } from 'lucide-react';

interface ServiceTabProps {
  serviceType: 'gestion' | 'location' | 'vente' | 'syndic';
  serviceLabel: string;
  patternValue: string;
  counterValue: number;
  onPatternChange: (value: string) => void;
  onCounterChange: (value: number) => void;
  disabled: boolean;
}

export function ServiceTabContent({
  serviceType,
  serviceLabel,
  patternValue,
  counterValue,
  onPatternChange,
  onCounterChange,
  disabled,
}: ServiceTabProps) {
  const placeholders = {
    gestion: '{owner_name:3}-GES-{counter:3}',
    location: '{owner_name:3}-LOC-{counter:3}',
    vente: '{owner_name:3}-VTE-{counter:3}',
    syndic: '{owner_name:3}-SYN-{counter:3}',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Format de référence - {serviceLabel}
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Ce format sera utilisé spécifiquement pour les biens de type "{serviceLabel}".
        </p>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Format de référence
        </label>
        <input
          type="text"
          value={patternValue}
          onChange={(e) => onPatternChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono disabled:bg-slate-100"
          placeholder={placeholders[serviceType]}
        />
        <div className="mt-3 bg-slate-50 rounded-lg p-4">
          <div className="flex items-start space-x-2 mb-2">
            <Info className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700 font-medium">Variables disponibles :</p>
          </div>
          <ul className="text-xs text-slate-600 space-y-1 ml-6">
            <li>
              <code className="bg-slate-200 px-1 rounded">{'{owner_name:3}'}</code> - 3 premières
              lettres du nom
            </li>
            <li>
              <code className="bg-slate-200 px-1 rounded">{'{owner_first_name:3}'}</code> - 3
              premières lettres du prénom
            </li>
            <li>
              <code className="bg-slate-200 px-1 rounded">{'{address:3}'}</code> - 3 premières
              lettres de l'adresse
            </li>
            <li>
              <code className="bg-slate-200 px-1 rounded">{'{type:3}'}</code> - 3 premières
              lettres du type
            </li>
            <li>
              <code className="bg-slate-200 px-1 rounded">{'{counter:3}'}</code> - Compteur
              auto-incrémenté sur 3 chiffres
            </li>
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            Exemple : {placeholders[serviceType].replace('{owner_name:3}', 'DUP').replace('{counter:3}', '001')}
          </p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Compteur {serviceLabel}
        </h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Prochain numéro à utiliser
          </label>
          <input
            type="number"
            min="0"
            value={counterValue}
            onChange={(e) => onCounterChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
          />
          <p className="text-xs text-slate-500 mt-2">
            Définissez le prochain numéro qui sera utilisé pour les biens de type {serviceLabel}.
            Utile pour reprendre votre nomenclature existante.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note :</strong> Le compteur s'incrémente automatiquement à chaque création de bien
          de type {serviceLabel}. Le numéro affiché ci-dessus sera utilisé pour le prochain bien
          créé.
        </p>
      </div>
    </div>
  );
}
