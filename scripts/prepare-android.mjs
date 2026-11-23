import fs from 'node:fs';
import path from 'node:path';

const buildNumber = process.argv[2] || '1';
const versionName = process.argv[3] || `1.0.0-beta.${buildNumber}`;

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let xml = fs.readFileSync(manifestPath, 'utf8');
  const permissions = [
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
  ];
  for (const perm of permissions) {
    if (!xml.includes(perm)) {
      xml = xml.replace(
        '</manifest>',
        `    <uses-permission android:name="${perm}" />\n</manifest>`
      );
    }
  }
  fs.writeFileSync(manifestPath, xml, 'utf8');
}

const gradlePath = path.resolve('android/app/build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${buildNumber}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);

  if (!gradle.includes('signingConfigs')) {
    const signingBlock = [
      '    signingConfigs {',
      '        release {',
      '            storeFile file("release.keystore")',
      '            storePassword System.getenv("KEYSTORE_PASS") ?: "masterok_beta_keystore"',
      '            keyAlias System.getenv("KEY_ALIAS") ?: "masterok"',
      '            keyPassword System.getenv("KEY_PASS") ?: "masterok_beta_keystore"',
      '        }',
      '    }',
      '',
    ].join('\n');

    gradle = gradle.replace('buildTypes {', `${signingBlock}    buildTypes {`);
    gradle = gradle.replace(
      /buildTypes\s*\{\s*release\s*\{/,
      'buildTypes {\n        release {\n            signingConfig signingConfigs.release'
    );
  }

  fs.writeFileSync(gradlePath, gradle, 'utf8');
}

// Копирование фирменных иконок приложения в ресурсы Android APK
const resDir = path.resolve('android/app/src/main/res');
if (fs.existsSync(resDir)) {
  const mipmapMap = [
    { src: 'public/icons/android-mdpi.png', dir: 'mipmap-mdpi' },
    { src: 'public/icons/android-hdpi.png', dir: 'mipmap-hdpi' },
    { src: 'public/icons/android-xhdpi.png', dir: 'mipmap-xhdpi' },
    { src: 'public/icons/android-xxhdpi.png', dir: 'mipmap-xxhdpi' },
    { src: 'public/icons/android-xxxhdpi.png', dir: 'mipmap-xxxhdpi' },
  ];

  for (const { src, dir } of mipmapMap) {
    const srcPath = path.resolve(src);
    const targetDir = path.join(resDir, dir);
    if (fs.existsSync(srcPath) && fs.existsSync(targetDir)) {
      fs.copyFileSync(srcPath, path.join(targetDir, 'ic_launcher.png'));
      fs.copyFileSync(srcPath, path.join(targetDir, 'ic_launcher_round.png'));
      fs.copyFileSync(srcPath, path.join(targetDir, 'ic_launcher_foreground.png'));
    }
  }

  const valuesDir = path.join(resDir, 'values');
  if (fs.existsSync(valuesDir)) {
    const bgFile = path.join(valuesDir, 'ic_launcher_background.xml');
    fs.writeFileSync(
      bgFile,
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0C0F17</color>\n</resources>\n',
      'utf8'
    );
  }
}

console.log(`Configured Android build: versionCode=${buildNumber}, versionName=${versionName}`);
