# Akkoç Lojistik Tahta - Lokal Build Rehberi

Bu dosya, Windows ortamında Android APK (Release) derlemesi alabilmek için gereken yazılım sürümlerini ve çevresel değişkenleri listeler. Diğer bilgisayarlarınızda build hatası alıyorsanız, lütfen buradaki değerleri kontrol edin.

## 1. Temel Yazılım Sürümleri
| Yazılım | Versiyon | İndirme Linki / Not |
|---|---|---|
| **Node.js** | `v24.11.1` | [nodejs.org](https://nodejs.org/) |
| **NPM** | `11.6.2` | Node ile birlikte gelir. |
| **Java (JDK)** | `17.0.18` | [Adoptium Temurin 17](https://adoptium.net/temurin/releases/?version=17) |
| **Expo SDK** | `54.0.0` | `app.json` içinde tanımlıdır. |

## 2. Windows Çevresel Değişkenleri (Environment Variables)
Build işleminin başarılı olması için şu değişkenlerin sistemde tanımlı ve `Path` içine eklenmiş olması gerekir:

- **JAVA_HOME**: `C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot\`
- **ANDROID_HOME**: `C:\Users\Harun\AppData\Local\Android\Sdk` (Kullanıcı adınıza göre güncelleyin)
- **Path** içine şu yolları ekleyin:
  - `%JAVA_HOME%\bin`
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\emulator`
  - `%ANDROID_HOME%\cmdline-tools\latest\bin`

## 3. Gradle İmza Ayarları (Kritik)
`android/gradle.properties` dosyası içinde şu değişkenlerin tanımlı olması zorunludur. Aksi halde `./gradlew assembleRelease` hata verir:

```properties
AKKOC_UPLOAD_STORE_FILE=akkoc-release.keystore
AKKOC_UPLOAD_KEY_ALIAS=akkoc-tahta
AKKOC_UPLOAD_STORE_PASSWORD=akkoc2024!
AKKOC_UPLOAD_KEY_PASSWORD=akkoc2024!
```
> [!IMPORTANT]
> `akkoc-release.keystore` dosyası fiziksel olarak `android/app/` klasörü içinde bulunmalıdır.

## 4. Build Komutları
EAS Cloud yerine lokalde build almak için:
1. `npx expo prebuild --platform android` (Sadece `android` klasörü yoksa veya `app.json` değiştiyse)
2. `cd android`
3. `./gradlew assembleRelease`

---
*Bu rehber Otomatik Build Analiz Sistemi tarafından oluşturulmuştur.*
