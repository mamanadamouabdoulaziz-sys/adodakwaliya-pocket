# Construire l'APK Android — ADO DA KWALIYA

Ton projet est déjà configuré avec **Capacitor**. Suis ces étapes sur ton ordinateur pour générer le fichier `.apk` à installer sur Android.

## Prérequis (à installer une seule fois)

1. **Node.js 20+** — https://nodejs.org
2. **JDK 17** — https://adoptium.net
3. **Android Studio** — https://developer.android.com/studio  
   (à l'ouverture, accepte d'installer Android SDK + Platform Tools)

## Étapes

### 1. Récupérer le code
Connecte ton projet Lovable à GitHub (menu **+** → GitHub → Connect project), puis :
```bash
git clone <url-de-ton-repo>
cd <ton-repo>
npm install
```

### 2. Build du site web
```bash
npm run build
```

### 3. Ajouter la plateforme Android (une seule fois)
```bash
npx cap add android
```

### 4. Synchroniser à chaque mise à jour
```bash
npx cap sync android
```

### 5. Ouvrir dans Android Studio
```bash
npx cap open android
```

### 6. Générer l'APK
Dans Android Studio :
- Menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
- Attends la fin de la compilation
- Clique sur **locate** dans la notification — l'APK est dans :  
  `android/app/build/outputs/apk/debug/app-debug.apk`

Copie ce fichier sur ton téléphone Android et installe-le (autorise "sources inconnues" si demandé).

## Mode "site distant" (déjà configuré)

`capacitor.config.ts` pointe sur **https://adodakwaliya.shop**.  
Avantage : chaque mise à jour publiée sur Lovable apparaît automatiquement dans l'APK, **sans recompiler**.

Pour embarquer le site directement dans l'APK (mode hors-ligne), supprime le bloc `server` dans `capacitor.config.ts`, puis relance `npm run build && npx cap sync android`.

## Publier sur le Play Store

1. Dans Android Studio : **Build** → **Generate Signed Bundle / APK** → choisis **Android App Bundle (.aab)**
2. Crée une clé de signature (garde-la précieusement !)
3. Téléverse le `.aab` sur https://play.google.com/console (compte développeur à 25 $ unique)

## Mettre à jour l'app

À chaque pull depuis GitHub :
```bash
npm install
npm run build
npx cap sync android
```
Puis rebuild l'APK dans Android Studio.
