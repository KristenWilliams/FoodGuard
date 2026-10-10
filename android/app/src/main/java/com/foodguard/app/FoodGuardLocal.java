package com.foodguard.app;

import android.Manifest;
import android.content.Context;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.WorkInfo;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.net.URI;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

@CapacitorPlugin(name = "FoodGuardLocal", permissions = {
    @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
})
public class FoodGuardLocal extends Plugin {
    static final String TAG = "foodguard-analysis";
    private static final String ALIAS = "foodguard-local-v1";

    static File directory(Context context) {
        File dir = new File(context.getNoBackupFilesDir(), "foodguard");
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Local storage unavailable");
        return dir;
    }

    private static synchronized SecretKey encryptionKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(ALIAS, null);
    }

    static synchronized void write(File file, String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey());
        JSONObject box = new JSONObject();
        box.put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP));
        box.put("data", Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP));
        AtomicFile atomic = new AtomicFile(file);
        FileOutputStream stream = atomic.startWrite();
        try {
            stream.write(box.toString().getBytes(StandardCharsets.UTF_8));
            atomic.finishWrite(stream);
        } catch (Exception error) { atomic.failWrite(stream); throw error; }
    }

    static synchronized String read(File file) throws Exception {
        JSONObject box = new JSONObject(new String(new AtomicFile(file).readFully(), StandardCharsets.UTF_8));
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), new GCMParameterSpec(128, Base64.decode(box.getString("iv"), Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(box.getString("data"), Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }

    static String credential(Context context) throws Exception {
        return credentialConfig(context).optString("key");
    }

    static JSONObject credentialConfig(Context context) throws Exception {
        File file = new File(directory(context), "credential.enc");
        String value = file.exists() ? read(file) : "";
        return value.startsWith("{") ? new JSONObject(value) : new JSONObject().put("key", value).put("url", "https://api.littlemelon.top/v1");
    }

    static String credentialId(JSONObject config) throws Exception {
        return fingerprint(config.optString("url", "https://api.littlemelon.top/v1") + "\n" + config.optString("key"));
    }

    static String fingerprint(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : digest) hex.append(String.format("%02x", b & 255));
        return hex.toString();
    }

    static File taskFile(Context context, String id, String suffix) {
        UUID.fromString(id);
        return new File(directory(context), id + suffix);
    }

    @PluginMethod public void saveCredential(PluginCall call) {
        try {
            String key = call.getString("key", "").trim();
            if (!key.matches("[^\\s]{8,512}")) { call.reject("Invalid API Key"); return; }
            String url = call.getString("url", "https://api.littlemelon.top/v1");
            URI address = new URI(url);
            if (!"https".equals(address.getScheme()) || address.getHost() == null || address.getRawUserInfo() != null || address.getRawQuery() != null || address.getRawFragment() != null) { call.reject("Invalid HTTPS API address"); return; }
            List<WorkInfo> work = WorkManager.getInstance(getContext()).getWorkInfosByTag(TAG).get(3, TimeUnit.SECONDS);
            if (work.stream().anyMatch(item -> !item.getState().isFinished())) { call.reject("Wait for the active analysis to finish"); return; }
            write(new File(directory(getContext()), "credential.enc"), new JSONObject().put("key", key).put("url", url).toString());
            call.resolve();
        } catch (Exception error) { call.reject("Unable to securely save API Key"); }
    }

    @PluginMethod public void loadCredential(PluginCall call) {
        try { JSONObject config = credentialConfig(getContext()); JSObject result = new JSObject(); result.put("key", config.optString("key")); result.put("url", config.optString("url")); call.resolve(result); }
        catch (Exception error) { call.reject("Unable to read API Key; please log in again"); }
    }

    @PluginMethod public void clearCredential(PluginCall call) {
        try {
            WorkManager.getInstance(getContext()).cancelAllWorkByTag(TAG);
            File credentialFile = new File(directory(getContext()), "credential.enc");
            new AtomicFile(credentialFile).delete();
            if (credentialFile.exists()) { call.reject("Unable to remove API Key; please try again"); return; }
            File[] files = directory(getContext()).listFiles((dir, name) -> name.endsWith(".meta"));
            if (files != null) for (File file : files) {
                try {
                    JSONObject meta = new JSONObject(read(file));
                    if ("running".equals(meta.optString("status"))) {
                        meta.put("status", "failed").put("error", "API Key 已退出，请重新登录后分析。");
                        write(file, meta.toString());
                    }
                } catch (Exception ignored) { /* A damaged task must not prevent logout. */ }
            }
            call.resolve();
        } catch (Exception error) { call.reject("Unable to remove API Key; please try again"); }
    }

    @PluginMethod public void startAnalysis(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "enqueueAfterPermission");
        } else enqueueAfterPermission(call);
    }

    @PermissionCallback private void enqueueAfterPermission(PluginCall call) {
        try {
            String id = call.getString("id");
            JSObject payload = call.getObject("payload");
            JSONObject config = credentialConfig(getContext());
            String key = config.optString("key");
            if (id == null || payload == null || key.isEmpty()) { call.reject("Please log in first"); return; }
            UUID.fromString(id);
            File[] metas = directory(getContext()).listFiles((dir, name) -> name.endsWith(".meta"));
            if (metas != null) for (File file : metas) {
                if ("running".equals(new JSONObject(read(file)).optString("status"))) { call.reject("An analysis is already running"); return; }
            }
            JSONObject request = new JSONObject();
            request.put("base", call.getString("base"));
            request.put("credential_id", credentialId(config));
            request.put("provider", config.optString("url", "https://api.littlemelon.top/v1"));
            request.put("payload", payload);
            write(taskFile(getContext(), id, ".request"), request.toString());
            JSONObject meta = new JSONObject().put("id", id).put("status", "running").put("mode", payload.optString("analysis_mode", "fast"))
                .put("cache_key", payload.optString("client_cache_key")).put("credential_id", credentialId(config)).put("model", payload.optString("model")).put("language", payload.optString("language", "zh")).put("created_at", System.currentTimeMillis());
            write(taskFile(getContext(), id, ".meta"), meta.toString());
            OneTimeWorkRequest work = new OneTimeWorkRequest.Builder(AnalysisWorker.class)
                .setInputData(new Data.Builder().putString("id", id).build())
                .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).addTag(TAG).build();
            WorkManager.getInstance(getContext()).enqueueUniqueWork("foodguard-" + id, ExistingWorkPolicy.KEEP, work);
            call.resolve();
        } catch (Exception error) { call.reject("Unable to start local background analysis"); }
    }

    @PluginMethod public void listJobs(PluginCall call) {
        try {
            JSArray jobs = new JSArray();
            File[] files = directory(getContext()).listFiles((dir, name) -> name.endsWith(".meta"));
            if (files != null) for (File file : files) {
                JSONObject meta = new JSONObject(read(file));
                if ("running".equals(meta.optString("status"))) {
                    List<WorkInfo> work = WorkManager.getInstance(getContext()).getWorkInfosForUniqueWork("foodguard-" + meta.getString("id")).get(2, TimeUnit.SECONDS);
                    boolean stopped = work.isEmpty() ? System.currentTimeMillis() - meta.optLong("created_at") > 10_000 : work.stream().allMatch(item -> item.getState().isFinished());
                    if (stopped) {
                        // The worker may have completed while its scheduler state was read.
                        meta = new JSONObject(read(file));
                        if ("running".equals(meta.optString("status"))) {
                            meta.put("status", "failed").put("error", "en".equals(meta.optString("language")) ? "Analysis interrupted. Retry manually." : "分析任务已中断，请手动重试。");
                            write(file, meta.toString());
                        }
                    }
                }
                jobs.put(meta);
            }
            JSObject result = new JSObject(); result.put("jobs", jobs); call.resolve(result);
        } catch (Exception error) { call.reject("Unable to read local analysis tasks"); }
    }

    @PluginMethod public void acknowledgeJob(PluginCall call) {
        try {
            String id = call.getString("id");
            File metaFile = taskFile(getContext(), id, ".meta");
            if (metaFile.exists() && "running".equals(new JSONObject(read(metaFile)).optString("status"))) { call.reject("Task is still running"); return; }
            new AtomicFile(taskFile(getContext(), id, ".request")).delete();
            new AtomicFile(metaFile).delete();
            call.resolve();
        } catch (Exception error) { call.reject("Unable to acknowledge local task"); }
    }

}
