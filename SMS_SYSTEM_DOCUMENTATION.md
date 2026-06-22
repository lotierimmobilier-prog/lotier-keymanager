# Documentation du Système SMS OVH

## 📋 Vue d'ensemble

Le système SMS permet d'envoyer automatiquement des SMS aux contacts lors des prêts de clés. Il utilise l'API OVH SMS et s'intègre de manière transparente dans l'application existante sans modifier l'architecture globale.

## 🎯 Fonctionnalités

### 3 Types de SMS automatiques

1. **SMS #1 - Confirmation de sortie de clé**
   - Déclenché immédiatement lors de l'enregistrement d'une sortie de clé
   - Confirme la prise de la clé avec les détails (référence, dates)

2. **SMS #2 - Rappel 2h avant le retour**
   - Envoyé automatiquement 2 heures avant l'heure de retour prévue
   - Rappelle au contact de restituer la clé à temps

3. **SMS #3 - Alerte de retard**
   - Envoyé automatiquement après dépassement de l'heure prévue
   - Alerte le contact que la clé aurait dû être rendue

## 🗄️ Architecture Base de Données

### Nouvelles Tables

#### `sms_templates`
Stocke les templates de SMS configurables.

```sql
CREATE TABLE sms_templates (
  id uuid PRIMARY KEY,
  code text UNIQUE NOT NULL,  -- 'key_taken', 'key_due_2h', 'key_overdue'
  label text NOT NULL,
  content text NOT NULL,      -- Contenu avec variables {{variable}}
  enabled boolean DEFAULT true,
  created_at timestamptz,
  updated_at timestamptz
);
```

**Templates par défaut :**
- `key_taken` : "Bonjour {{prenom}}, vous avez pris la clé {{reference_cle}}..."
- `key_due_2h` : "Bonjour {{prenom}}, rappel : la clé {{reference_cle}} doit être rendue..."
- `key_overdue` : "Bonjour {{prenom}}, la clé {{reference_cle}} devait être rendue..."

#### `sms_logs`
Enregistre tous les SMS envoyés pour traçabilité.

```sql
CREATE TABLE sms_logs (
  id uuid PRIMARY KEY,
  agency_id uuid REFERENCES agencies(id),
  contact_id uuid REFERENCES contacts(id),
  movement_id uuid REFERENCES key_movements(id),
  type text NOT NULL,          -- 'key_taken', 'key_due_2h', 'key_overdue'
  to_phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'sent',  -- 'sent' ou 'error'
  error_message text,
  created_at timestamptz
);
```

### Modifications des Tables Existantes

#### `key_movements`
Ajout de champs pour le tracking SMS :

```sql
ALTER TABLE key_movements ADD COLUMN:
- sms_taken_sent boolean DEFAULT false
- sms_due_2h_sent boolean DEFAULT false
- sms_overdue_sent boolean DEFAULT false
- disable_sms boolean DEFAULT false
- contact_phone text
```

#### `contacts`
Ajout du champ opt-out :

```sql
ALTER TABLE contacts ADD COLUMN:
- sms_opt_out boolean DEFAULT false
```

## 🔧 Configuration OVH SMS

### Variables d'environnement (automatiquement configurées)

Les variables suivantes sont disponibles dans Supabase :

```
OVH_APP_KEY=<votre_app_key>
OVH_APP_SECRET=<votre_app_secret>
OVH_CONSUMER_KEY=<votre_consumer_key>
OVH_SMS_ACCOUNT=sms-XXXXXX-1
OVH_SMS_SENDER=KeyManager
```

### Comment obtenir vos identifiants OVH :

1. **Créer une application OVH**
   - Accéder à https://eu.api.ovh.com/createApp/
   - Renseigner les informations de votre application
   - Noter `Application Key` et `Application Secret`

2. **Obtenir un Consumer Key**
   - Utiliser l'outil de génération : https://eu.api.ovh.com/createToken/
   - Droits requis : `GET /sms/*` et `POST /sms/*`
   - Noter le `Consumer Key` généré

3. **Identifier votre compte SMS**
   - Se connecter à l'espace client OVH
   - Section "Telecom" > "SMS"
   - Le nom du compte ressemble à `sms-XXXXXX-1`

## 🚀 Edge Functions

### 1. `send-sms`
**Rôle :** Envoie un SMS via l'API OVH et enregistre le log.

**Endpoint :** `/functions/v1/send-sms`

**Méthode :** POST

**Authentification :** Bearer token (JWT)

**Corps de la requête :**
```json
{
  "to": "0612345678",
  "message": "Contenu du SMS",
  "movementId": "uuid",
  "contactId": "uuid",
  "agencyId": "uuid",
  "type": "key_taken"
}
```

**Fonctionnalités :**
- Nettoie et formate le numéro de téléphone (ajout +33)
- Génère la signature OVH pour l'authentification
- Envoie le SMS via l'API OVH
- Enregistre le résultat dans `sms_logs`
- Gestion des erreurs sans bloquer l'application

### 2. `sms-scheduler`
**Rôle :** Job planifié pour les SMS automatiques (rappel 2h avant et retard).

**Endpoint :** `/functions/v1/sms-scheduler`

**Méthode :** GET ou POST

**Authentification :** Aucune (public pour permettre l'appel par cron externe)

**Fréquence recommandée :** Toutes les 10 minutes

**Fonctionnement :**
1. Recherche les mouvements où `expected_return_at` est dans 2h (±5 min)
2. Recherche les mouvements en retard (après `expected_return_at`)
3. Vérifie les flags `sms_due_2h_sent` et `sms_overdue_sent`
4. Envoie les SMS appropriés
5. Met à jour les flags pour éviter les doublons

**Configuration d'un cron externe :**

Utiliser un service comme [cron-job.org](https://cron-job.org) ou GitHub Actions :

```yaml
# .github/workflows/sms-scheduler.yml
name: SMS Scheduler
on:
  schedule:
    - cron: '*/10 * * * *'  # Toutes les 10 minutes
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Call SMS Scheduler
        run: |
          curl -X POST https://your-project.supabase.co/functions/v1/sms-scheduler
```

## 💻 Intégration Frontend

### Utilitaire `/src/utils/smsTemplates.ts`

**Fonctions disponibles :**

```typescript
// Formate une date en DD/MM/YYYY
formatDate(dateString: string): string

// Formate une heure en HH:mm
formatTime(dateString: string): string

// Rend un template avec des variables
renderSmsTemplate(template: string, context: SmsContext): string

// Récupère un template depuis la BDD
getSmsTemplate(code: string): Promise<{content, enabled} | null>

// Envoie un SMS
sendSms(params): Promise<{success, error?}>

// Envoie un SMS de confirmation de sortie
sendKeyTakenSms(params): Promise<{success, error?}>
```

### Intégration dans MovementsPage

Lors de la création d'un mouvement de clé :

1. Collecte du téléphone du contact
2. Case à cocher "Désactiver les SMS pour ce prêt"
3. Après insertion réussie :
   - Récupération du template `key_taken`
   - Rendu avec les variables (prénom, clé, dates)
   - Appel à `sendKeyTakenSms()`
   - Mise à jour de `sms_taken_sent = true`

```typescript
// Exemple d'intégration
if (!formData.disable_sms && formData.contact_phone) {
  const result = await sendKeyTakenSms({
    contactFirstName: firstName,
    contactLastName: lastName,
    contactPhone: formData.contact_phone,
    keyLabel: keyData.label,
    outAt: now,
    expectedReturnAt: expectedReturnDate,
    agencyName: agencyData.name,
    agencyId: profile.agency_id,
    movementId: newMovement.id,
  });

  if (result.success) {
    await supabase
      .from('key_movements')
      .update({ sms_taken_sent: true })
      .eq('id', newMovement.id);
  }
}
```

## 🎨 Interface Utilisateur

### Page Configuration SMS (`/dashboard/sms-config`)

**Accessible par :** Administrateurs de l'agence

**Fonctionnalités :**
- Liste des 3 templates SMS
- Activation/désactivation de chaque template
- Édition du contenu avec variables
- Compteur de caractères (max conseillé : 160)
- Sauvegarde individuelle de chaque template
- Liste des variables disponibles
- Instructions sur l'envoi automatique

**Variables disponibles :**
- `{{prenom}}` - Prénom du contact
- `{{nom}}` - Nom du contact
- `{{telephone}}` - Téléphone du contact
- `{{reference_cle}}` - Référence de la clé
- `{{date_prise}}` - Date de sortie (DD/MM/YYYY)
- `{{heure_prise}}` - Heure de sortie (HH:mm)
- `{{date_retour}}` - Date de retour prévue (DD/MM/YYYY)
- `{{heure_retour}}` - Heure de retour prévue (HH:mm)
- `{{nom_agence}}` - Nom de l'agence

### Formulaire de Sortie de Clé

**Nouveaux champs :**
- **Téléphone (pour SMS)** : Champ texte pour saisir le numéro
- **Désactiver les SMS pour ce prêt** : Case à cocher

**Auto-complétion depuis l'annuaire :**
Lors de la sélection d'un contact, le téléphone est automatiquement rempli.

## 🔐 Sécurité

### Row Level Security (RLS)

**sms_templates :**
- Lecture : Tous les utilisateurs authentifiés
- Écriture : Super-admins uniquement

**sms_logs :**
- Lecture : Utilisateurs de la même agence
- Écriture : Utilisateurs de la même agence

### Gestion des Erreurs

- Les erreurs d'envoi SMS ne bloquent JAMAIS la création d'un prêt
- Tous les envois sont loggés avec statut et message d'erreur
- Les erreurs sont affichées dans la console pour débogage
- Pas de rollback de transaction sur échec SMS

### Opt-out

- Champ `sms_opt_out` sur les contacts
- Si activé, aucun SMS n'est envoyé à ce contact
- Respecte les préférences des utilisateurs

## 📊 Monitoring et Logs

### Consultation des logs SMS

```sql
-- Voir tous les SMS envoyés aujourd'hui
SELECT * FROM sms_logs
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- Compter les SMS par type
SELECT type, COUNT(*),
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
FROM sms_logs
GROUP BY type;

-- Voir les SMS en erreur
SELECT * FROM sms_logs
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 50;
```

### Vérification des SMS non envoyés

```sql
-- Mouvements avec téléphone mais SMS non envoyé
SELECT id, given_to_name, contact_phone, out_at
FROM key_movements
WHERE contact_phone IS NOT NULL
  AND sms_taken_sent = false
  AND disable_sms = false
  AND created_at > NOW() - INTERVAL '7 days';
```

## 🐛 Dépannage

### Problème : SMS non reçus

**Vérifications :**
1. Template activé dans `/dashboard/sms-config` ?
2. Téléphone renseigné dans le formulaire ?
3. Case "Désactiver les SMS" non cochée ?
4. Variables d'environnement OVH correctement configurées ?
5. Crédit SMS suffisant sur le compte OVH ?

**Consulter les logs :**
```sql
SELECT * FROM sms_logs
WHERE movement_id = 'uuid_du_mouvement';
```

### Problème : Job planifié ne fonctionne pas

**Vérifications :**
1. Le cron externe appelle bien l'endpoint toutes les 10 minutes ?
2. L'URL est correcte : `https://[projet].supabase.co/functions/v1/sms-scheduler` ?
3. Les templates `key_due_2h` et `key_overdue` sont activés ?

**Test manuel :**
```bash
curl -X POST https://[projet].supabase.co/functions/v1/sms-scheduler
```

### Problème : Erreur "Configuration OVH SMS manquante"

Les variables d'environnement ne sont pas configurées. Contacter l'administrateur Supabase.

## 📝 Maintenance

### Mise à jour des templates

Les templates peuvent être modifiés directement via l'interface `/dashboard/sms-config` sans besoin de déploiement.

### Nettoyage des logs

Pour éviter une table trop volumineuse :

```sql
-- Supprimer les logs de plus de 6 mois
DELETE FROM sms_logs
WHERE created_at < NOW() - INTERVAL '6 months';
```

### Statistiques d'utilisation

```sql
-- SMS envoyés par mois
SELECT
  DATE_TRUNC('month', created_at) as month,
  type,
  COUNT(*) as count
FROM sms_logs
WHERE status = 'sent'
GROUP BY month, type
ORDER BY month DESC;
```

## 🎯 Bonnes Pratiques

1. **Toujours tester** les templates avant l'activation en production
2. **Limiter les SMS à 160 caractères** pour un seul SMS (économie de crédit)
3. **Vérifier régulièrement** les logs pour détecter les erreurs
4. **Respecter l'opt-out** des contacts
5. **Surveiller le crédit SMS** sur le compte OVH
6. **Planifier un nettoyage** régulier des logs anciens

## 📞 Support

Pour toute question ou problème :
- Consulter la documentation OVH : https://docs.ovh.com/fr/sms/
- Vérifier les logs dans `sms_logs`
- Contacter le support technique de l'agence
