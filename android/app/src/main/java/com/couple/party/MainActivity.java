package com.couple.party;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        // game landscape: layar penuh, area poni ikut dipakai (UI web sudah memakai safe-area-inset)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        hideSystemBars();
        // tombol kembali: tanya web dulu (mis. Puncak membuka menu jeda); kalau tidak ditangani, perilaku bawaan
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                OnBackPressedCallback self = this;
                getBridge().getWebView().evaluateJavascript("window.__cpBack ? window.__cpBack() : false", (handled) -> {
                    if ("true".equals(handled)) return;
                    self.setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    self.setEnabled(true);
                });
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
    }

    /** dialog izin (mis. kamera di Sport) dan pindah aplikasi memunculkan bar lagi; sembunyikan begitu fokus kembali */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /** bar status (baterai, jam) & navigasi disembunyikan; usap dari tepi memunculkannya sebentar */
    private void hideSystemBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}
