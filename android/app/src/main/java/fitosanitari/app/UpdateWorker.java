package fitosanitari.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class UpdateWorker extends Worker {
    private static final String CHANNEL_ID = "fitosanitari_alerts";
    private static final String CHANNEL_NAME = "Allarmi Fitosanitari";

    public UpdateWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            // 1. Fetch HTML page
            String html = fetchHtml("https://www.regione.veneto.it/web/fitosanitario/bollettini-fitosanitari-2026");
            if (html == null || html.isEmpty()) {
                return Result.retry();
            }

            // 2. Find latest numbers
            int latestFrutta = findMaxBulletinNumber(html, "Frutticolo_2026_(\\d+)\\.pdf");
            int latestOrto = findMaxBulletinNumber(html, "Orticolo_2026_(\\d+)\\.pdf");
            int latestOlivo = findMaxBulletinNumber(html, "Olivicolo_2026_(\\d+)\\.pdf");

            if (latestFrutta == 0 && latestOrto == 0 && latestOlivo == 0) {
                return Result.success();
            }

            // 3. Read followed crops from SharedPreferences (CapacitorStorage)
            SharedPreferences prefs = getApplicationContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            
            boolean followFrutta = true;
            boolean followOrto = true;
            boolean followOlivo = true;

            String followedCropsStr = prefs.getString("followed_crops", "");
            if (!followedCropsStr.isEmpty()) {
                try {
                    JSONObject followedObj = new JSONObject(followedCropsStr);
                    followFrutta = followedObj.optBoolean("frutta", true);
                    followOrto = followedObj.optBoolean("orto", true);
                    followOlivo = followedObj.optBoolean("olivo", true);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            // 4. Read last processed bulletin numbers
            String lastSeenStr = prefs.getString("last_seen_bulletins", "");
            int lastFrutta = 0;
            int lastOrto = 0;
            int lastOlivo = 0;

            JSONObject lastSeenObj;
            if (lastSeenStr.isEmpty()) {
                lastSeenObj = new JSONObject();
                lastSeenObj.put("frutta", latestFrutta);
                lastSeenObj.put("orto", latestOrto);
                lastSeenObj.put("olivo", latestOlivo);
                prefs.edit().putString("last_seen_bulletins", lastSeenObj.toString()).apply();
                return Result.success();
            } else {
                lastSeenObj = new JSONObject(lastSeenStr);
                lastFrutta = lastSeenObj.optInt("frutta", 0);
                lastOrto = lastSeenObj.optInt("orto", 0);
                lastOlivo = lastSeenObj.optInt("olivo", 0);
            }

            boolean hasUpdates = false;

            // Check Fruit
            if (followFrutta && latestFrutta > lastFrutta && latestFrutta > 0) {
                triggerNotification("🍎 Nuovo Bollettino Frutteto", "È stato pubblicato il bollettino N° " + latestFrutta + ". Controlla le attività consigliate.");
                lastSeenObj.put("frutta", latestFrutta);
                hasUpdates = true;
            }

            // Check Orto
            if (followOrto && latestOrto > lastOrto && latestOrto > 0) {
                triggerNotification("🥬 Nuovo Bollettino Orto", "È stato pubblicato il bollettino N° " + latestOrto + ". Controlla le attività consigliate.");
                lastSeenObj.put("orto", latestOrto);
                hasUpdates = true;
            }

            // Check Olivo
            if (followOlivo && latestOlivo > lastOlivo && latestOlivo > 0) {
                triggerNotification("🫒 Nuovo Bollettino Oliveto", "È stato pubblicato il bollettino N° " + latestOlivo + ". Controlla le attività consigliate.");
                lastSeenObj.put("olivo", latestOlivo);
                hasUpdates = true;
            }

            if (hasUpdates) {
                prefs.edit().putString("last_seen_bulletins", lastSeenObj.toString()).apply();
            }

            return Result.success();
        } catch (Exception e) {
            e.printStackTrace();
            return Result.failure();
        }
    }

    private String fetchHtml(String urlStr) {
        StringBuilder result = new StringBuilder();
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

            int responseCode = conn.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader rd = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                String line;
                while ((line = rd.readLine()) != null) {
                    result.append(line);
                }
                rd.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
        return result.toString();
    }

    private int findMaxBulletinNumber(String html, String regexPattern) {
        Pattern pattern = Pattern.compile(regexPattern, Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(html);
        int maxVal = 0;
        while (matcher.find()) {
            try {
                int val = Integer.parseInt(matcher.group(1));
                if (val > maxVal) {
                    maxVal = val;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return maxVal;
    }

    private void triggerNotification(String title, String message) {
        Context context = getApplicationContext();
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (notificationManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Notifiche per allarmi ed aggiornamenti sui bollettini fitosanitari.");
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                (int) System.currentTimeMillis(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }
}
