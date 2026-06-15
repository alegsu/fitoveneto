package fitosanitari.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Schedule periodic update check worker every 6 hours
        PeriodicWorkRequest updateRequest =
                new PeriodicWorkRequest.Builder(UpdateWorker.class, 6, TimeUnit.HOURS)
                        .build();
        
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "FitosanitariUpdateCheck",
                ExistingPeriodicWorkPolicy.KEEP,
                updateRequest
        );
    }
}
