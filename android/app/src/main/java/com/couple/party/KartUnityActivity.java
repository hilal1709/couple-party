package com.couple.party;

import android.content.Intent;

import com.unity3d.player.UnityPlayerActivity;

/** Kart Kacau versi Unity, jalan di proses ":unity" dan pulang lewat setResult. */
public class KartUnityActivity extends UnityPlayerActivity {
    public static final String RESULT = "result";

    /** Dipanggil KartBridge.cs dari thread Unity. */
    public void finishRace(String json) {
        runOnUiThread(() -> {
            setResult(RESULT_OK, new Intent().putExtra(RESULT, json));
            finish();
        });
    }
}
