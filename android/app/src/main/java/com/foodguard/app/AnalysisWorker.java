package com.foodguard.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.ForegroundInfo;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

public class AnalysisWorker extends Worker {
    private volatile HttpURLConnection connection;
    public AnalysisWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

    private ForegroundInfo notification(boolean english) {
        Context context = getApplicationContext();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel("analysis", "FoodGuard", NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(context, 0, new Intent(context, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        android.app.Notification note = new NotificationCompat.Builder(context, "analysis").setSmallIcon(android.R.drawable.ic_menu_search)
            .setContentTitle(english ? "Analyzing food label" : "正在分析食品标签")
            .setContentText(english ? "Your report will be saved on this device." : "完成后保存在本机历史中")
            .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).build();
        return Build.VERSION.SDK_INT >= 29 ? new ForegroundInfo(2301, note, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC) : new ForegroundInfo(2301, note);
    }

    @NonNull @Override public Result doWork() {
        Context context = getApplicationContext();
        String id = getInputData().getString("id");
        String errorCode = "";
        boolean english = false;
        ScheduledExecutorService deadline = Executors.newSingleThreadScheduledExecutor();
        try {
            JSONObject request = new JSONObject(FoodGuardLocal.read(FoodGuardLocal.taskFile(context, id, ".request")));
            JSONObject payload = request.getJSONObject("payload");
            english = "en".equals(payload.optString("language"));
            JSONObject attempt = new JSONObject(FoodGuardLocal.read(FoodGuardLocal.taskFile(context, id, ".meta")));
            if (attempt.optBoolean("attempt_started")) throw new IllegalStateException(english ? "The previous request was interrupted. Retry manually to avoid a duplicate charge." : "上次请求已中断，为避免重复计费没有自动重发。请手动重试。");
            JSONObject config = FoodGuardLocal.credentialConfig(context);
            String key = config.optString("key");
            String expectedId = request.has("provider") ? FoodGuardLocal.credentialId(config) : FoodGuardLocal.fingerprint(key);
            if (key.isEmpty() || !expectedId.equals(request.getString("credential_id"))) throw new IllegalStateException(english ? "Please log in again." : "请重新登录后分析。");
            setForegroundAsync(notification("en".equals(payload.optString("language")))).get();
            URI base = new URI(request.getString("base"));
            boolean debugLocal = BuildConfig.DEBUG && ("10.0.2.2".equals(base.getHost()) || "localhost".equals(base.getHost()));
            if (!("https".equals(base.getScheme()) && BuildConfig.API_HOST.equals(base.getHost())) && !debugLocal) throw new IllegalStateException("API server address is not allowed");
            connection = (HttpURLConnection) new URI(base.toString().replaceAll("/+$", "") + "/api/analyze-ingredients").toURL().openConnection();
            connection.setConnectTimeout(15_000); connection.setReadTimeout(190_000);
            connection.setRequestMethod("POST"); connection.setDoOutput(true); connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Content-Type", "application/json"); connection.setRequestProperty("Authorization", "Bearer " + key);
            if (request.has("provider")) connection.setRequestProperty("X-FoodGuard-Upstream", request.getString("provider"));
            deadline.schedule(() -> { HttpURLConnection current = connection; if (current != null) current.disconnect(); }, 195, TimeUnit.SECONDS);
            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            FoodGuardLocal.write(FoodGuardLocal.taskFile(context, id, ".meta"), attempt.put("attempt_started", true).toString());
            try (OutputStream stream = connection.getOutputStream()) { stream.write(bytes); }
            int code = connection.getResponseCode();
            InputStream source = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
            if (source == null) throw new IllegalStateException("服务暂时不可用，请稍后再试。");
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            try (InputStream stream = source) {
                byte[] part = new byte[8192]; int count;
                while ((count = stream.read(part)) != -1) {
                    if (buffer.size() + count > 2 * 1024 * 1024) throw new IllegalStateException("分析结果过大。");
                    buffer.write(part, 0, count);
                }
            }
            JSONObject response = new JSONObject(buffer.toString("UTF-8"));
            if (code < 200 || code >= 300 || !response.has("result")) {
                errorCode = response.optString("code");
                String message = response.optString("error", "分析失败，请稍后重试。");
                if (english) message = "UNRELIABLE_LABEL".equals(errorCode) ? "No reliably readable food label was found." : "KEY_INVALID".equals(errorCode) ? "Invalid API Key. Please log in again." : "MODEL_PERMISSION".equals(errorCode) ? "This model is not allowed. Select another model." : "Request failed. Check the network, model and quota.";
                throw new IllegalStateException(message);
            }
            if (isStopped()) return Result.failure();
            JSONObject meta = new JSONObject(FoodGuardLocal.read(FoodGuardLocal.taskFile(context, id, ".meta")))
                .put("status", "completed").put("result", response.getJSONObject("result"));
            FoodGuardLocal.write(FoodGuardLocal.taskFile(context, id, ".meta"), meta.toString());
            return Result.success();
        } catch (Exception error) {
            try {
                JSONObject meta = new JSONObject(FoodGuardLocal.read(FoodGuardLocal.taskFile(context, id, ".meta")));
                meta.put("status", "failed").put("error_code", errorCode).put("error", error instanceof IllegalStateException ? error.getMessage() : english ? "Network interrupted or timed out. Try again later." : "网络中断或等待超时，请检查连接后重试。");
                FoodGuardLocal.write(FoodGuardLocal.taskFile(context, id, ".meta"), meta.toString());
            } catch (Exception ignored) { /* Preserve the request for manual recovery. */ }
            // Never automatically repeat a paid request after an ambiguous network failure.
            return Result.failure();
        } finally { deadline.shutdownNow(); if (connection != null) connection.disconnect(); }
    }

    @Override public void onStopped() { super.onStopped(); if (connection != null) connection.disconnect(); }
}
