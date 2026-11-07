# Builds an isolated WebView test host, never the production application package.
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$workspace = (Get-Location).Path
$sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$jdk = 'C:/Program Files/Android/Android Studio/jbr'
$env:JAVA_HOME = $jdk
$env:PATH = "$jdk/bin;$env:PATH"
$build = Join-Path $workspace '.pilot-drill/android-host'
New-Item -ItemType Directory -Force "$build/src", "$build/classes", "$build/dex" | Out-Null
@'
package com.werkit.pilot;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.CookieManager;
public class MainActivity extends Activity {
  private WebView web;
  public void onCreate(Bundle state) {
    super.onCreate(state);
    WebView.setWebContentsDebuggingEnabled(true);
    web = new WebView(this);
    web.getSettings().setJavaScriptEnabled(true);
    web.getSettings().setDomStorageEnabled(true);
    web.setWebViewClient(new WebViewClient());
    setContentView(web);
    web.loadUrl("http://127.0.0.1:4317/worker");
  }
  protected void onPause() {
    CookieManager.getInstance().flush();
    super.onPause();
  }
}
'@ | Set-Content -LiteralPath "$build/src/MainActivity.java" -Encoding utf8
@'
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.werkit.pilot">
<uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35"/>
<uses-permission android:name="android.permission.INTERNET"/>
<application android:label="Werkit isolated WebView test" android:debuggable="true" android:usesCleartextTraffic="true">
<activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity>
</application></manifest>
'@ | Set-Content -LiteralPath "$build/AndroidManifest.xml" -Encoding utf8
$androidJar = Join-Path $sdk 'platforms/android-36.1/android.jar'
$tools = Join-Path $sdk 'build-tools/36.1.0'
& "$jdk/bin/javac.exe" -source 8 -target 8 -classpath $androidJar -d "$build/classes" "$build/src/MainActivity.java"
& "$jdk/bin/jar.exe" cf "$build/classes.jar" -C "$build/classes" .
& "$tools/d8.bat" --lib $androidJar --output "$build/dex" "$build/classes.jar"
& "$tools/aapt2.exe" link -I $androidJar --manifest "$build/AndroidManifest.xml" -o "$build/unsigned.apk"
Push-Location "$build/dex"
try { & "$jdk/bin/jar.exe" uf "$build/unsigned.apk" classes.dex } finally { Pop-Location }
& "$tools/zipalign.exe" -f 4 "$build/unsigned.apk" "$build/aligned.apk"
if (!(Test-Path "$build/test-key.jks")) {
  & "$jdk/bin/keytool.exe" -genkeypair -alias pilot -keyalg RSA -keysize 2048 -validity 2 -keystore "$build/test-key.jks" -storepass pilot-test-only -keypass pilot-test-only -dname 'CN=Isolated test only'
}
& "$tools/apksigner.bat" sign --ks "$build/test-key.jks" --ks-pass pass:pilot-test-only --out "$build/werkit-pilot.apk" "$build/aligned.apk"
Write-Output "Built local test host: $build/werkit-pilot.apk"
