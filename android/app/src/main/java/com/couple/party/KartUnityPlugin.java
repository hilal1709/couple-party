package com.couple.party;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Membuka Kart Kacau versi Unity dari WebView, lalu mengembalikan hasilnya. */
@CapacitorPlugin(name = "KartUnity")
public class KartUnityPlugin extends Plugin {
    /** batas bawah Unity 6.3; app sendiri masih API 24 */
    private static final int MIN_SDK = 25;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", Build.VERSION.SDK_INT >= MIN_SDK);
        call.resolve(ret);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT < MIN_SDK) {
            call.reject("Kart butuh Android 7.1 atau lebih baru");
            return;
        }
        startActivityForResult(call, new Intent(getContext(), KartUnityActivity.class), "raceDone");
    }

    @ActivityCallback
    private void raceDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        JSObject ret = new JSObject();
        ret.put("finished", result.getResultCode() == Activity.RESULT_OK);
        ret.put("result", data == null ? null : data.getStringExtra(KartUnityActivity.RESULT));
        call.resolve(ret);
    }
}
