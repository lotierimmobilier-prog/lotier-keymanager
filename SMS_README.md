# Système SMS Twilio - Guide Rapide

## 🚀 Mise en Route

Le système SMS Twilio est maintenant intégré à votre application de gestion de clés. Voici comment le configurer et l'utiliser.

## ⚙️ Configuration Initiale

### 1. Créer un compte Twilio

1. Allez sur : **https://www.twilio.com/try-twilio**
2. Inscrivez-vous (22€ de crédit gratuit pour tester)
3. Vérifiez votre numéro de téléphone

### 2. Récupérer les identifiants Twilio

Dans le dashboard Twilio : **https://console.twilio.com/**

Vous aurez besoin de :
- **Account SID** (ex: ACxxxxxxxxxxxxx)
- **Auth Token** (cliquez sur "show" pour le voir)
- **Phone Number** (achetez un numéro français si besoin, ~1€/mois)

### 3. Configurer dans Supabase

Allez dans **Supabase** > **Project Settings** > **Edge Functions** > **Secrets**

Ajoutez ces 3 variables :
```
TWILIO_ACCOUNT_SID=votre_account_sid
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_PHONE_NUMBER=votre_numero_twilio
```

Format du numéro : `+33612345678`

### 4. Configurer le Job Planifié

Pour que les SMS de rappel (2h avant) et d'alerte (retard) fonctionnent, vous devez configurer un cron qui appelle l'endpoint suivant **toutes les 10 minutes** :

```
https://[votre-projet].supabase.co/functions/v1/sms-scheduler
```

**Options de cron :**
- [cron-job.org](https://cron-job.org) (gratuit, simple)
- GitHub Actions
- Serveur personnel avec crontab

Exemple avec cron-job.org :
1. Créer un compte sur cron-job.org
2. Créer un nouveau cron job
3. URL : `https://[votre-projet].supabase.co/functions/v1/sms-scheduler`
4. Fréquence : Toutes les 10 minutes
5. Méthode : POST

## 📱 Utilisation

### Interface Utilisateur

#### 1. Configuration des Templates SMS

Accédez à **Dashboard > Configuration SMS** pour :
- Activer/désactiver chaque type de SMS
- Personnaliser le contenu des messages
- Utiliser des variables dynamiques ({{prenom}}, {{reference_cle}}, etc.)

#### 2. Lors d'une Sortie de Clé

Dans **Dashboard > Mouvements > Sortie de clé** :
1. Sélectionner le contact dans l'annuaire (le téléphone est auto-complété)
2. OU saisir manuellement le nom et le téléphone
3. Cocher "Désactiver les SMS pour ce prêt" si vous ne souhaitez pas envoyer de SMS
4. Compléter le formulaire normalement

Le SMS de confirmation sera envoyé automatiquement après enregistrement.

### Types de SMS

1. **SMS Confirmation de Sortie** 🔑
   - Envoyé : Immédiatement après l'enregistrement
   - Contenu : Confirmation de prise de clé avec détails

2. **SMS Rappel 2h Avant** ⏰
   - Envoyé : 2 heures avant l'heure de retour prévue
   - Contenu : Rappel de restituer la clé à temps

3. **SMS Alerte Retard** 🚨
   - Envoyé : Après dépassement de l'heure prévue
   - Contenu : Alerte que la clé n'a pas été rendue

## 🔍 Surveillance

### Consulter les Logs SMS

Dans l'interface Supabase, vous pouvez consulter la table `sms_logs` pour voir :
- Tous les SMS envoyés
- Le statut (envoyé / erreur)
- Les erreurs éventuelles
- Les détails de chaque SMS

### Vérifications Rapides

**Aucun SMS reçu ?**
1. Template activé dans Configuration SMS ?
2. Téléphone renseigné dans le formulaire ?
3. Case "Désactiver les SMS" non cochée ?
4. Contact n'a pas activé l'opt-out ?
5. Crédit SMS suffisant sur Twilio ?

**Job planifié ne fonctionne pas ?**
1. Cron externe configuré ?
2. Endpoint appelé toutes les 10 minutes ?
3. Templates activés ?

## 💰 Tarifs Twilio

- SMS France : ~0.07€ par SMS
- Numéro français : ~1€/mois
- 22€ de crédit gratuit à l'inscription

## 📊 Statistiques

Vous pouvez consulter les statistiques d'envoi directement dans la table `sms_logs` :

```sql
-- SMS envoyés aujourd'hui
SELECT COUNT(*) FROM sms_logs
WHERE created_at::date = CURRENT_DATE AND status = 'sent';

-- SMS par type
SELECT type, COUNT(*) FROM sms_logs
WHERE status = 'sent'
GROUP BY type;
```

## 🎯 Bonnes Pratiques

1. **Tester d'abord** : Envoyez quelques SMS de test avant d'activer en production
2. **Vérifier le crédit Twilio** : Surveillez votre solde SMS dans le dashboard Twilio
3. **Optimiser les messages** : Limitez à 160 caractères pour 1 SMS
4. **Respecter l'opt-out** : Ne pas forcer l'envoi aux contacts qui refusent
5. **Surveiller les logs** : Vérifier régulièrement qu'il n'y a pas d'erreurs

## 📚 Documentation Complète

Pour plus de détails techniques, consultez `SMS_SYSTEM_DOCUMENTATION.md` qui contient :
- Architecture détaillée de la base de données
- Fonctionnement des Edge Functions
- Guide de dépannage complet
- Exemples de requêtes SQL
- Configuration avancée

## 🆘 Support

En cas de problème :
1. Consulter `SMS_SYSTEM_DOCUMENTATION.md`
2. Vérifier les logs dans la table `sms_logs`
3. Tester manuellement l'endpoint avec curl
4. Consulter la documentation Twilio : https://www.twilio.com/docs

---

**Version :** 2.0 (Twilio)
**Date :** Novembre 2025
**Timezone :** Europe/Paris
