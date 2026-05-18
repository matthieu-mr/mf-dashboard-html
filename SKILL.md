# SKILL — Dashboard BigQuery Medias France

> Règles métier et conventions à appliquer pour toute génération de
> requête BigQuery, ajout de KPI, modification de filtre ou création
> de nouvelle vue dans ce projet.
>
> **À lire systématiquement avant de toucher à `api/bigquery.js`,
> `code.js`, `config.js` ou d'ajouter une nouvelle métrique.**

---

## 1. Source de données

- **Projet GCP** : `alert-autumn-310513`
- **Dataset**    : `Medias_France`
- **Table principale (vue)** : `vue_all_devis`
- **Référence complète** : `` `alert-autumn-310513.Medias_France.vue_all_devis` ``
- **Authentification serveur** : compte de service, fichier
  `00-perso/credentials.json` (NE JAMAIS commiter, NE JAMAIS exposer
  côté frontend).

La table est une **vue** : un devis y apparaît potentiellement avec
plusieurs enregistrements (jointure produits, opportunités, etc.).
Pour compter des devis distincts, utiliser `COUNT(DISTINCT Id_devis)`.

---

## 2. Règles métier centrales

### 2.1 Définition du CA (chiffre d'affaires)

> Le **CA = somme des `Montant_HT` des devis validés**, daté par
> `Date_de_validation_de_devis`.

- **Date du CA** = `Date_de_validation_de_devis` (DATE).
- **Un devis est "validé"** ⇔ `Date_de_validation_de_devis IS NOT NULL`.
- **Ne PAS utiliser** `Statut = 'Validé'` comme critère : les statuts
  réels sont `draft` / `read` / `sent` / `accepted`, la valeur
  « Validé » n'existe pas.
- **Ne PAS utiliser** la colonne `` `Date` `` (date de création du
  devis) comme filtre de période, sauf demande explicite.

Toute requête de KPI ou graphique liée au CA doit donc commencer par :

```sql
WHERE Date_de_validation_de_devis IS NOT NULL
  AND Date_de_validation_de_devis BETWEEN @startDate AND @endDate
```

### 2.2 « Médias » = nom de produit

> Dans ce projet, le **« média »** affiché à l'utilisateur correspond
> au **nom du produit vendu** (colonne `produit_nom_produit`).

- **Filtre `medias`** → `produit_nom_produit = @medias`
- **Liste déroulante des médias** →
  `SELECT DISTINCT produit_nom_produit FROM ${TABLE}`
- **Ne PAS utiliser** `Liste_Medias` pour cet usage (c'est un autre
  champ, libre, peu fiable).

### 2.3 Commercial / propriétaire

- Le filtre frontend « Commercial » mappe sur `Proprietaire`.
- ⚠️ **À vérifier** : selon les enregistrements, `Proprietaire` peut
  contenir soit un nom, soit un identifiant numérique (`id_staff`).
  Si la liste déroulante affiche des IDs, basculer sur :
  `CONCAT(user_prenom, ' ', user_nom)` (jointure déjà présente dans la
  vue via les colonnes `user_*`).

### 2.4 Remise moyenne

- Colonne : `Pourcentage_total_remise` (FLOAT, en %).
- Toujours arrondir : `ROUND(AVG(Pourcentage_total_remise), 1)`.

---

## 3. Conventions de requête

### 3.1 Paramétrage

Toujours utiliser les **paramètres nommés** BigQuery (`@nom`) plutôt
que l'interpolation de chaînes (injection SQL).

```js
bigqueryClient.query({
  query:  `SELECT ... WHERE Proprietaire = @commercial`,
  params: { commercial: 'Sarah L.' },
});
```

### 3.2 Format de réponse attendu par le frontend

Le frontend (`code.js`) consomme un format hérité de l'API REST
BigQuery :

```json
{
  "schema": { "fields": [{ "name": "label" }, { "name": "value" }] },
  "rows":   [{ "f": [{ "v": "Mai 2026" }, { "v": "123456" }] }]
}
```

→ Utiliser le helper `toBqFormat(rows)` dans `api/bigquery.js` pour
convertir un résultat du client Node.js dans ce format. Le helper
gère :
- les types `BigQueryDate` / `BigQueryDatetime` / `BigQueryTimestamp`
  (objets `{value: 'YYYY-MM-DD'}`) — ils sont déballés via
  `bqValueToString()`,
- les `STRUCT` / `RECORD` éventuels (sérialisés en JSON).

### 3.3 Graphiques : conventions de colonnes

Les helpers du frontend (`_extractChart`) cherchent les colonnes
nommées exactement **`label`** (axe X) et **`value`** (axe Y). Tout
nouveau graphique doit produire ces deux alias.

```sql
SELECT
  FORMAT_DATE('%b %Y', DATE_TRUNC(Date_de_validation_de_devis, MONTH)) AS label,
  SUM(Montant_HT) AS value
FROM ${TABLE} ${where}
GROUP BY 1
ORDER BY MIN(Date_de_validation_de_devis)
```

### 3.4 KPI : convention de colonne

Les KPIs (carte du haut) lisent **la première colonne** de la première
ligne. Convention : aliaser cette colonne `valeur`.

```sql
SELECT SUM(Montant_HT) AS valeur FROM ${TABLE} ${where}
```

---

## 4. Architecture du dashboard

| Couche       | Fichier            | Rôle                                                  |
|--------------|--------------------|-------------------------------------------------------|
| Serveur HTTP | `server.js`        | Sert les fichiers statiques + route `/api/*`          |
| API BQ       | `api/bigquery.js`  | Routes `/api/filters` et `/api/dashboard`             |
| API Sellsy   | `api/sellsy.js`    | Routes `/api/sellsy/*` (nécessite credentials Sellsy) |
| Frontend     | `dashboard.html`   | Structure UI (sidebar, filtres, KPI, charts, table)   |
| Frontend     | `config.js`        | `CONFIG.apiBase`, `CONFIG.defaultFilter`, `CONFIG.kpis` |
| Frontend     | `code.js`          | Logique : fetch API, rendu Chart.js, tableau          |
| Style        | `style.css`        | Thème Google Sans / Material                          |

**Port serveur** : `8080` (codé en dur dans `server.js`).

### 4.1 Ajouter un KPI

1. Côté backend, ajouter une requête dans `handleBigQueryRoute` →
   alias `valeur` → renvoyer dans la réponse JSON sous une clé
   (`kpi4`, par ex.).
2. Côté frontend, ajouter une entrée dans `CONFIG.kpis` du fichier
   `config.js` :
   ```js
   { key: 'kpi4', label: '…', icon: '…', format: 'currency'|'decimal'|'number', suffix: ' €' }
   ```
3. Rien d'autre à toucher : `code.js` itère sur `CONFIG.kpis`.

### 4.2 Ajouter un filtre

1. Ajouter un `<select>` dans `dashboard.html` (id `filter-<nom>`).
2. Ajouter le filtre dans `_filters` (état initial) dans `code.js` +
   dans `applyFilters()`.
3. Ajouter le mapping colonne dans `buildWhere()` de `api/bigquery.js`.
4. Ajouter la requête `/api/filters` correspondante si la liste doit
   être dynamique.

---

## 5. Pièges connus

- ⚠️ Si une cellule du tableau affiche **`[object Object]`** : c'est
  une valeur non « déballée » par `bqValueToString`. Vérifier que le
  helper est bien appliqué.
- ⚠️ Si **tous les KPIs sont à 0 / —** : très probablement un filtre
  qui force un statut inexistant, ou une absence de
  `Date_de_validation_de_devis` dans la période choisie.
- ⚠️ Si la liste **Médias** est vide ou bizarre : vérifier qu'on
  pointe bien `produit_nom_produit` et **pas** `Liste_Medias`.
- ⚠️ La table étant une **vue dénormalisée**, un même devis peut
  apparaître plusieurs fois (multi-produits, multi-opportunités).
  Pour les comptages, préférer `COUNT(DISTINCT Id_devis)`.
- ⚠️ Le frontend (`code.js`) attend des colonnes nommées **`label`**
  et **`value`** pour tous les graphiques — toute autre nommage donne
  un chart vide.

---

## 6. Glossaire des colonnes utiles

| Colonne                           | Type    | Usage                                            |
|-----------------------------------|---------|--------------------------------------------------|
| `Id_devis`                        | INT     | Identifiant unique du devis                      |
| `Numero`                          | STRING  | Numéro de devis (ex. `B-2605-20551`)             |
| `Date`                            | DATE    | Date de création du devis                        |
| `Date_de_validation_de_devis`     | DATE    | **Date du CA** — base de tous les filtres temps  |
| `Date_de_signature`               | DATE    | Date de signature client                         |
| `Statut`                          | STRING  | `draft` / `read` / `sent` / `accepted`           |
| `Montant_HT` / `Montant_TTC`      | INT     | Montant du devis                                 |
| `Pourcentage_total_remise`        | FLOAT   | % de remise globale                              |
| `Proprietaire`                    | STRING  | Commercial (à fiabiliser, voir §2.3)             |
| `produit_nom_produit`             | STRING  | **Média / produit vendu** (§2.2)                 |
| `type_produit`                    | STRING  | Type de produit                                  |
| `client`                          | STRING  | Nom du client                                    |
| `user_prenom` + `user_nom`        | STRING  | Prénom + nom du commercial (fallback fiable)     |
| `Liste_Medias`                    | STRING  | Champ libre — **NE PAS** utiliser pour le filtre médias |

---

## 7. Démarrage rapide (rappel)

```bash
# Une seule fois
npm install

# À chaque session
npm start
# → http://localhost:8080/
```

Prérequis : `00-perso/credentials.json` (compte de service BigQuery)
et `00-perso/credentials-sellsy.json` (si la route Sellsy est utilisée).
