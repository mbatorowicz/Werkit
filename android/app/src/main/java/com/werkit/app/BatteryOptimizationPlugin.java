package com.werkit.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BatteryOptimization")
public class BatteryOptimizationPlugin extends Plugin {
    private static final String PREF = "werkit_battery_opt";
    private static final String KEY_ASKED = "asked";

    @PluginMethod
    public void requestIgnoreIfNeeded(PluginCall call) {
        boolean ignoring = isIgnoringOptimizations();
        boolean alreadyAsked =
                getContext()
                        .getSharedPreferences(PREF, Context.MODE_PRIVATE)
                        .getBoolean(KEY_ASKED, false);
        boolean shouldPrompt =
                !ignoring && !alreadyAsked && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M;

        if (shouldPrompt) {
            getContext()
                    .getSharedPreferences(PREF, Context.MODE_PRIVATE)
                    .edit()
                    .putBoolean(KEY_ASKED, true)
                    .apply();
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }

        JSObject ret = new JSObject();
        ret.put("ignoring", ignoring);
        ret.put("prompted", shouldPrompt);
        call.resolve(ret);
    }

    private boolean isIgnoringOptimizations() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }
}
